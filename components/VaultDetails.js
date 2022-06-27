import	React, {useState, useEffect}	from	'react';
import	axios							from	'axios';
import	useSWR							from	'swr';
import	{useWeb3}						from	'@yearn-finance/web-lib/contexts';
import	Suspense						from	'components/Suspense';
import	ProgressChart					from	'components/ProgressChart';
import	chains							from	'utils/chains.json';
import	{formatAmount}					from	'utils';

const		fetcher = url => axios.get(url).then(res => res.data);
function	VaultDetails({vault, vaultData}) {
	const	{chainID} = useWeb3();
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	{data: vaultAPYSWR} = useSWR(`/api/specificApy?address=${vault?.VAULT_ADDR}&network=${chainID === 1337 ? chainID : vault?.CHAIN_ID}`, fetcher, {revalidateOnMount: true, revalidateOnReconnect: true, shouldRetryOnError: true});
	const	[vaultAPY, set_vaultAPY] = useState(null);

	useEffect(() => {
		set_vaultAPY(vaultAPYSWR);
	}, [vaultAPYSWR]);

	return (
		<section aria-label={'DETAILS'}>
			<div className={'font-mono text-neutral-500 font-medium text-sm mb-4'}>
				<div>
					<p className={'inline text-neutral-700'}>{'Vault: '}</p>
					<a
						className={'dashed-underline-gray text-neutral-500'}
						href={`${chainExplorer}/address/${vault.VAULT_ADDR}#code`} target={'_blank'} rel={'noreferrer'}>
						{'📃 Contract'}
					</a>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Version: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>{vaultData.apiVersion}</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`${vault.WANT_SYMBOL} price (${vault.PRICE_SOURCE ? vault.PRICE_SOURCE : 'CoinGecko 🦎'}): `}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`$${vaultData.wantPrice ? formatAmount(vaultData.wantPrice, vaultData.wantPrice < 10 ? 4 : 2) : '-'}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Deposit Limit: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`${vaultData.depositLimit === -1 ? '-' : formatAmount(vaultData?.depositLimit || 0, 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Total Assets: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`${formatAmount(vaultData?.totalAssets || 0, 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Total AUM: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`$${vaultData.totalAUM === 'NaN' ? '-' : formatAmount(vaultData.totalAUM, 2)}`}
						</Suspense>
					</p>
				</div>
			</div>
			<div className={`font-mono text-neutral-500 font-medium text-sm mb-4 ${vault.VAULT_STATUS === 'withdraw' || vault.CHAIN_ID === 56 ? 'hidden' : ''}`}>
				<div>
					<p className={'inline text-neutral-700'}>{'Gross APR (last week): '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultAPY}>
							{`${vaultAPY?.week || '-'}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Gross APR (last month): '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultAPY}>
							{`${vaultAPY?.month || '-'}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Gross APR (inception): '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultAPY}>
							{`${vaultAPY?.inception || '-'}`}
						</Suspense>
					</p>
				</div>
			</div>
			<div className={'font-mono text-neutral-500 font-medium text-sm mb-4'}>
				<div>
					<p className={'inline text-neutral-700'}>{'Price Per Share: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`${vaultData.pricePerShare}`}
						</Suspense>
					</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Available limit: '}</p>
					<p className={'inline text-neutral-500'}>
						<Suspense wait={!vaultData.loaded}>
							{`${formatAmount(vaultData.availableDepositLimit || 0 , 2)} ${vault.WANT_SYMBOL}`}
						</Suspense>
					</p>
				</div>
				<div className={'progress-bar'}>
					<span className={'bg-neutral-0 text-neutral-900 -ml-2 mr-2 hidden md:inline'}>
							&nbsp;{'['}&nbsp;
						<ProgressChart progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress} width={50} />
							&nbsp;{']'}&nbsp;
					</span>
					<span className={'bg-neutral-0 text-neutral-900 -ml-2 mr-2 inline md:hidden'}>
							&nbsp;{'['}&nbsp;
						<ProgressChart progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress} width={30} />
							&nbsp;{']'}&nbsp;
					</span>
					{`${vault.VAULT_STATUS === 'withdraw' ? '100' : (vaultData.progress * 100).toFixed(2)}%`}
				</div>
			</div>
		</section>
	);
}

export default VaultDetails;