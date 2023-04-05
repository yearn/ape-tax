// eslint-disable-next-line import/no-named-as-default
import toast from 'react-hot-toast';
import {ethers} from 'ethers';
import {handleTx} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {BigNumber, BigNumberish} from 'ethers';
import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TCallbackFunction} from './types';

type TApproveToken = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
	from: TAddress;
}

export async function	approveERC20(
	provider: ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcProvider,
	tokenAddress: string,
	spender: string,
	amount = ethers.constants.MaxUint256
): Promise<TTxResponse> {
	const signer = provider.getSigner();
	const contract = new ethers.Contract(tokenAddress, ['function approve(address _spender, uint256 _value) external'], signer);

	console.log(`Approving ${spender} to spend ${amount} of ${tokenAddress}`);
	return await handleTx(contract.approve(spender, amount));
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
	const assetContract = new ethers.Contract(asset, ['function allowance(address owner, address spender) public view returns (uint256)'], signer);

	const routerContract = new ethers.Contract(
		spenderAddress, [
			'function approve(address token, address to, uint256 amount) public',
			'function depositToVault(address vault, uint256 amount, uint256 minSharesOut) public payable returns (uint256 sharesOut)'
		],
		signer
	);
	const	[routerAllowance, minOut] = await Promise.all([
		assetContract.allowance(spenderAddress, vaultAddress),
		contract.previewDeposit(amount)
	]) as [BigNumber, BigNumber];

	if (routerAllowance.lt(amount)) {
		const	approveResult = await handleTx(routerContract.approve(asset, vaultAddress, ethers.constants.MaxUint256));
		if (!approveResult.isSuccessful) {
			throw new Error('Failed to approve');
		}
	}
	console.log(vaultAddress, amount.toString(), minOut);

	const tx = await routerContract.depositToVault(vaultAddress, amount, minOut);
	const receipt = await tx.wait();
	if (receipt.status === 0) {
		console.error('Fail to perform transaction');
		return {isSuccessful: false};
	}
	return {isSuccessful: true, receipt};

	// const bla = await handleTx(routerContract.depositToVault(vaultAddress, amount, minOut));
	// console.log(bla);
	// return bla;
}



export async function	approveToken({provider, contractAddress, amount, from}: TApproveToken, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('Approving token...');
	const	signer = provider.getSigner();
	const	erc20 = new ethers.Contract(
		contractAddress,
		['function approve(address spender, uint256 amount) public returns (bool)'],
		signer
	);

	/**********************************************************************
	**	In order to avoid dumb error, let's first check if the TX would
	**	be successful with a static call
	**********************************************************************/
	try {
		await erc20.callStatic.approve(from, amount);
	} catch (error) {
		callback({error: true, data: undefined});
		toast.dismiss(_toast);
		toast.error('Impossible to approve token');
		return;
	}

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await erc20.approve(from, amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: amount});
		} else {
			toast.dismiss(_toast);
			toast.error('Approve failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Approve failed');
		callback({error: true, data: undefined});
	}
}

type TDepositToken = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
}
export async function	depositToken({provider, contractAddress, amount}: TDepositToken, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('Deposit token...');
	const	abi = ['function deposit(uint256 amount)'];
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(contractAddress, abi, signer);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await contract.deposit(amount);
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
		console.error(error);
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error: true, data: undefined});
	}
}

type TWithdrawToken = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
}
export async function	withdrawToken({provider, contractAddress, amount}: TWithdrawToken, callback: TCallbackFunction): Promise<void> {
	const	_toast = toast.loading('Withdraw token...');
	const	abi = ['function withdraw(uint256 amount)'];
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(contractAddress, abi, signer);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await contract.withdraw(amount);
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
		console.error(error);
		callback({error: true, data: undefined});
	}
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
