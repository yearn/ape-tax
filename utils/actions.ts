// eslint-disable-next-line import/no-named-as-default
import toast from 'react-hot-toast';
import assert from 'assert';
import {ethers} from 'ethers';
import {toAddress} from '@yearn-finance/web-lib/utils/address';

import {assertAddress, handleTx} from './toWagmiProvider';

import type {BigNumberish} from 'ethers';
import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TWriteTransaction} from './toWagmiProvider';
import type {TCallbackFunction} from './types';

type TApproveToken = {
	provider: ethers.providers.JsonRpcProvider;
	contractAddress: TAddress;
	amount: BigNumberish;
	from: TAddress;
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

type TApeInVault = TWriteTransaction & {
	contractAddress: TAddress | undefined;
	amount: bigint;
};
export async function	apeInVault(props: TApeInVault): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	const signerAddress = await props.connector.getAccount();
	assertAddress(signerAddress, 'signerAddress');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function deposit() public payable'],
		functionName: 'deposit',
		args: [signerAddress, props.amount]
	});
}

type TApeOutVault = TWriteTransaction & {
	contractAddress: TAddress | undefined;
	amount: bigint;
};
export async function	apeOutVault(props: TApeOutVault): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	const signerAddress = await props.connector.getAccount();
	assertAddress(signerAddress, 'signerAddress');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function withdraw(uint256 amount) public'],
		functionName: 'withdraw',
		args: [signerAddress, props.amount]
	});
}

type THarvestStrategy = TWriteTransaction & {
	contractAddress: TAddress | undefined;
};
export async function	harvestStrategy(props: THarvestStrategy): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'strategyAddress');

	const signerAddress = await props.connector.getAccount();
	assertAddress(signerAddress, 'signerAddress');

	return await handleTx(props, {
		address: toAddress(process.env.YEARN_FACTORY_KEEPER_WRAPPER),
		abi: ['function harvestStrategy(address) public'],
		functionName: 'harvestStrategy',
		args: [signerAddress]
	});
}
