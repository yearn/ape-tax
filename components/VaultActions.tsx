import {Fragment, useCallback, useState} from 'react';
import {apeInVault, apeOutVault, approveToken, depositToken, withdrawToken} from 'utils/actions';
import {erc20ABI, multicall, readContract} from '@wagmi/core';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {MAX_UINT_256} from '@yearn-finance/web-lib/utils/constants';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {formatToNormalizedValue, toBigInt, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {ChangeEvent, ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';

type TVaultAction = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
}
function	VaultAction({vault, vaultData, onUpdateVaultData}: TVaultAction): ReactElement {
	const	{
		provider,
		address, 
		chainID
	} = useWeb3();
	const	chainCoin = CHAINS[vault?.CHAIN_ID]?.coin || 'ETH';
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[zapAmount, set_zapAmount] = useState(toNormalizedBN(0));
	const	[isApproving, set_isApproving] = useState(false);
	const	[isZapOutApproving, set_isZapOutApproving] = useState(false);
	const	[isDepositing, set_isDepositing] = useState(false);
	const	[isWithdrawing, set_isWithdrawing] = useState(false);

	/**************************************************************************
	** We need to update the status when some events occurs
	**************************************************************************/
	const fetchApproval = useCallback(async (): Promise<void> => {
		if (!vault || !provider || !address) {
			return;
		}
		const allowance = await readContract({
			abi: VAULT_ABI,
			address: toAddress(vault.VAULT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vault.VAULT_ADDR)]
		});
		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, provider, vault]);

	const fetchZapOutApproval = useCallback(async (): Promise<void> => {
		if (!vault || !provider || !address) {
			return;
		}
		const allowance = await readContract({
			abi: VAULT_ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vault.ZAP_ADDR)]
		});
		onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, provider, vault]);

	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}

		const calls = [];
		const wantContract = {
			address: toAddress(vault.WANT_ADDR),
			abi: erc20ABI
		};
		const vaultContract = {
			address: toAddress(vault.VAULT_ADDR),
			abi: VAULT_ABI
		};

		calls.push({...wantContract, functionName: 'allowance', args: [address, vault.VAULT_ADDR]});
		calls.push({...wantContract, functionName: 'balanceOf', args: [address]});
		calls.push({...vaultContract, functionName: 'balanceOf', args: [address]});
		calls.push({...vaultContract, functionName: 'getBalance', args: [address]});
		calls.push({...vaultContract, functionName: 'depositLimit'});
		calls.push({...vaultContract, functionName: 'totalAssets'});
		calls.push({...vaultContract, functionName: 'availableDepositLimit'});
		calls.push({...vaultContract, functionName: 'pricePerShare'});
	
		const callResult = await multicall({contracts: calls as never[], chainId: chainID});
		const wantAllowance = decodeAsBigInt(callResult[0]);
		const wantBalance = decodeAsBigInt(callResult[1]);
		const vaultBalance = decodeAsBigInt(callResult[2]);
		const coinBalance = decodeAsBigInt(callResult[3]);
		const depositLimit = decodeAsBigInt(callResult[4]);
		const totalAssets = decodeAsBigInt(callResult[5]);
		const availableDepositLimit = decodeAsBigInt(callResult[6]);
		const pricePerShare = decodeAsBigInt(callResult[7]);


		onUpdateVaultData((v): TVaultData => ({
			...v,
			allowance: toNormalizedBN(wantAllowance, v.decimals),
			wantBalance: toNormalizedBN(wantBalance, v.decimals),
			balanceOf: toNormalizedBN(vaultBalance, v.decimals),
			balanceOfValue: formatToNormalizedValue(vaultBalance, v.decimals) * Number(v.pricePerShare.normalized) * v.wantPrice,
			coinBalance: toNormalizedBN(coinBalance, 18),
			depositLimit: toNormalizedBN(depositLimit, v.decimals),
			totalAssets: toNormalizedBN(totalAssets, v.decimals),
			availableDepositLimit: toNormalizedBN(availableDepositLimit, v.decimals),
			pricePerShare: toNormalizedBN(pricePerShare, v.decimals),
			totalAUM: formatToNormalizedValue(totalAssets, v.decimals) * v.wantPrice,
			progress: isZero(depositLimit) ? 1 : (formatToNormalizedValue(depositLimit, v.decimals) - formatToNormalizedValue(availableDepositLimit, v.decimals)) / formatToNormalizedValue(depositLimit, v.decimals)
		}));

		if (vault.ZAP_ADDR) {
			const allowance = await readContract({
				abi: VAULT_ABI,
				address: toAddress(vault.VAULT_ADDR),
				functionName: 'allowance',
				args: [address, toAddress(vault.ZAP_ADDR)]
			});
			onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
		}
	}

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	const onZapIn = useCallback(async (): Promise<void> => {
		const result = await apeInVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		}); 

		if(result.isSuccessful){
			alert('onZapIn worked!');
		}
	}, [provider, vault.ZAP_ADDR, zapAmount.raw]);

	const onZapOutAllowance = useCallback(async (): Promise<void> => {
		if (isZapOutApproving) {
			return;
		}
		set_isZapOutApproving(true);
		const result = await approveToken({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			spenderAddress: toAddress(vault.ZAP_ADDR),
			amount: MAX_UINT_256
		});
		set_isZapOutApproving(false);

		if(result.isSuccessful){
			fetchZapOutApproval();
		}
	}, [fetchZapOutApproval, isZapOutApproving, provider, vault.VAULT_ADDR, vault.ZAP_ADDR]);

	const onZapOut = useCallback(async (): Promise<void> => {
		const result = await apeOutVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		}); 

		if(result.isSuccessful){
			alert('onZapOut worked!');
		}
	}, [provider, vault.ZAP_ADDR, zapAmount.raw]);

	const onApprove = useCallback(async (): Promise<void> => {
		if (isApproving) {
			return;
		}

		set_isApproving(true);
		const result = await approveToken({
			connector: provider,
			contractAddress: toAddress(vault.WANT_ADDR),
			spenderAddress: toAddress(vault.VAULT_ADDR),
			amount: MAX_UINT_256
		});
		set_isApproving(false);

		if(result.isSuccessful){
			fetchApproval();
		}

	}, [fetchApproval, isApproving, provider, vault.VAULT_ADDR, vault.WANT_ADDR]);


	async function	onDeposit(): Promise<void> {
		if (isDepositing || (vaultData.allowance.raw < amount.raw || isZero(amount.raw)) || isDepositing) {
			return;
		}
		set_isDepositing(true);
		const result = await depositToken({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: amount.raw
		});
		set_isDepositing(false);

		if(result.isSuccessful){
			fetchPostDepositOrWithdraw();
		}
	}

	async function	onDepositAll(): Promise<void> {
		if (isDepositing || (vaultData.allowance.raw < amount.raw) || isDepositing || isZero(vaultData.wantBalance.raw)) {
			return;
		}

		set_isDepositing(true);
		const result = await depositToken({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: vaultData.wantBalance.raw
		});
		set_isDepositing(false);

		if(result.isSuccessful){
			fetchPostDepositOrWithdraw();
		}
	}

	async function	onWithdraw(): Promise<void> {
		if (isWithdrawing || isZero(vaultData.balanceOf.raw)) {
			return;
		}

		set_isWithdrawing(true);
		const result = await withdrawToken({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: amount.raw
		});
		set_isWithdrawing(false);

		if(result.isSuccessful){
			fetchPostDepositOrWithdraw();
		}
	}
	async function	onWithdrawAll(): Promise<void> {
		if (isWithdrawing || isZero(vaultData.balanceOf.raw)) {
			return;
		}

		set_isWithdrawing(true);
		const result = await withdrawToken({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: vaultData.balanceOf.raw
		});
		set_isWithdrawing(false);

		if(result.isSuccessful){
			fetchPostDepositOrWithdraw();
		}
	}

	return (
		<section aria-label={'ACTIONS'} className={'my-4 mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-900'}>{'APE-IN/OUT'}</h1>
			<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
				<p className={'font-mono text-sm font-medium text-neutral-700'}>{'Deposit closed.'}</p>
			</div>

			{vault.ZAP_ADDR ? (
				<div className={'mb-6 flex flex-col'}>
					<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
						<div className={'mb-2 mr-2 flex flex-row items-center'} style={{height: '33px'}}>
							<input
								className={'border-neutral-700 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-700'}
								style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
								type={'text'}
								value={zapAmount?.normalized}
								onChange={(e: ChangeEvent<HTMLInputElement>): void => set_zapAmount(
									handleInputChangeEventValue(e.target.value, vaultData.decimals)
								)} />
							<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-500 px-2 py-1.5 font-mono text-xs text-neutral-700'} style={{height: '33px'}}>
								{chainCoin}&nbsp;
							</div>
						</div>
					</div>
					<div>
						{
							vaultData.depositLimit.raw > 0n && vault.VAULT_STATUS !== 'withdraw' ?
								<>
									<button
										onClick={onZapIn}
										disabled={isDepositing || isZero(zapAmount.raw)}
										className={`${isDepositing || isZero(zapAmount.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
										{'💰 Zap in'}
									</button>
								</> : <Fragment />
						}
						<button
							onClick={onZapOutAllowance}
							disabled={toBigInt(vaultData?.allowanceZapOut?.raw) > 0n || isZapOutApproving}
							className={`${toBigInt(vaultData?.allowanceZapOut?.raw) > 0n || isZapOutApproving ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
							{toBigInt(vaultData?.allowanceZapOut?.raw) > 0n ? '✅ Approved' : '🚀 Approve Zap Out'}
						</button>
						<button
							onClick={onZapOut}
							disabled={isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw)}
							className={`${isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
							{'💸 Zap out'}
						</button>
					</div>
				</div>
			) : (<Fragment />)}


			<div className={'flex flex-col'}>
				<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
					<div className={'mb-2 mr-2 flex flex-row items-center'} style={{height: '33px'}}>
						<input
							className={'border-neutral-500 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-700'}
							style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
							type={'text'}
							value={amount?.normalized}
							onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
								handleInputChangeEventValue(e.target.value, vaultData.decimals)
							)} />
						<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-500 px-2 py-1.5 font-mono text-xs text-neutral-700'} style={{height: '33px'}}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div>
					{vaultData.depositLimit.raw > 0n && vault.VAULT_STATUS !== 'withdraw' ? (
						<>
							<button
								onClick={onApprove}
								className={`${vaultData.allowance.raw > 0n || isApproving ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{vaultData.allowance.raw > 0n ? '✅ Approved' : '🚀 Approve Vault'}
							</button>
							<button
								onClick={onDeposit}
								disabled={isZero(vaultData.allowance.raw) || isZero(amount.raw) || isDepositing}
								className={`${isZero(vaultData.allowance.raw) || isZero(amount.raw) || isDepositing ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{'💰 Deposit'}
							</button>
							<button
								onClick={onDepositAll}
								disabled={isZero(vaultData.allowance.raw) || isDepositing || isZero(vaultData?.wantBalance?.raw)}
								className={`${isZero(vaultData.allowance.raw) || isDepositing || isZero(vaultData?.wantBalance?.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{'💰 Deposit All'}
							</button>
						</>
					) : (<Fragment />)}
					<button
						onClick={onWithdraw}
						disabled={isZero(vaultData.balanceOf.raw)}
						className={`${isZero(vaultData.balanceOf.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'💸 Withdraw'}
					</button>
					<button
						onClick={onWithdrawAll}
						disabled={isZero(vaultData.balanceOf.raw)}
						className={`${isZero(vaultData.balanceOf.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</div>
		</section>
	);
}

export default VaultAction;
