import {Fragment, useCallback, useEffect, useState} from 'react';
import ProgressChart from 'components/ProgressChart';
import Suspense from 'components/Suspense';
import APR_ORACLE_V3_ABI from 'utils/ABI/yAPROracleV3.abi';
import {maxUint256} from 'viem';
import {useNetwork} from 'wagmi';
import useSWR from 'swr';
import {readContract} from '@wagmi/core';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';
import {formatToNormalizedValue} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';

import type {ReactElement} from 'react';
import type {Maybe, TSpecificAPIResult, TVault, TVaultData} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';

function	VaultDetails({vault, vaultData}: {vault: TVault, vaultData: TVaultData}): ReactElement {
	const	{chain} = useNetwork();
	const	chainExplorer = chain?.blockExplorers?.default?.url || 'https://etherscan.io';
	const	aprOracleForChain = (process?.env?.APR_ORACLE_V3 as TNDict<string>)[vault.CHAIN_ID];

	const	{data: vaultAPYSWR, isLoading} = useSWR<Maybe<TSpecificAPIResult>>(`/api/specificApy?address=${vault?.VAULT_ADDR}&network=${vault?.CHAIN_ID}`, baseFetcher, {revalidateOnMount: true, revalidateOnReconnect: true, shouldRetryOnError: true});

	const	[vaultAPY, set_vaultAPY] = useState<Maybe<TSpecificAPIResult>>(null);
	const	[oracleAPY, set_oracleAPY] = useState<number>(0);

	const	fetchOracleData = useCallback(async (): Promise<void> => {
		if(vault.VAULT_ABI.startsWith('v3') && aprOracleForChain){

			const currentAPR = await readContract({
				abi: APR_ORACLE_V3_ABI,
				address: toAddress(aprOracleForChain),
				functionName: 'getCurrentApr',
				args: [toAddress(vault.VAULT_ADDR)]
			}) as bigint;

			const apySnapshot = formatToNormalizedValue(currentAPR, 18) * 100;
		
			set_oracleAPY(apySnapshot);
		}
	}, [aprOracleForChain, vault.VAULT_ABI, vault.VAULT_ADDR]);

	useEffect((): void => { 
		set_vaultAPY(vaultAPYSWR);
		fetchOracleData();
	}, [fetchOracleData, vaultAPYSWR, vaultData.totalAssets]);

	return (
		<section aria-label={'DETAILS'}>
			<div className={'mb-4 text-sm font-medium'}>
				<div>
					<p className={'inline text-neutral-900'}>{'Vault: '}</p>
					<a
						className={'dashed-underline-gray ml-3'}
						href={`${chainExplorer}/address/${vault.VAULT_ADDR}#code`}
						target={'_blank'}
						rel={'noreferrer'}>
						{'📃 Contract'}
					</a>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Version: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>{vaultData.apiVersion}</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`${vault.WANT_SYMBOL} price (${vault?.PRICE_SOURCE ? vault.PRICE_SOURCE : 'CoinGecko 🦎'}): `}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{`$${vaultData.wantPrice ? formatAmount(vaultData.wantPrice, vaultData.wantPrice < 10 ? 4 : 2) : '-'}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Deposit Limit: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{isZero(vaultData.depositLimit.raw) ? '-' :
								vaultData.depositLimit.raw === (maxUint256 - 1n) ? `∞ ${vault.WANT_SYMBOL}` :
									`${formatAmount(vaultData?.depositLimit.normalized, 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Total Assets: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{`${formatAmount(vaultData?.totalAssets.normalized, 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Total AUM: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{`$${vaultData.totalAUM === 0 ? '-' : formatAmount(vaultData.totalAUM, 2)}`}
						</Suspense>
					</p>
				</div>
			</div>

			<div className={`mb-4 text-sm font-medium ${vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}`}>
				{oracleAPY > 0 ? (
					<div>
						<p className={'inline text-neutral-900'}>{'V3 Oracle APR (current snapshot): '}</p>
						<p className={'ml-3 inline text-neutral-700'}>
							{`${formatAmount(oracleAPY, 2, 6)} %`}
						</p>
					</div>
				) : (
					<>
						<div>
							<p className={'inline text-neutral-900'}>{'Gross APR (last week): '}</p>
							<p className={'ml-3 inline'}>
								<Suspense wait={!vaultAPY && isLoading}>
									{`${vaultAPY?.week || '-'}`}
								</Suspense>
							</p>
						</div>
						<div>
							<p className={'inline text-neutral-900'}>{'Gross APR (last month): '}</p>
							<p className={'ml-3 inline'}>
								<Suspense wait={!vaultAPY && isLoading}>
									{`${vaultAPY?.month || '-'}`}
								</Suspense>
							</p>
						</div>
						<div>
							<p className={'inline text-neutral-900'}>{'Gross APR (inception): '}</p>
							<p className={'ml-3 inline'}>
								<Suspense wait={!vaultAPY && isLoading}>
									{`${vaultAPY?.inception || '-'}`}
								</Suspense>
							</p>
						</div>
					</>
				)}
			</div>
			
			<div className={'mb-4 text-sm font-medium'}>
				<div>
					<p className={'inline text-neutral-900'}>{'Price Per Share: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{`${vaultData.pricePerShare.normalized}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Available limit: '}</p>
					<p className={'ml-3 inline'}>
						<Suspense wait={!vaultData.loaded}>
							{isZero(vaultData.availableDepositLimit.raw) ? '-' :
								vaultData.availableDepositLimit.raw === (maxUint256 - 1n) ? `∞ ${vault.WANT_SYMBOL}` :
									`${formatAmount(vaultData?.availableDepositLimit.normalized, 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>

				{vaultData.progress > 0 ? (				
					<div className={'progress-bar'}>
						<span className={'-ml-2 mr-2 hidden md:inline'}>
							&nbsp;{'['}&nbsp;
							<ProgressChart
								progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress}
								width={50} />
							&nbsp;{']'}&nbsp;
						</span>
						<span className={'-ml-2 mr-2 inline md:hidden'}>
							&nbsp;{'['}&nbsp;
							<ProgressChart
								progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress}
								width={30} />
							&nbsp;{']'}&nbsp;
						</span>
						{`${vault.VAULT_STATUS === 'withdraw' ? '100' : (vaultData.progress * 100).toFixed(2)}%`}
					</div>) : <Fragment/>}
			</div>
		</section>
	);
}

export default VaultDetails;
