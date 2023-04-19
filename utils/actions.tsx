// eslint-disable-next-line import/no-named-as-default
import toast from 'react-hot-toast';
import {BigNumber, ethers} from 'ethers';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {Zero} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {handleTx} from '@yearn-finance/web-lib/utils/web3/transaction';

import ERC20_ABI from './ABI/erc20.abi';
import YROUTER_ABI from './ABI/yRouter.abi';
import YVAULT_V3_BASE_ABI from './ABI/yVaultV3Base.abi';

import type {BigNumberish} from 'ethers';
import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TCallbackFunction} from './types';

const PERMIT_TYPE = {
	Permit: [
		{name: 'owner', type: 'address'},
		{name: 'spender', type: 'address'},
		{name: 'value', type: 'uint256'},
		{name: 'nonce', type: 'uint256'},
		{name: 'deadline', type: 'uint256'}
	]
};

export async function	approveERC20(
	provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcProvider,
	tokenAddress: string,
	spender: string,
	amount = ethers.constants.MaxUint256
): Promise<TTxResponse> {
	const signer = provider.getSigner();
	const contract = new ethers.Contract(tokenAddress, ['function approve(address _spender, uint256 _value) external'], signer);

	return await handleTx(contract.approve(spender, amount));
}

type TWithdrawWithPermitERC20Args = {
	vaultAddress: TAddress,
	routerAddress: TAddress,
	amount: BigNumberish,
	isLegacy: boolean,
	shouldRedeem: boolean
}
export async function	withdrawWithPermitERC20(
	provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcProvider, {
		vaultAddress,
		routerAddress,
		amount = ethers.constants.MaxUint256,
		isLegacy = false,
		shouldRedeem = false
	}: TWithdrawWithPermitERC20Args
): Promise<TTxResponse> {
	/* 🔵 - Yearn Finance **************************************************************************
	** First we will retrieve some contextual informations based on the provider and the signer:
	** - The chainID, which will be used to eventually sign the permit
	** - The signer address, which will be used to retrieve the nonce
	**********************************************************************************************/
	const signer = provider.getSigner();
	const [{chainId}, signerAddress] = await Promise.all([
		provider.getNetwork(),
		signer.getAddress()
	]) as [{chainId: number}, string];

	/* 🔵 - Yearn Finance **************************************************************************
	** If we are using a legacy vault, aka a vault prior to V3, we will use the legacy withdraw,
	** aka directly withdrawing from the vault.
	** This path should be less and less used as time goes by.
	**********************************************************************************************/
	if (isLegacy) {
		const vaultV2Contract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
		return await handleTx(vaultV2Contract.withdraw(amount));
	}

	/* 🔵 - Yearn Finance **************************************************************************
	** Otherwise, we will go with the new V3 withdraw flow, which can be split in multiple
	** sub-flows based on some conditions. The questions we need to answer are:
	** - Is the allowance of the vault to the router sufficient?
	** - Are we withdrawing a part of the vault or all of it?
	**
	** Before answering these questions, we will retrieve some contextual informations:
	** - The vault API version, which will be used to sign the permit
	** - The vault name, which will be used to sign the permit
	** - The vault nonce, which will be used to sign the permit
	** - The maxOut amount, which will be used to withdraw the amount
	** - The current allowance of the signer to the router
	**********************************************************************************************/
	const multicalls = [];
	const routerIFace = new ethers.utils.Interface(YROUTER_ABI);
	const vaultContract = new ethers.Contract(vaultAddress, YVAULT_V3_BASE_ABI, signer);
	const routerContract = new ethers.Contract(routerAddress, YROUTER_ABI, signer);
	//TODO: move to allSettled
	const [apiVersion, name, nonce, maxOut, currentAllowance, currentBalance] = await Promise.all([
		vaultContract.apiVersion(),
		vaultContract.name(),
		vaultContract.nonces(signerAddress),
		vaultContract.previewWithdraw(amount),
		vaultContract.allowance(signerAddress, routerAddress),
		vaultContract.balanceOf(signerAddress)
	]) as [string, string, BigNumber, BigNumber, BigNumber, BigNumber];

	let amountToUse = amount;
	if (BigNumber.from(amount).gt(currentBalance)) {
		amountToUse = currentBalance;
	} else if (BigNumber.from(amount).eq(Zero) && currentBalance.gt(Zero)) {
		amountToUse = currentBalance;
	}

	/* 🔵 - Yearn Finance **************************************************************************
	** If the allowance is not sufficient, we will sign a permit and call the router's selfPermit
	** function, which will allow the router to spend the vault's tokens on behalf of the signer.
	** with this flow we will use the multicall path, aka batching 2 actions in a single
	** transaction: the permit and the withdraw/redeem.
	** - The deadline is set to 24h from now.
	** - The amount permitted is set to the amount we want to withdraw.
	**********************************************************************************************/
	if (currentAllowance.lt(amountToUse)) {
		const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
		const domain = {
			name: name,
			version: apiVersion,
			chainId: chainId,
			verifyingContract: vaultAddress
		};
		const value = {
			owner: signerAddress,
			spender: routerAddress,
			value: amountToUse,
			nonce: nonce,
			deadline: deadline
		};
		const signature = await signer._signTypedData(domain, PERMIT_TYPE, value);
		const {v, r, s} = ethers.utils.splitSignature(signature);
		multicalls.push(routerIFace.encodeFunctionData('selfPermit', [vaultAddress, amountToUse, deadline, v, r, s]));

		/* 🔵 - Yearn Finance **********************************************************************
		** To decide if we should use the withdraw or the redeem function, we will just check the
		** amount we want to withdraw. If this amount is equal to the vault's balance, we will
		** redeem the vault, otherwise we will withdraw the amount.
		******************************************************************************************/
		if (BigNumber.from(amount).eq(Zero) || shouldRedeem) {
			multicalls.push(routerIFace.encodeFunctionData('redeem(address)', [vaultAddress]));
		} else {
			multicalls.push(routerIFace.encodeFunctionData('withdraw', [vaultAddress, amountToUse, signerAddress, maxOut]));
		}

		return await handleTx(routerContract.multicall(multicalls));
	}

	/* 🔵 - Yearn Finance **************************************************************************
	** To decide if we should use the withdraw or the redeem function, we will just check the amount
	** we want to withdraw. If this amount is equal to the vault's balance, we will redeem the vault
	** otherwise we will withdraw the amount.
	**********************************************************************************************/
	if (BigNumber.from(amount).eq(Zero) || shouldRedeem) {
		return await handleTx(routerContract['redeem(address)'](vaultAddress));
	}
	return await handleTx(routerContract.withdraw(vaultAddress, amountToUse, signerAddress, maxOut));
}


