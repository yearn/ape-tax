import assert from 'assert';
import {toAddress} from '@yearn-finance/web-lib/utils/address';

import {assertAddress, handleTx} from './toWagmiProvider';

import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TTxResponse} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TWriteTransaction} from './toWagmiProvider';

type TApproveToken = TWriteTransaction & {
	spenderAddress: TAddress | undefined;
	amount: bigint;
};
export async function	approveToken(props: TApproveToken): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assertAddress(props.spenderAddress, 'spenderAddress');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function approve(address spender, uint256 amount) public returns (bool)'],
		functionName: 'approve',
		args: [props.spenderAddress, props.amount]
	});
}

type TDepositToken = TWriteTransaction & {
	amount: bigint;
};
export async function	depositToken(props: TDepositToken): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function deposit(uint256 amount)'],
		functionName: 'deposit',
		args: [props.amount]
	});
}

type TWithdrawToken = TWriteTransaction & {
	amount: bigint;
};
export async function	withdrawToken(props: TWithdrawToken): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function withdraw(uint256 amount)'],
		functionName: 'withdraw',
		args: [props.amount]
	});
}

type TApeInVault = TWriteTransaction & {
	amount: bigint;
};
export async function	apeInVault(props: TApeInVault): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function deposit() public payable'],
		functionName: 'deposit',
		args: [props.amount]
	});
}

type TApeOutVault = TWriteTransaction & {
	amount: bigint;
};
export async function	apeOutVault(props: TApeOutVault): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'contractAddress');
	assert(props.amount > 0n, 'Amount must be greater than 0');

	return await handleTx(props, {
		address: props.contractAddress,
		abi: ['function withdraw(uint256 amount) public'],
		functionName: 'withdraw',
		args: [props.amount]
	});
}

export async function	harvestStrategy(props: TWriteTransaction): Promise<TTxResponse> {
	assert(props.connector, 'No connector');
	assertAddress(props.contractAddress, 'strategyAddress');

	return await handleTx(props, {
		address: toAddress(process.env.YEARN_FACTORY_KEEPER_WRAPPER),
		abi: ['function harvestStrategy(address) public'],
		functionName: 'harvestStrategy',
		args: [props.contractAddress]
	});
}
