import {type ChangeEvent, Fragment, type ReactElement,useCallback, useState} from 'react';
import {YVAULTV3_ABI} from 'utils/ABI/yVaultv3.abi';
import {YVAULT_V3_BASE_ABI} from 'utils/ABI/yVaultV3Base.abi';
import {apeInVault, apeOutVault, approveERC20, depositERC20, withdrawERC20} from 'utils/actions';
import {maxUint256, parseUnits} from 'viem';
import {useNetwork} from 'wagmi';
import {erc20ABI, fetchBalance, readContract, readContracts} from '@wagmi/core';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';
import {defaultTxStatus} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {TVault, TVaultData} from 'utils/types';
import type {TNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import type {TransactionReceipt} from '@ethersproject/providers';


type TVaultActionInner = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
	onProceed: (receipt?: TransactionReceipt | undefined) => Promise<void>
}

function handleInputChangeEventValue(value: string, decimals?: number): TNormalizedBN {
	if (value === '') {
		return {raw: 0n, normalized: ''};
	}

	let amount = value
		.replace(/,/g, '.')
		.replace(/[^0-9.]/g, '')
		.replace(/(\..*)\./g, '$1');
	if (amount.startsWith('.')) {
		amount = '0' + amount;
	}

	const amountParts = amount.split('.');
	if (amountParts.length === 2) {
		amount = amountParts[0] + '.' + amountParts[1].slice(0, decimals);
	}

	const raw = parseUnits(amount || '0', decimals || 18);
	return {raw: raw, normalized: amount || '0'};
}


function	VaultActionZaps({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();
	const	{chain} = useNetwork();
	const	chainCoin = chain?.nativeCurrency.symbol || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[zapAmount, set_zapAmount] = useState(toNormalizedBN(0));
	const	[isZapIn, set_isZapIn] = useState(false);
	const	[isZapOut, set_isZapOut] = useState(false);
	const	[txStatusZapApproval, set_txStatusZapApproval] = useState(defaultTxStatus);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchZapOutApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !vault.ZAP_ADDR) {
			return;
		}

		const allowance = await readContract({
			abi: erc20ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vault.ZAP_ADDR)]
		});

		onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, vault.WANT_ADDR, vault.ZAP_ADDR]);


	const onZapIn = useCallback(async (): Promise<void> => {
		if (isZapIn || isZero(zapAmount.raw)) {
			return;
		}

		set_isZapIn(true);
		const result = await apeInVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		});
		set_isZapIn(false);

		if(result.isSuccessful){
			onProceed();
		}
	}, [isZapIn, onProceed, provider, vault.ZAP_ADDR, zapAmount.raw]);


	async function	onZapOutAllowance(): Promise<void> {
		const result = await approveERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR), //token
			spenderAddress: toAddress(vault.ZAP_ADDR), //spender
			amount: maxUint256 - 1n,
			statusHandler: set_txStatusZapApproval
		});

		if(result.isSuccessful){
			fetchZapOutApproval();
		}
	}
	async function	onZapOut(): Promise<void> {
		if (isZapOut || isZero(vaultData.balanceOf.raw) || isZero(vaultData.allowanceZapOut?.raw)) {
			return;
		}

		set_isZapOut(true);
		const result = await apeOutVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: !isZero(zapAmount.raw) ? zapAmount.raw : vaultData.balanceOf.raw
		});
		set_isZapOut(false);

		if(result.isSuccessful){
			onProceed();
		}
	}

	return (
		<div className={'mb-6 flex flex-col'}>
			<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
				<div className={'mb-2 mr-2 flex flex-row items-center'} style={{height: '33px'}}>
					<input
						className={'border-neutral-500 bg-neutral-0/0 px-2 py-1.5 text-xs text-neutral-900'}
						style={{height: '33px'}}
						type={'text'}
						value={zapAmount?.normalized}
						onChange={(e: ChangeEvent<HTMLInputElement>): void => set_zapAmount(
							handleInputChangeEventValue(e.target.value, vaultData.decimals)
						)} />
					<div className={'border border-l-0 border-solid border-neutral-500 bg-neutral-100 px-2 py-1.5 text-xs'} style={{height: '33px'}}>
						{chainCoin}
					</div>
				</div>
			</div>
			<div>
				{
					vaultData.depositLimit.raw > 0n && vault.VAULT_STATUS !== 'withdraw' ?
						<>
							<button
								onClick={onZapIn}
								disabled={isZapIn || isZero(zapAmount.raw)}
								className={`${isZapIn || isZero(zapAmount.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 w-[6rem] border border-solid border-neutral-500 p-1.5 text-sm font-semibold text-neutral-900 transition-colors`}>
								{'💰 Zap in'}
							</button>
						</> : <Fragment />
				}
				<Button
					variant={'outlined'}
					isBusy={txStatusZapApproval.pending}
					isDisabled={txStatusZapApproval.error || txStatusZapApproval.pending || (vaultData.allowanceZapOut && vaultData?.allowanceZapOut?.raw > 0n)}
					onClick={onZapOutAllowance}>
					{(vaultData.allowanceZapOut && vaultData?.allowanceZapOut?.raw > 0n) ? '✅ Approved' : '🚀 Approve Zap Out'}
				</Button>
				<button
					onClick={onZapOut}
					disabled={isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw)}
					className={`${isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 text-sm font-semibold text-neutral-900 transition-colors`}>
					{'💸 Zap out'}
				</button>
			</div>
		</div>
	);
}