type TDepositWithPermitERC20Args = {
	tokenAddress: TAddress,
	vaultAddress: TAddress,
	routerAddress: TAddress,
	amount: BigNumberish,
	isLegacy: boolean,
}

export async function	depositWithPermitERC20(
	provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcProvider, {
		tokenAddress,
		vaultAddress,
		routerAddress,
		amount = ethers.constants.MaxUint256,
		isLegacy = false
	}: TDepositWithPermitERC20Args
): Promise<TTxResponse> {
	/* 🔵 - Yearn Finance **************************************************************************
	** First we will retrieve some contextual informations based on the provider and the signer:
	** - The chainID, which will be used to eventually sign the permit
	** - The signer address, which will be used to retrieve the nonce
	**********************************************************************************************/
	const signer = provider.getSigner();
	const [{chainId}, signerAddress] = await Promise.all([
		provider.getNetwork(),
		signer.getAddress()
	]) as [{chainId: number}, string];

	/* 🔵 - Yearn Finance **************************************************************************
	** If we are using a legacy vault, aka a vault prior to V3, we will use the legacy deposit,
	** aka directly depositing to the vault.
	** This path should be less and less used as time goes by.
	**********************************************************************************************/
	if (isLegacy) {
		const vaultV2Contract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
		return await handleTx(vaultV2Contract.deposit(amount));
	}

	/* 🔵 - Yearn Finance **************************************************************************
	** Otherwise, we will go with the new V3 deposit flow, which can be split in multiple
	** sub-flows based on some conditions. The questions we need to answer are:
	** - Is the allowance of the signer to the vault sufficient?
	** - Is the allowance of the vault to the router sufficient?
	**
	** Before answering these questions, we will retrieve some contextual informations:
	** - The vault API version, which will be used to sign the permit
	** - The vault name, which will be used to sign the permit
	** - The vault nonce, which will be used to sign the permit
	** - The maxOut amount, which will be used to withdraw the amount
	** - The current allowance of the signer to the router
	**********************************************************************************************/
	const multicalls = [];
	const routerIFace = new ethers.utils.Interface(YROUTER_ABI);
	const tokenContract = new ethers.Contract(tokenAddress, YVAULT_V3_BASE_ABI, signer);
	const vaultContract = new ethers.Contract(vaultAddress, YVAULT_V3_BASE_ABI, signer);
	const routerContract = new ethers.Contract(routerAddress, YROUTER_ABI, signer);
	const [
		apiVersionResult, versionResult, EIP712VersionResult,
		domainSeparatorResult, domainTypehashResult,
		nameResult, nonceResult, minOutResult, routerAllowanceResult, userAllowanceResult
	] = await Promise.allSettled([
		tokenContract.apiVersion(), // This one is used by some tokens (yvTokens)
		tokenContract.version(), // This one is used by most tokens
		tokenContract.EIP712_VERSION(), // This one is used by some tokens (POS USDT, POS DAI, ...)

		tokenContract.DOMAIN_SEPARATOR(), // This one is used by some tokens (POS USDC, ...) and uses SALT
		tokenContract.DOMAIN_TYPEHASH(), // This one is used by some tokens and uses CHAINID

		tokenContract.name(),
		tokenContract.nonces(signerAddress),
		vaultContract.previewDeposit(amount),
		tokenContract.allowance(routerAddress, vaultAddress),
		tokenContract.allowance(signerAddress, routerAddress)
	]);
	let domainHashToUse = '';
	let	versionToUse = '1';
	if (apiVersionResult.status === 'fulfilled') {
		versionToUse = apiVersionResult.value;
	} else if (versionResult.status === 'fulfilled') {
		versionToUse = versionResult.value;
	} else if (EIP712VersionResult.status === 'fulfilled') {
		versionToUse = EIP712VersionResult.value;
	}

	if (domainSeparatorResult.status === 'fulfilled') {
		domainHashToUse = domainSeparatorResult.value;
	} else if (domainTypehashResult.status === 'fulfilled') {
		domainHashToUse = domainTypehashResult.value;
	}

	const	name: string = nameResult.status === 'rejected' ? 'Token' : nameResult.value;
	const	nonce: BigNumber = nonceResult.status === 'rejected' ? ethers.constants.Zero : nonceResult.value;
	const	minOut: BigNumber = minOutResult.status === 'rejected' ? ethers.constants.Zero : minOutResult.value;
	const	routerAllowance: BigNumber = routerAllowanceResult.status === 'rejected' ? ethers.constants.Zero : routerAllowanceResult.value;
	const	userAllowance: BigNumber = userAllowanceResult.status === 'rejected' ? ethers.constants.Zero : userAllowanceResult.value;

	/* 🔵 - Yearn Finance **************************************************************************
	** If the allowance is not sufficient, we will sign a permit and call the router's selfPermit
	** function, which will allow the router to spend the vault's tokens on behalf of the signer.
	** with this flow we will use the multicall path, aka batching 2 actions in a single
	** transaction: the permit and the withdraw/redeem.
	** - The deadline is set to 24h from now.
	** - The amount permitted is set to the amount we want to withdraw.
	**********************************************************************************************/
	if (userAllowance.lt(amount)) {
		const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
		const chainIdBytes32 = ethers.utils.hexZeroPad(ethers.utils.hexlify(chainId), 32);
		const domainWithSalt = {
			name: name,
			version: versionToUse,
			verifyingContract: tokenAddress,
			salt: chainIdBytes32
		};
		const domainWithChainId = {
			name: name,
			version: versionToUse,
			verifyingContract: tokenAddress,
			chainId: chainIdBytes32
		};
		const value = {
			owner: signerAddress,
			spender: routerAddress,
			value: amount,
			nonce: nonce,
			deadline: deadline
		};

		//compute domain separator
		const domainSaltSeparator = ethers.utils._TypedDataEncoder.hashDomain(domainWithSalt);
		const domainChainIdSeparator = ethers.utils._TypedDataEncoder.hashDomain(domainWithChainId);
		if (domainHashToUse === domainSaltSeparator) {
			const signature = await signer._signTypedData(domainWithSalt, PERMIT_TYPE, value);
			const {v, r, s} = ethers.utils.splitSignature(signature);
			multicalls.push(routerIFace.encodeFunctionData('selfPermit', [tokenAddress, amount, deadline, v, r, s]));
		} else if (domainHashToUse === domainChainIdSeparator) {
			const signature = await signer._signTypedData(domainWithChainId, PERMIT_TYPE, value);
			const {v, r, s} = ethers.utils.splitSignature(signature);
			multicalls.push(routerIFace.encodeFunctionData('selfPermit', [tokenAddress, amount, deadline, v, r, s]));
		} else { //Signature not possible, let's use standard approve
			const contract = new ethers.Contract(tokenAddress, ['function approve(address _spender, uint256 _value) external'], signer);
			await handleTx(contract.approve(routerAddress, amount));
		}

	}
	if (routerAllowance.lt(amount)) {
		multicalls.push(routerIFace.encodeFunctionData('approve', [tokenAddress, vaultAddress, amount]));
	}

	if (multicalls.length > 0) {
		multicalls.push(routerIFace.encodeFunctionData('depositToVault(address,uint256,uint256)', [vaultAddress, amount, minOut]));
		return await handleTx(routerContract.multicall(multicalls));
	}
	return await handleTx(routerContract['depositToVault(address,uint256,uint256)'](vaultAddress, amount, minOut));
}


