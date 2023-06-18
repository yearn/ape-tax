// eslint-disable-next-line import/no-named-as-default
import toast from 'react-hot-toast';
import {ethers} from 'ethers';

import type {BigNumberish} from 'ethers';
import type {TAddress} from '@yearn-finance/web-lib/types';
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
