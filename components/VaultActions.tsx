import {Fragment, useCallback, useState} from 'react';
import {ethers} from 'ethers';
import {apeInVault, apeOutVault, approveToken, depositToken, withdrawToken} from 'utils/actions';
import {multicall, readContract} from '@wagmi/core';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
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
	async function	fetchApproval(): Promise<void> {
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
	}
	async function	fetchZapOutApproval(): Promise<void> {
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
	}
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}

		const calls = [];
		const wantContract = {
			address: toAddress(vault.WANT_ADDR),
			abi: [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			]
		};
		const vaultContract = {
			address: toAddress(vault.VAULT_ADDR),
			abi: [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)'
			]
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
		const wantAllowance = callResult[0].result as string;
		const wantBalance = callResult[1].result as string;
		const vaultBalance = toBigInt(callResult[2].result as string);
		const coinBalance = callResult[3].result as string;
		const depositLimit = toBigInt(callResult[4].result as string);
		const totalAssets = callResult[5].result as string;
		const availableDepositLimit = callResult[6].result as string;
		const pricePerShare = callResult[7].result as string;


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
			totalAUM: Number((Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice)),
			progress: isZero(depositLimit) ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals))
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

	async function	onZapOutAllowance(): Promise<void> {
		if (isZapOutApproving) {
			return;
		}
		set_isZapOutApproving(true);
		approveToken({
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: ethers.constants.MaxUint256,
			from: toAddress(vault.ZAP_ADDR)
		}, ({error}): void => {
			set_isZapOutApproving(false);
			if (error) {
				return;
			}
			fetchZapOutApproval();
		});
	}

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

	async function	onApprove(): Promise<void> {
		if (isApproving) {
			return;
		}
		set_isApproving(true);
		approveToken({
			contractAddress: toAddress(vault.WANT_ADDR),
			amount: ethers.constants.MaxUint256,
			from: toAddress(vault.VAULT_ADDR)
		}, ({error}): void => {
			set_isApproving(false);
			if (error) {
				return;
			}
			fetchApproval();
		});
	}
	async function	onDeposit(): Promise<void> {
		if (isDepositing || (vaultData.allowance.raw < amount.raw || isZero(amount.raw)) || isDepositing) {
			return;
		}
		set_isDepositing(true);
		depositToken({
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: amount.raw
		}, ({error}): void => {
			set_isDepositing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onDepositAll(): Promise<void> {
		if (isDepositing || (vaultData.allowance.raw < amount.raw) || isDepositing || isZero(vaultData.wantBalance.raw)) {
			return;
		}
		set_isDepositing(true);
		depositToken({
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: vaultData.wantBalance.raw
		}, ({error}): void => {
			set_isDepositing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onWithdraw(): Promise<void> {
		if (isWithdrawing || isZero(vaultData.balanceOf.raw)) {
			return;
		}
		set_isWithdrawing(true);
		withdrawToken({
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: amount.raw
		}, ({error}): void => {
			set_isWithdrawing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onWithdrawAll(): Promise<void> {
		if (isWithdrawing || isZero(vaultData.balanceOf.raw)) {
			return;
		}
		set_isWithdrawing(true);
		withdrawToken({
			contractAddress: toAddress(vault.VAULT_ADDR),
			amount: ethers.constants.MaxUint256
		}, ({error}): void => {
			set_isWithdrawing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
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
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'💸 Withdraw'}
					</button>
					<button
						onClick={onWithdrawAll}
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</div>
		</section>
	);
}

export default VaultAction;
