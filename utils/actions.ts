import assert from 'assert';
import {erc20ABI, multicall, readContract, signTypedData} from '@wagmi/core';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {MAX_UINT_256} from '@yearn-finance/web-lib/utils/constants';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';

import {assertAddress, handleTx, toWagmiProvider} from './toWagmiProvider';
import FACTORY_KEEPER_ABI from './ABI/factoryKeeper.abi';
// import YROUTER_ABI from './ABI/yRouter.abi';
import YVAULT_V3_BASE_ABI from './ABI/yVaultV3Base.abi';

import type {Connector} from 'wagmi';
import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TWriteTransaction} from './toWagmiProvider';

const PERMIT_TYPE = {
	Permit: [
		{name: 'owner', type: 'address'},
		{name: 'spender', type: 'address'},
		{name: 'value', type: 'uint256'},
		{name: 'nonce', type: 'uint256'},
		{name: 'deadline', type: 'uint256'}
	]
};

//Because USDT do not return a boolean on approve, we need to use this ABI
const ALTERNATE_ERC20_APPROVE_ABI = [{'constant': false, 'inputs': [{'name': '_spender', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'approve', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}] as const;

/* 🔵 - Yearn Finance **********************************************************
** isApprovedERC20 is a _VIEW_ function that checks if a token is approved for
** a spender.
******************************************************************************/
export async function isApprovedERC20(
	connector: Connector | undefined,
	tokenAddress: TAddress,
	spender: TAddress,
	amount = MAX_UINT_256
): Promise<boolean> {
	const wagmiProvider = await toWagmiProvider(connector);
	const result = await readContract({
		...wagmiProvider,
		abi: erc20ABI,
		address: tokenAddress,
		functionName: 'allowance',
		args: [wagmiProvider.address, spender]
	});
	return (result || 0n) >= amount;
}

/* 🔵 - Yearn Finance **********************************************************
** allowanceOf is a _VIEW_ function that returns the amount of a token that is
** approved for a spender.
******************************************************************************/
type TAllowanceOf = {
	connector: Connector | undefined,
	tokenAddress: TAddress,
	spenderAddress: TAddress
}
export async function allowanceOf(props: TAllowanceOf): Promise<bigint> {
	const wagmiProvider = await toWagmiProvider(props.connector);
	const result = await readContract({
		...wagmiProvider,
		abi: erc20ABI,
		address: props.tokenAddress,
		functionName: 'allowance',
		args: [wagmiProvider.address, props.spenderAddress]
	});
	return result || 0n;
}

/* 🔵 - Yearn Finance **********************************************************
** approveERC20 is a _WRITE_ function that approves a token for a spender.
**
** @param spenderAddress - The address of the spender.
** @param amount - The amount of collateral to deposit.
******************************************************************************/
type TApproveERC20 = TWriteTransaction & {
	spenderAddress: TAddress | undefined;
	amount: bigint;
};
export async function approveERC20(props: TApproveERC20): Promise<TTxResponse> {
	assertAddress(props.spenderAddress, 'spenderAddress');
	assertAddress(props.contractAddress);

	props.onTrySomethingElse = async (): Promise<TTxResponse> => {
		assertAddress(props.spenderAddress, 'spenderAddress');
		return await handleTx(props, {
			address: props.contractAddress,
			abi: ALTERNATE_ERC20_APPROVE_ABI,
			functionName: 'approve',
			args: [props.spenderAddress, props.amount]
		});
	};

	return await handleTx(props, {
		address: props.contractAddress,
		abi: erc20ABI,
		functionName: 'approve',
		args: [props.spenderAddress, props.amount]
	});
}

/* 🔵 - Yearn Finance **********************************************************
** deposit is a _WRITE_ function that deposits a collateral into a vault using
** the vanilla direct deposit function.
**
** @app - Vaults
** @param amount - The amount of ETH to deposit.
******************************************************************************/
type TDeposit = TWriteTransaction & {
	amount: bigint;
};
export async function deposit(props: TDeposit): Promise<TTxResponse> {
	assertAddress(props.contractAddress);
	assert(props.amount > 0n, 'Amount is 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: VAULT_ABI,
		functionName: 'deposit',
		args: [props.amount]
	});
}

type TWithdrawWithPermitERC20Args = TWriteTransaction & {
	contractAddress: TAddress,
	routerAddress: TAddress,
	amount: bigint,
	isLegacy: boolean,
	shouldRedeem: boolean
}
export async function	withdrawWithPermitERC20(props: TWithdrawWithPermitERC20Args): Promise<TTxResponse> {
	assertAddress(props.contractAddress, 'receiverAddress');
	assertAddress(props.routerAddress, 'routerAddress');
	assert(props.connector, 'No connector');
	assert(props.amount > 0n, 'Amount is 0');
	
	const signer = await props.connector.getWalletClient();
	const chainId = await props.connector.getChainId();
	const signerAddress = signer.account.address;

	/* 🔵 - Yearn Finance **************************************************************************
	** If we are using a legacy vault, aka a vault prior to V3, we will use the legacy withdraw,
	** aka directly withdrawing from the vault.
	** This path should be less and less used as time goes by.
	**********************************************************************************************/
	if (props.isLegacy) {
		return await handleTx(props, {
			address: props.contractAddress,
			abi: VAULT_ABI,
			functionName: 'withdraw',
			args: [props.amount]
		});
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

	const calls = [];
	// const multicalls = [];
	// Why do we need this with ethers? 
	// const routerIFace = new ethers.utils.Interface(YROUTER_ABI);
	const vaultContract = {address: props.contractAddress, abi: YVAULT_V3_BASE_ABI};
	// const routerContract = {address: props.routerAddress, abi: YROUTER_ABI};

	calls.push({...vaultContract, functionName: 'apiVersion'});
	calls.push({...vaultContract, functionName: 'name'});
	calls.push({...vaultContract, functionName: 'nonces', args: [signerAddress]});
	calls.push({...vaultContract, functionName: 'previewWithdraw', args: [props.amount]});
	calls.push({...vaultContract, functionName: 'allowance', args: [signerAddress, props.routerAddress]});
	calls.push({...vaultContract, functionName: 'balanceOf'});

	const callResult = await multicall({contracts: calls as never[], chainId: chainId});
	const apiVersion = callResult[0].result as string;
	const name = callResult[1].result as string;
	const nonce = decodeAsBigInt(callResult[2]);
	// const maxOut = decodeAsBigInt(callResult[3]);
	const currentAllowance = decodeAsBigInt(callResult[4]);
	const currentBalance = decodeAsBigInt(callResult[5]);

	let amountToUse = props.amount;
	if (props.amount > currentBalance) {
		amountToUse = currentBalance;
	} else if (isZero(props.amount) && currentBalance > 0n) {
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
	if (currentAllowance < amountToUse) {
		const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
		const domain = {
			name: name,
			version: apiVersion,
			chainId: chainId,
			verifyingContract: props.contractAddress
		};
		const value = {
			owner: signerAddress,
			spender: props.routerAddress,
			value: amountToUse,
			nonce: nonce,
			deadline: deadline
		};
		const signature = await signTypedData({domain, message: value, primaryType: 'Permit', types: PERMIT_TYPE});

		console.log(signature);
		
		// const {v, r, s} = splitSignature(signature);
		// multicalls.push(routerIFace.encodeFunctionData('selfPermit', [props.vaultAddress, amountToUse, deadline, v, r, s]));

		// /* 🔵 - Yearn Finance **********************************************************************
		// ** To decide if we should use the withdraw or the redeem function, we will just check the
		// ** amount we want to withdraw. If this amount is equal to the vault's balance, we will
		// ** redeem the vault, otherwise we will withdraw the amount.
		// ******************************************************************************************/
		// if (isZero(props.amount) || props.shouldRedeem) {
		// 	multicalls.push(routerIFace.encodeFunctionData('redeem(address)', [props.vaultAddress]));
		// } else {
		// 	multicalls.push(routerIFace.encodeFunctionData('withdraw', [props.vaultAddress, amountToUse, signerAddress, maxOut]));
		// }

		// return await handleTx(props, routerContract.multicall(multicalls));
	}

	/* 🔵 - Yearn Finance **************************************************************************
	** To decide if we should use the withdraw or the redeem function, we will just check the amount
	** we want to withdraw. If this amount is equal to the vault's balance, we will redeem the vault
	** otherwise we will withdraw the amount.
	**********************************************************************************************/
	// if (isZero(props.amount) || props.shouldRedeem) {
	// 	return await handleTx(routerContract['redeem(address)'](vaultAddress));
	// }
	// return await handleTx(routerContract.withdraw(vaultAddress, amountToUse, signerAddress, maxOut));


	// Just here to return something for now, will be changed
	return await handleTx(props, {
		address: props.contractAddress,
		abi: VAULT_ABI,
		functionName: 'withdraw',
		args: [props.amount]
	});



}

/* 🔵 - Yearn Finance **********************************************************
** withdrawShares is a _WRITE_ function that withdraws a share of underlying
** collateral from a vault.
**
** @app - Vaults
** @param amount - The amount of ETH to withdraw.
******************************************************************************/
type TWithdrawShares = TWriteTransaction & {
	amount: bigint;
};
export async function withdrawShares(props: TWithdrawShares): Promise<TTxResponse> {
	assertAddress(props.contractAddress);
	assert(props.amount > 0n, 'Amount is 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: VAULT_ABI,
		functionName: 'withdraw',
		args: [props.amount]
	});
}

export async function	harvestStrategy(props: TWriteTransaction): Promise<TTxResponse> {
	assertAddress(props.contractAddress, 'strategyAddress');

	return await handleTx(props, {
		address: toAddress(process.env.YEARN_FACTORY_KEEPER_WRAPPER),
		abi: FACTORY_KEEPER_ABI,
		functionName: 'harvestStrategy',
		args: [props.contractAddress]
	});
}
