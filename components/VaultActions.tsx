import React, {Fragment, useState} from 'react';
import {ethers} from 'ethers';
import {apeInVault, apeOutVault, approveToken, depositToken, withdrawToken} from 'utils/actions';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';
import {getProvider} from '@yearn-finance/web-lib/utils/web3/providers';

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
		address, chainID
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
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.VAULT_ADDR);
		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}
	async function	fetchZapOutApproval(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.ZAP_ADDR);
		onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
	}
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}
		let		providerToUse = provider;
		if (vault.CHAIN_ID === 250 && chainID !== 1337) {
			providerToUse = getProvider(250);
		}
		if (vault.CHAIN_ID === 4 && chainID !== 1337) {
			providerToUse = getProvider(4);
		}
		if (vault.CHAIN_ID === 137 && chainID !== 1337) {
			providerToUse = getProvider(137);
		}
		if (vault.CHAIN_ID === 42161 && chainID !== 1337) {
			providerToUse = getProvider(42161);
		}
		if (vault.CHAIN_ID === 100 && chainID !== 100) {
			providerToUse = getProvider(100);
		}

		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], providerToUse
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)'
			], providerToUse);

		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, depositLimit, totalAssets, availableDepositLimit, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			providerToUse.getBalance(address),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare()
		]);

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
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals))
		}));

		if (vault.ZAP_ADDR) {
			const	allowantZapOut = await vaultContract.allowance(address, vault.ZAP_ADDR);
			onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowantZapOut, v.decimals)}));
		}
	}

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	async function	onZapIn(): Promise<void> {
		if (isDepositing || zapAmount.raw.isZero()) {
			return;
		}
		set_isDepositing(true);
		apeInVault({
			provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		}, ({error}): void => {
			set_isDepositing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onZapOutAllowance(): Promise<void> {
		if (isZapOutApproving) {
			return;
		}
		set_isZapOutApproving(true);
		approveToken({
			provider,
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
	async function	onZapOut(): Promise<void> {
		if (isWithdrawing || vaultData.balanceOf.raw.isZero() || vaultData.allowanceZapOut?.raw.isZero()) {
			return;
		}
		set_isWithdrawing(true);
		apeOutVault({
			provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: !zapAmount.raw.isZero() ? zapAmount.raw : vaultData.balanceOf.raw
		}, ({error}): void => {
			set_isWithdrawing(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onApprove(): Promise<void> {
		if (isApproving) {
			return;
		}
		set_isApproving(true);
		approveToken({
			provider,
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
		if (isDepositing || (vaultData.allowance.raw.lt(amount.raw) || amount.raw.isZero()) || isDepositing) {
			return;
		}
		set_isDepositing(true);
		depositToken({
			provider,
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
		if (isDepositing || (vaultData.allowance.raw.lt(amount.raw)) || isDepositing || vaultData.wantBalance.raw.isZero()) {
			return;
		}
		set_isDepositing(true);
		depositToken({
			provider,
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
		if (isWithdrawing || vaultData.balanceOf.raw.isZero()) {
			return;
		}
		set_isWithdrawing(true);
		withdrawToken({
			provider,
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
		if (isWithdrawing || vaultData.balanceOf.raw.isZero()) {
			return;
		}
		set_isWithdrawing(true);
		withdrawToken({
			provider,
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
							vaultData.depositLimit.raw.gt(0) && vault.VAULT_STATUS !== 'withdraw' ?
								<>
									<button
										onClick={onZapIn}
										disabled={isDepositing || zapAmount.raw.isZero()}
										className={`${isDepositing || zapAmount.raw.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
										{'💰 Zap in'}
									</button>
								</> : <Fragment />
						}
						<button
							onClick={onZapOutAllowance}
							disabled={vaultData?.allowanceZapOut?.raw.gt(0) || isZapOutApproving}
							className={`${vaultData?.allowanceZapOut?.raw.gt(0) || isZapOutApproving ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
							{vaultData?.allowanceZapOut?.raw.gt(0) ? '✅ Approved' : '🚀 Approve Zap Out'}
						</button>
						<button
							onClick={onZapOut}
							disabled={vaultData.balanceOf.raw.isZero() || vaultData?.allowanceZapOut?.raw?.isZero()}
							className={`${vaultData.balanceOf.raw.isZero() || vaultData?.allowanceZapOut?.raw?.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
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
					{vaultData.depositLimit.raw.gt(0) && vault.VAULT_STATUS !== 'withdraw' ? (
						<>
							<button
								onClick={onApprove}
								className={`${vaultData.allowance.raw.gt(0) || isApproving ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{vaultData.allowance.raw.gt(0) ? '✅ Approved' : '🚀 Approve Vault'}
							</button>
							<button
								onClick={onDeposit}
								disabled={vaultData.allowance.raw.isZero() || amount.raw.isZero() || isDepositing}
								className={`${vaultData.allowance.raw.isZero() || amount.raw.isZero() || isDepositing ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{'💰 Deposit'}
							</button>
							<button
								onClick={onDepositAll}
								disabled={vaultData.allowance.raw.isZero() || isDepositing || vaultData?.wantBalance?.raw?.isZero()}
								className={`${vaultData.allowance.raw.isZero() || isDepositing || vaultData?.wantBalance?.raw?.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
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
