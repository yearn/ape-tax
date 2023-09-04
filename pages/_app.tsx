import Meta from 'components/Meta';
import Navbar from 'components/Navbar';
import {FactoryContextApp} from 'contexts/useFactory';
import vaults from 'utils/vaults.json';
import {arbitrum, fantom, mainnet, optimism, polygon} from 'viem/chains';
import useSWR from 'swr';
import {WithYearn} from '@yearn-finance/web-lib/contexts/WithYearn';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';

import {localhost} from '../utils/wagmiChains';

import type {AppProps} from 'next/app';
import type {ReactElement} from 'react';

import	'../style.css';


function App(props: AppProps): ReactElement {
	const	{Component, pageProps} = props;
	const	vaultsCGIds = [...new Set(Object.values(vaults).map((vault): string => vault.COINGECKO_SYMBOL.toLowerCase()))];
	const	{data} = useSWR(`https://api.coingecko.com/api/v3/simple/price?ids=${vaultsCGIds}&vs_currencies=usd`, baseFetcher, {revalidateOnMount: true, revalidateOnReconnect: true, refreshInterval: 30000, shouldRetryOnError: true, dedupingInterval: 1000, focusThrottleInterval: 5000});

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
						prices={data}
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