export async function	depositERC20(
	provider: ethers.providers.JsonRpcProvider,
	vaultAddress: TAddress,
	spenderAddress: TAddress,
	amount: BigNumber,
	isLegacy: boolean
): Promise<TTxResponse> {
	const signer = provider.getSigner();
	const contract = new ethers.Contract(vaultAddress, [
		'function deposit(uint256) external returns (uint256)',
		'function asset() public view returns (address)',
		'function previewDeposit(uint256 amount) view returns (uint256 sharesOut)'
	], signer);
	if (isLegacy) {
		return await handleTx(contract.deposit(amount));
	}

	const asset = await contract.asset();
	const assetContract = new ethers.Contract(asset, ERC20_ABI, signer);
	const routerContract = new ethers.Contract(spenderAddress, YROUTER_ABI, signer);
	const [routerAllowance, minOut] = await Promise.all([
		assetContract.allowance(spenderAddress, vaultAddress),
		contract.previewDeposit(amount)
	]) as [BigNumber, BigNumber];

	if (routerAllowance.lt(amount)) {
		const	approveResult = await handleTx(routerContract.approve(asset, vaultAddress, ethers.constants.MaxUint256));
		if (!approveResult.isSuccessful) {
			throw new Error('Failed to approve');
		}
	}
	return await handleTx(routerContract['depositToVault(address,uint256,uint256)'](vaultAddress, amount, minOut));
}

