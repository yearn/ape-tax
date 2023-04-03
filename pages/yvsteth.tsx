import React, {useEffect, useState} from 'react';
import {ethers} from 'ethers';
import {approveToken, depositToken, withdrawToken} from 'utils/actions';
import {fetchCryptoPrice} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress, truncateHex} from '@yearn-finance/web-lib/utils/address';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {ChangeEvent, ReactElement} from 'react';
import type {TNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';

function	InfoMessage(): ReactElement {
	return (
		<>
			<div className={'my-4 max-w-5xl bg-yellow-900 p-4 font-mono text-sm font-normal text-[#485570]'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. It's extremely risky and will probably be discarded when the test is over. Proceed with extreme caution."}
			</div>
			<div className={'my-4 max-w-5xl bg-yellow-900 p-4 font-mono text-sm font-normal text-[#485570]'}>
				{'📣 '}<strong>{'DISCLAIMER'}</strong> {'When you transfer and deposit, your ETH will be converted into stETH 1:1 and deposit in the vault. You will not be able to redeem stETH for ETH until txs are enables in ETH2.0.'}
			</div>
		</>
	);
}

export type TVaultData = {
	totalSupply: TNormalizedBN;
	coinBalance: TNormalizedBN;
	balanceOf: TNormalizedBN;
	wantBalance: TNormalizedBN;
	allowance: TNormalizedBN;
	pricePerShare: TNormalizedBN;
	apiVersion: string;
	decimals: number;
	totalAUM: number;
	balanceOfValue: number;
	wantPrice: number;
}

const		defaultVaultData: TVaultData = {
	totalSupply: toNormalizedBN(0),
	pricePerShare: toNormalizedBN(1),
	coinBalance: toNormalizedBN(0),
	balanceOf: toNormalizedBN(0),
	wantBalance: toNormalizedBN(0),
	allowance: toNormalizedBN(0),
	decimals: 18,
	balanceOfValue: 0,
	wantPrice: 0,
	totalAUM: 0,
	apiVersion: '-'
};

function	Index(): ReactElement | null {
	const	{provider, isActive, address, ens} = useWeb3();
	const	vault = vaults.yvsteth;
	const	chainExplorer = CHAINS[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	chainCoin = CHAINS[vault?.CHAIN_ID]?.coin || 'ETH';
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[vaultData, set_vaultData] = useState<TVaultData>(defaultVaultData);
	const	[isApproving, set_isApproving] = useState(false);
	const	[isDepositing, set_isDepositing] = useState(false);
	const	[isWithdrawing, set_isWithdrawing] = useState(false);

	/**************************************************************************
	** Retrieve the details of the vault and compute some of the elements for
	** the UI.
	**************************************************************************/
	useEffect((): void => {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], provider
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function version() public view returns (string)',
				'function totalSupply() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
				'function decimals() public view returns (uint256)',
				'function balanceOf(address) public view returns (uint256)'
			],
			provider
		);

		Promise.all([
			vaultContract.version(),
			vaultContract.totalSupply(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.balanceOf(address),
			fetchCryptoPrice((vault.COINGECKO_SYMBOL.toLowerCase())),
			provider.getBalance(address),
			wantContract.balanceOf(address),
			wantContract.allowance(address, vault.VAULT_ADDR)
		]).then((res): void => {
			const [version, totalSupply, pricePerShare, decimals, balanceOf, wantPrice, coinBalance, wantBalance, wantAllowance] = res;
			const price = wantPrice[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
			const numberDecimals = Number(decimals);

			set_vaultData({
				apiVersion: version,
				totalSupply: toNormalizedBN(totalSupply, decimals),
				pricePerShare: toNormalizedBN(pricePerShare, decimals),
				coinBalance: toNormalizedBN(coinBalance, 18),
				balanceOf: toNormalizedBN(balanceOf, decimals),
				allowance: toNormalizedBN(wantAllowance, decimals),
				balanceOfValue: (Number(ethers.utils.formatUnits(balanceOf, decimals)) * Number(ethers.utils.formatUnits(pricePerShare, decimals)) * price),
				wantBalance: toNormalizedBN(wantBalance, decimals),
				totalAUM: formatToNormalizedValue(totalSupply, numberDecimals) * price,
				decimals,
				wantPrice: price
			});
		});
	}, [vault, isActive, provider, address]);

	/**************************************************************************
	** We need to update the status when some events occurs
	**************************************************************************/
	async function	fetchApproval(): Promise<void> {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.VAULT_ADDR);
		set_vaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], provider
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function totalSupply() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)'
			], provider);
		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, totalSupply, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			provider.getBalance(address),
			vaultContract.totalSupply(),
			vaultContract.pricePerShare()
		]);
		set_vaultData((v): TVaultData => ({
			...v,
			totalSupply: toNormalizedBN(totalSupply, v.decimals),
			pricePerShare: toNormalizedBN(pricePerShare, v.decimals),
			coinBalance: toNormalizedBN(coinBalance, 18),
			balanceOf: toNormalizedBN(vaultBalance, v.decimals),
			allowance: toNormalizedBN(wantAllowance, v.decimals),
			balanceOfValue: (Number(ethers.utils.formatUnits(vaultBalance, v.decimals)) * Number(ethers.utils.formatUnits(pricePerShare, v.decimals)) * v.wantPrice),
			wantBalance: toNormalizedBN(wantBalance, v.decimals),
			totalAUM: formatToNormalizedValue(totalSupply, v.decimals) * v.wantPrice
		}));
	}

	if (!vault) {
		return null;
	}

	return (
		<section className={'mt-8 text-neutral-500'}>
			<div>
				<h1 className={'font-mono text-7xl font-semibold leading-120px text-neutral-700'}>{vault.LOGO}</h1>
				<h1 className={'font-mono text-3xl font-semibold text-neutral-700'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage />
			<section aria-label={'DETAILS'}>
				<div className={'mb-4 font-mono text-sm font-medium text-neutral-500'}>
					<div>
						<p className={'inline'}>{'Vault: '}</p>
						<a
							className={'dashed-underline-gray'}
							href={`${chainExplorer}/address/${vault.VAULT_ADDR}#code`}
							target={'_blank'}
							rel={'noreferrer'}>
							{'📃 Contract'}
						</a>
					</div>
					<div>
						<p className={'inline'}>{'Version: '}</p>
						<p className={'inline'}>{vaultData.apiVersion}</p>
					</div>
					<div>
						<p className={'inline'}>{`${vault.WANT_SYMBOL} price (CoinGecko 🦎): `}</p>
						<p className={'inline'}>{`$${vaultData.wantPrice ? formatAmount(vaultData?.wantPrice, vaultData.wantPrice < 10 ? 4 : 2) : '-'}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Deposit Limit: '}</p>
						<p className={'inline'}>{`∞ ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total Assets: '}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.totalSupply?.normalized, 2)} ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total AUM: '}</p>
						<p className={'inline'}>{`$${Number(vaultData?.totalAUM || 0) === 0 ? '-' : formatAmount(vaultData?.totalAUM, 2)}`}</p>
					</div>
				</div>
				<div className={'mb-4 font-mono text-sm font-medium text-neutral-500'}>
					<div>
						<p className={'inline'}>{'Price Per Share: '}</p>
						<p className={'inline'}>{`${vaultData.pricePerShare.normalized}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Available limit: '}</p>
						<p className={'inline'}>{`∞ ${vault.WANT_SYMBOL}`}</p>
					</div>
				</div>
			</section>

			<section aria-label={'WALLET'} className={'mt-8'}>
				<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-700'}>{'Wallet'}</h1>
				<div className={'mb-4 font-mono text-sm font-medium text-neutral-500'}>
					<div>
						<p className={'inline'}>{'Your Account: '}</p>
						<p className={'inline font-bold'}>{ens || `${truncateHex(toAddress(address), 5)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your vault shares: '}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.balanceOf.normalized, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your shares value: '}</p>
						<p className={'inline'}>{`${Number(vaultData.balanceOfValue) === 0 ? '-' : formatAmount(vaultData?.balanceOfValue, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.wantBalance.normalized, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${chainCoin} Balance: `}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.coinBalance.normalized, 2)}`}</p>
					</div>
				</div>
			</section>
			<section aria-label={'ACTIONS'} className={'my-4'}>
				<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
					<label className={'mb-1.5 font-mono text-sm font-semibold text-neutral-700'}>{'Amount'}</label>
					<div className={'flex flex-row items-center'}>
						<input
							className={'border-neutral-400 bg-neutral-0/0  px-2 py-1.5 font-mono text-xs text-neutral-500'}
							style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
							type={'number'}
							min={'0'}
							value={amount?.normalized}
							onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
								handleInputChangeEventValue(e.target.value, vaultData.decimals)
							)} />
						<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-400 px-2 py-1.5 font-mono text-xs text-neutral-400'} style={{height: '33px'}}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
					<p className={'font-mono text-sm font-medium text-neutral-500'}>{'Deposit closed.'}</p>
				</div>
				<div className={'mt-10'}>
					<button
						onClick={(): void => {
							if (isApproving) {
								return;
							}
							set_isApproving(true);
							approveToken({
								provider,
								contractAddress: toAddress(vault.WANT_ADDR),
								amount: amount?.raw?.isZero() ? ethers.constants.MaxUint256 : amount.raw,
								from: toAddress(vault.VAULT_ADDR)
							}, ({error}): void => {
								set_isApproving(false);
								if (error) {
									return;
								}
								fetchApproval();
							});
						}}
						disabled={vaultData.allowance.raw.gt(0) || isApproving}
						className={`${vaultData.allowance.raw.gt(0) || isApproving ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{vaultData.allowance.raw.gt(0) ? '✅ Approved' : '🚀 Approve Vault'}
					</button>
					<button
						onClick={(): void => {
							if (isDepositing) {
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
						}}
						disabled={vaultData.allowance.raw.isZero() || amount.raw.isZero() || isDepositing}
						className={`${vaultData.allowance.raw.isZero() || amount.raw.isZero() || isDepositing ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'🏦 Deposit'}
					</button>
					<button
						onClick={(): void => {
							if (isDepositing) {
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
						}}
						disabled={vaultData.allowance?.raw?.isZero() || isDepositing || vaultData?.wantBalance?.raw?.isZero()}
						className={`${vaultData.allowance?.raw?.isZero() || isDepositing || vaultData?.wantBalance?.raw?.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'🏦 Deposit All'}
					</button>
					<button
						onClick={(): void => {
							if (isWithdrawing) {
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
						}}
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</section>
		</section>
	);
}

export default Index;
