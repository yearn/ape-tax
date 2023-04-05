import React, {Fragment, useMemo, useState} from 'react';
import {ethers} from 'ethers';
import {apeInVault, apeOutVault, approveERC20, depositERC20, withdrawToken} from 'utils/actions';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';
import {getProvider} from '@yearn-finance/web-lib/utils/web3/providers';
import {defaultTxStatus, Transaction} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {ChangeEvent, ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';

type TVaultAction = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
}
function	VaultAction({vault, vaultData, onUpdateVaultData}: TVaultAction): ReactElement {
	const	{provider, address, chainID} = useWeb3();

	const	yearnRouterForChain = useMemo((): string => (process?.env?.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID], [vault.CHAIN_ID]);
	const	chainCoin = useMemo((): string => CHAINS[vault?.CHAIN_ID]?.coin || 'ETH', [vault?.CHAIN_ID]);
	const	vaultSpender = useMemo((): string => vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR, [vault.VAULT_ABI, vault.VAULT_ADDR, yearnRouterForChain]);

	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[zapAmount, set_zapAmount] = useState(toNormalizedBN(0));
	const	[isWithdrawing, set_isWithdrawing] = useState(false);
	const	[isZapIn, set_isZapIn] = useState(false);
	const	[txStatusApproval, set_txStatusApproval] = useState(defaultTxStatus);
	const	[txStatusZapApproval, set_txStatusZapApproval] = useState(defaultTxStatus);
	const	[txStatusDeposit, set_txStatusDeposit] = useState(defaultTxStatus);
	const	[txStatusDepositAll, set_txStatusDepositAll] = useState(defaultTxStatus);

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
		const	allowance = await wantContract.allowance(address, vaultSpender);
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
		if (isZapIn || zapAmount.raw.isZero()) {
			return;
		}
		set_isZapIn(true);
		apeInVault({
			provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		}, ({error}): void => {
			set_isZapIn(false);
			if (error) {
				return;
			}
			fetchPostDepositOrWithdraw();
		});
	}
	async function	onZapOutAllowance(): Promise<void> {
		new Transaction(provider, approveERC20, set_txStatusZapApproval).populate(
			toAddress(vault.VAULT_ADDR), //token
			toAddress(vault.ZAP_ADDR), //spender
			ethers.constants.MaxUint256 //amount
		).onSuccess(async (): Promise<void> => {
			await fetchZapOutApproval();
		}).perform();
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
		new Transaction(provider, approveERC20, set_txStatusApproval).populate(
			toAddress(vault.WANT_ADDR), //token
			vaultSpender,
			ethers.constants.MaxUint256 //amount
		).onSuccess(async (): Promise<void> => {
			await fetchApproval();
		}).perform();
	}
	async function	onDeposit(): Promise<void> {
		new Transaction(provider, depositERC20, set_txStatusDeposit).populate(
			toAddress(vault.VAULT_ADDR), //vault
			vaultSpender, //spender (vault or router)
			amount.raw, //amount
			vault.VAULT_ABI !== 'v3' //isLegacy
		).onSuccess(async (): Promise<void> => {
			await fetchPostDepositOrWithdraw();
		}).perform();
	}
	async function	onDepositAll(): Promise<void> {
		new Transaction(provider, depositERC20, set_txStatusDepositAll).populate(
			toAddress(vault.VAULT_ADDR), //vault
			vaultSpender, //spender (vault or router)
			vaultData.wantBalance.raw, //amount (=== balance)
			vault.VAULT_ABI !== 'v3' //isLegacy
		).onSuccess(async (): Promise<void> => {
			await fetchPostDepositOrWithdraw();
		}).perform();
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
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-700'}>{'APE-IN/OUT'}</h1>
			<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
				<p className={'font-mono text-sm font-medium text-neutral-500'}>{'Deposit closed.'}</p>
			</div>

			{vault.ZAP_ADDR ? (
				<div className={'mb-6 flex flex-col'}>
					<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
						<div className={'mb-2 mr-2 flex flex-row items-center'} style={{height: '33px'}}>
							<input
								className={'border-neutral-400 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-500'}
								style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
								type={'text'}
								value={zapAmount?.normalized}
								onChange={(e: ChangeEvent<HTMLInputElement>): void => set_zapAmount(
									handleInputChangeEventValue(e.target.value, vaultData.decimals)
								)} />
							<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-400 px-2 py-1.5 font-mono text-xs text-neutral-400'} style={{height: '33px'}}>
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
										disabled={isZapIn || zapAmount.raw.isZero()}
										className={`${isZapIn || zapAmount.raw.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
										{'💰 Zap in'}
									</button>
								</> : <Fragment />
						}
						<Button
							variant={'outlined'}
							className={'bg-neutral-50 mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors hover:bg-neutral-100'}
							isBusy={txStatusZapApproval.pending}
							isDisabled={txStatusZapApproval.error || txStatusZapApproval.pending || vaultData?.allowanceZapOut?.raw.gt(0)}
							onClick={onZapOutAllowance}>
							{vaultData?.allowanceZapOut?.raw.gt(0) ? '✅ Approved' : '🚀 Approve Zap Out'}
						</Button>
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
							className={'border-neutral-400 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-500'}
							style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
							type={'text'}
							value={amount?.normalized}
							onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
								handleInputChangeEventValue(e.target.value, vaultData.decimals)
							)} />
						<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-400 px-2 py-1.5 font-mono text-xs text-neutral-400'} style={{height: '33px'}}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div className={'flex flex-row space-x-2'}>
					{vaultData.depositLimit.raw.gt(0) && vault.VAULT_STATUS !== 'withdraw' ? (
						<>
							<Button
								variant={'outlined'}
								isBusy={txStatusApproval.pending}
								isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw.gt(0)}
								onClick={onApprove}>
								{vaultData.allowance.raw.gt(0) ? '✅ Approved' : '🚀 Approve Vault'}
							</Button>

							<Button
								variant={'outlined'}
								isBusy={txStatusDeposit.pending}
								isDisabled={txStatusDeposit.error || txStatusDeposit.pending || vaultData.allowance.raw.isZero() || amount.raw.isZero()}
								onClick={onDeposit}>
								{'💰 Deposit'}
							</Button>

							<Button
								variant={'outlined'}
								isBusy={txStatusDepositAll.pending}
								isDisabled={txStatusDepositAll.error || txStatusDepositAll.pending || vaultData.allowance.raw.isZero() || vaultData?.wantBalance?.raw?.isZero()}
								onClick={onDepositAll}>
								{'💰 Deposit All'}
							</Button>
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