type TApeInVault = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
}
export async function	apeInVault({provider, contractAddress, amount}: TApeInVault, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('APE in vault...');
	const	signer = provider.getSigner();
	const	zap = new ethers.Contract(
		contractAddress,
		['function deposit() public payable'],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await zap.deposit({value: amount});
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}

type TApeOutVault = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
}
export async function	apeOutVault({provider, contractAddress, amount}: TApeOutVault, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('APE out vault...');
	const	signer = provider.getSigner();
	const	zap = new ethers.Contract(
		contractAddress,
		['function withdraw(uint256 amount) public'],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await zap.withdraw(amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}

type TCreateNewVaultsAndStrategies = {
	provider: ethers.providers.JsonRpcProvider;
	gauge: TAddress;
}
export async function	createNewVaultsAndStrategies({provider, gauge}: TCreateNewVaultsAndStrategies, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('Creating new Vault...');
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(
		process.env.YEARN_BALANCER_FACTORY_ADDRESS as string,
		[
			'function createNewVaultsAndStrategies(address _gauge) external returns (address vault, address auraStrategy)',
			'function alreadyExistsFromGauge(address) public view returns (address)'
		],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		console.log(`Creating vault for gauge ${gauge} ...`);
		const	transaction = await contract.createNewVaultsAndStrategies(gauge);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			const	newVaultAddress = await contract.alreadyExistsFromGauge(gauge);
			callback({error: false, data: newVaultAddress});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}

type THarvestStrategy = {
	provider: ethers.providers.JsonRpcProvider;
	strategyAddress: TAddress;
}
export async function	harvestStrategy({provider, strategyAddress}: THarvestStrategy, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('Harvesting strategy...');
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(
		process.env.YEARN_FACTORY_KEEPER_WRAPPER as string,
		['function harvestStrategy(address) public'],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await contract.harvestStrategy(strategyAddress);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}