function	VaultActionApeIn({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();

	/**************************************************************************
	** Some basic variables around the vault
	**************************************************************************/
	const	vaultSpender = vault.VAULT_ADDR;
	const	{chain} = useNetwork();
	const	chainCoin = chain?.nativeCurrency.symbol || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[txStatusApproval, set_txStatusApproval] = useState(defaultTxStatus);
	const	[txStatusDeposit, set_txStatusDeposit] = useState(defaultTxStatus);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !vault || !vaultSpender) {
			return;
		}

		const allowance = await readContract({
			abi: erc20ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vaultSpender)]
		});

		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}, [address, vault, vaultSpender, onUpdateVaultData]);

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	const onApprove = useCallback(async (): Promise<void> => {
		const result = await approveERC20({
			connector: provider,
			contractAddress: toAddress(vault.WANT_ADDR),
			spenderAddress: toAddress(vaultSpender),
			amount: maxUint256 - 1n,
			statusHandler: set_txStatusApproval
		});

		if(result.isSuccessful){
			fetchApproval();
		}

	}, [fetchApproval, provider, vaultSpender, vault.WANT_ADDR]);

	async function	onDeposit(): Promise<void> {
		const result = await depositERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			spenderAddress: toAddress(vaultSpender),
			amount: amount.raw,
			isLegacy: vault.VAULT_ABI === 'yVaultV2',
			statusHandler: set_txStatusDeposit
		});

		if(result.isSuccessful){
			onProceed();
		}
	}

	return (
		<div className={'flex w-full flex-col border border-dashed border-neutral-500 p-4'}>
			<div className={'mb-2'}>
				<p className={'text-xl font-semibold text-neutral-900'}>
					{'Deposit'}
				</p>
			</div>
			<div className={'mb-6 text-sm font-medium'}>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.wantBalance.normalized, 10)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.coinBalance.normalized, 2)}`}</p>
				</div>
			</div>

			<div className={'mb-2 flex w-full flex-row items-center'} style={{height: '33px'}}>
				<input
					className={'w-full border-neutral-500 bg-neutral-0/0 px-2 py-1.5 text-xs text-neutral-900'}
					style={{height: '33px'}}
					type={'number'}
					value={amount?.normalized}
					onChange={(e: ChangeEvent<HTMLInputElement>): void => {
						set_amount(
							handleInputChangeEventValue(e.target.value, vaultData.decimals)
						);
					}} />
				<button
					onClick={(): void => set_amount(vaultData.wantBalance)}
					className={'border border-l-0 border-solid border-neutral-500 bg-neutral-100 px-2 py-1.5 text-xs transition-colors hover:bg-neutral-900 hover:text-neutral-0'}
					style={{height: '33px'}}>
					{'max'}
				</button>
				<Button
					variant={'outlined'}
					style={{height: '33px'}}
					className={'!mb-0 !ml-2 whitespace-nowrap'}
					isBusy={txStatusApproval.pending}
					isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw > 0n}
					onClick={onApprove}>
					{vaultData.allowance.raw > 0n ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
				</Button>
			</div>

			{/* <Button
				variant={'outlined'}
				isBusy={txStatusApproval.pending}
				isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw > 0n}
				onClick={onApprove}>
				{vaultData.allowance.raw > 0n ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
			</Button> */}
			<Button
				variant={'outlined'}
				isBusy={txStatusDeposit.pending}
				isDisabled={txStatusDeposit.error || txStatusDeposit.pending || isZero(vaultData.allowance.raw) || isZero(amount.raw)}
				onClick={onDeposit}>
				{'💰 Deposit'}
			</Button>

		</div>
	);
}

function	VaultActionApeOut({vault, vaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider} = useWeb3();

	/**************************************************************************
	** Some basic variables around the vault
	**************************************************************************/

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[txStatusWithdraw, set_txStatusWithdraw] = useState(defaultTxStatus);


	async function	onWithdraw(): Promise<void> {
		if(!provider){
			return;
		}

		const result = await withdrawERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: amount.raw,
			isLegacy: vault.VAULT_ABI === 'yVaultV2',
			statusHandler: set_txStatusWithdraw
		});

		if(result.isSuccessful){
			onProceed();
		}
	}

	return (
		<div className={'flex w-full flex-col border border-dashed border-neutral-500 p-4'}>
			<div className={'mb-2'}>
				<p className={'text-xl font-semibold text-neutral-900'}>
					{'Withdraw'}
				</p>
			</div>
			<div className={'mb-6 text-sm font-medium'}>
				<div>
					<p className={'inline text-neutral-900'}>{'Your vault shares: '}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.balanceOf.normalized, 10)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Your shares value: '}</p>
					<p className={'ml-3 inline'}>{`$${vaultData.balanceOfValue === 0 ? '-' : formatAmount(vaultData?.balanceOfValue, 2)}`}</p>
				</div>
			</div>

			<div className={'mb-2 flex w-full flex-row items-center'} style={{height: '33px'}}>
				<input
					className={'w-full border-neutral-500 bg-neutral-0/0 px-2 text-xs text-neutral-900'}
					disabled={vault.VAULT_STATUS === 'withdraw'}
					style={{height: '33px'}}
					type={'text'}
					value={amount?.normalized}
					onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
						handleInputChangeEventValue(e.target.value, vaultData.decimals)
					)} />
				<button
					onClick={(): void => set_amount(toNormalizedBN(vaultData.balanceOf.raw, vaultData.decimals))}
					className={'border border-l-0 border-solid border-neutral-500 bg-neutral-100 px-2 py-1.5 text-xs transition-colors hover:bg-neutral-900 hover:text-neutral-0'}
					style={{height: '33px'}}>
					{'max'}
				</button>
			</div>

			<Button
				variant={'outlined'}
				isBusy={txStatusWithdraw.pending}
				isDisabled={txStatusWithdraw.error || txStatusWithdraw.pending || isZero(vaultData.balanceOf.raw) || isZero(amount.raw)}
				onClick={onWithdraw}>
				{'💸 Withdraw'}
			</Button>
		</div>
	);
}

type TVaultAction = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
}
function	VaultAction({vault, vaultData, onUpdateVaultData}: TVaultAction): ReactElement {
	const {provider, address} = useWeb3();

	/**************************************************************************
	** fetchPostDepositOrWithdraw will
	**************************************************************************/
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}

		const data = await readContracts({
			contracts: [
				{abi: erc20ABI, address: toAddress(vault.WANT_ADDR), functionName: 'allowance', args: [toAddress(address), toAddress(vault.VAULT_ADDR)]},
				{abi: erc20ABI, address: toAddress(vault.WANT_ADDR), functionName: 'balanceOf', args: [toAddress(address)]},
				{abi: erc20ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'balanceOf', args: [toAddress(address)]},
				{abi: YVAULTV3_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'totalAssets'},
				{abi: YVAULTV3_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'pricePerShare'},
				{abi: YVAULT_V3_BASE_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'maxDeposit', args: [toAddress(address)]}
			]
		});
		const wantAllowance = toNormalizedBN(decodeAsBigInt(data[0]), vaultData.decimals);
		const wantBalance = toNormalizedBN(decodeAsBigInt(data[1]), vaultData.decimals);
		const vaultBalance = toNormalizedBN(decodeAsBigInt(data[2]), vaultData.decimals);
		const totalAssets = toNormalizedBN(decodeAsBigInt(data[3]), vaultData.decimals);
		const pricePerShare = toNormalizedBN(decodeAsBigInt(data[4]), vaultData.decimals);
		const depositLimit = toNormalizedBN(decodeAsBigInt(data[5]) >= (maxUint256 - 1n) ?
			decodeAsBigInt(data[5]) : decodeAsBigInt(data[5]) + totalAssets.raw, vaultData.decimals);
		const availableDepositLimit = toNormalizedBN(decodeAsBigInt(data[5]), vaultData.decimals);
		const coinBalance = await fetchBalance({address: address});

		onUpdateVaultData((v): TVaultData => ({
			...v,
			allowance: wantAllowance,
			wantBalance: wantBalance,
			balanceOf: vaultBalance,
			balanceOfValue: Number(vaultBalance.normalized) * Number(v.pricePerShare.normalized) * v.wantPrice,
			coinBalance: toNormalizedBN(coinBalance.value, 18),
			depositLimit: depositLimit,
			totalAssets: totalAssets,
			availableDepositLimit: availableDepositLimit,
			pricePerShare: pricePerShare,
			totalAUM: Number(totalAssets.normalized) * v.wantPrice,
			progress: isZero(depositLimit.raw) ? 1 : (Number(depositLimit.normalized) - Number(availableDepositLimit.normalized)) / Number(depositLimit.normalized)
		}));

		if (vault.ZAP_ADDR) {
			const allowanceZapOut = await readContract({
				abi: erc20ABI,
				address: toAddress(vault.WANT_ADDR),
				functionName: 'allowance',
				args: [address, toAddress(vault.ZAP_ADDR)]
			});

			onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowanceZapOut, v.decimals)}));
		}
	}

	// console.warn('vaultData', vaultData);

	return (
		<section aria-label={'ACTIONS'} className={'my-4 mt-8'}>
			<h1 className={'mb-6 text-2xl font-semibold text-neutral-900'}>{'APE-IN/OUT'}</h1>
			<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
				<p className={'text-sm font-medium'}>{'Deposit closed.'}</p>
			</div>

			{vault.ZAP_ADDR ? <VaultActionZaps
				vault={vault}
				vaultData={vaultData}
				onUpdateVaultData={onUpdateVaultData}
				onProceed={fetchPostDepositOrWithdraw}
			/> : (<Fragment />)}

			<div className={'grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2'}>
				{vaultData.depositLimit.raw > 0n && vault.VAULT_STATUS !== 'withdraw' ? (
					<VaultActionApeIn
						vault={vault}
						vaultData={vaultData}
						onUpdateVaultData={onUpdateVaultData}
						onProceed={fetchPostDepositOrWithdraw} />
				) : (<Fragment />)}

				<VaultActionApeOut
					vault={vault}
					vaultData={vaultData}
					onUpdateVaultData={onUpdateVaultData}
					onProceed={fetchPostDepositOrWithdraw} />
			</div>
		</section>
	);
}

export default VaultAction;
