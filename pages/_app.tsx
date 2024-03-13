import Meta from 'components/Meta';
import Navbar from 'components/Navbar';
import {FactoryContextApp} from 'contexts/useFactory';
import {useFetch} from 'hooks/useFetch';
import {useYDaemonBaseURI} from 'hooks/useYDaemonBaseURI';
import {yDaemonPricesChainSchema} from 'schemas/yDaemonPricesSchema';
import vaults from 'utils/vaults.json';
import {arbitrum, fantom, mainnet, gnosis, optimism, polygon} from 'viem/chains';
import useSWR from 'swr';
import {WithYearn} from '@yearn-finance/web-lib/contexts/WithYearn';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';

import {localhost} from '../utils/wagmiChains';

import type {AppProps} from 'next/app';
import type {ReactElement} from 'react';
import type {TCoinGeckoPrices} from 'schemas/coinGeckoSchemas';
import type {TYDaemonPrices, TYDaemonPricesChain} from 'schemas/yDaemonPricesSchema';

import	'../style.css';

function usePrices(): {fromCoingecko: TCoinGeckoPrices; fromYDaemon: TYDaemonPrices;} {
	const {safeChainID} = useChainID();
	const {yDaemonBaseUri: yDaemonBaseUriWithoutChain} = useYDaemonBaseURI();
	const vaultsCGIds = [...new Set(Object.values(vaults).map((vault): string => vault.COINGECKO_SYMBOL.toLowerCase()))];

	const {data: prices} = useFetch<TYDaemonPricesChain>({
		endpoint: `${yDaemonBaseUriWithoutChain}/prices/all`,
		schema: yDaemonPricesChainSchema
	});

	const {data} = useSWR(
		`https://api.coingecko.com/api/v3/simple/price?ids=${vaultsCGIds}&vs_currencies=usd`,
		baseFetcher,
		{
			revalidateOnMount: true,
			revalidateOnReconnect: true,
			refreshInterval: 30000,
			shouldRetryOnError: true,
			dedupingInterval: 1000,
			focusThrottleInterval: 5000
		}
	);

	return {fromCoingecko: data as TCoinGeckoPrices, fromYDaemon: prices?.[safeChainID] || {}};

}

function App(props: AppProps): ReactElement {
	const {Component, pageProps} = props;
	const prices = usePrices();

	return (
		<>
			<Meta />
			<main
				id={'app'}
				className={'relative p-4'}
				style={{minHeight: '100vh'}}>
				<div className={'pointer-events-auto absolute inset-x-0 top-0 z-30 px-4'}>
					<Navbar />
				</div>
				<div className={'mb-8'}>
					<Component
						router={props.router}
						prices={prices}
						{...pageProps} />
				</div>
				<div className={'absolute inset-x-0 bottom-3 flex items-center justify-center text-xxs text-neutral-700'}>
					<a
						href={'https://twitter.com/ape_tax'}
						target={'_blank'}
						rel={'noreferrer'}
						className={'dashed-underline-gray'}>
						{'Made with 💙 by the 🦍 community'}
					</a>
				</div>
			</main>
		</>
	);
}

function	MyApp(props: AppProps): ReactElement {
	return (
		<WithYearn
			supportedChains={[
				mainnet,
				optimism,
				polygon,
				fantom,
				arbitrum,
				gnosis,
				localhost
			]}
			options={{
				baseSettings: {
					yDaemonBaseURI: (process.env.YDAEMON_BASE_URI as string) || 'https://ydaemon.yearn.fi'
				},
				ui: {shouldUseThemes: false}
			}}>
			<FactoryContextApp>
				<App {...props} />
			</FactoryContextApp>
		</WithYearn>
	);
}


export default MyApp;
