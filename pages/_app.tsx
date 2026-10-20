import Meta from 'components/Meta';
import Navbar from 'components/Navbar';
import {FactoryContextApp} from 'contexts/useFactory';
import {useYearnPrices} from 'hooks/useYearnPrices';
import vaults from 'utils/vaults.json';
import {arbitrum, base, fantom, gnosis, mainnet, optimism, polygon} from 'viem/chains';
import useSWR from 'swr';
import {WithYearn} from '@yearn-finance/web-lib/contexts/WithYearn';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';

import {localhost} from '../utils/wagmiChains';

import type {AppProps} from 'next/app';
import type {ReactElement} from 'react';
import type {TCoinGeckoPrices} from 'schemas/coinGeckoSchemas';
import type {TAppPrices} from 'utils/types';

import	'../style.css';

function usePrices(): TAppPrices {
	const vaultsCGIds = [...new Set(Object.values(vaults).map((vault): string => vault.COINGECKO_SYMBOL.toLowerCase()))];
	const yearnPrices = useYearnPrices();

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

	return {
		fromCoingecko: data as TCoinGeckoPrices,
		fromYearnPrices: yearnPrices.prices,
		priceServiceError: yearnPrices.error,
		missingPriceKeys: yearnPrices.missing,
		stalePriceKeys: yearnPrices.stale,
		priceErrors: yearnPrices.errors
	};

}

function App(props: AppProps): ReactElement {
	const {Component, pageProps} = props;
	const prices = usePrices();
	const unavailableCount = prices.missingPriceKeys.length + prices.stalePriceKeys.length + Object.keys(prices.priceErrors).length;

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
					{(prices.priceServiceError || unavailableCount > 0) && (
						<p role={'alert'} className={'mb-3 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900'}>
							{prices.priceServiceError
								? 'Yearn Price Service is unavailable. CoinGecko prices are used where available.'
								: `${unavailableCount} Yearn Price Service quotes are missing, stale, or unavailable. CoinGecko prices are used where available.`}
						</p>
					)}
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
				base,
				localhost
			]}
			options={{
				ui: {shouldUseThemes: false}
			}}>
			<FactoryContextApp>
				<App {...props} />
			</FactoryContextApp>
		</WithYearn>
	);
}


export default MyApp;
