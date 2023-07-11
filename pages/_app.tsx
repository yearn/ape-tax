import {type ReactElement, useMemo} from 'react';
import Meta from 'components/Meta';
import Navbar from 'components/Navbar';
import {FactoryContextApp} from 'contexts/useFactory';
import vaults from 'utils/vaults.json';
import config from 'utils/wagmiConfig';
import {useConnect} from 'wagmi';
import useSWR from 'swr';
import {WithYearn} from '@yearn-finance/web-lib/contexts/WithYearn';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';

import type {AppProps} from 'next/app';
import type {TNetwork} from 'utils/types';
import type {Chain} from 'viem';

import	'../style.css';


function App(props: AppProps): ReactElement {
	const	{Component, pageProps} = props;
	const {connectors} = useConnect();
	const	vaultsCGIds = [...new Set(Object.values(vaults).map((vault): string => vault.COINGECKO_SYMBOL.toLowerCase()))];
	const	{data} = useSWR(`https://api.coingecko.com/api/v3/simple/price?ids=${vaultsCGIds}&vs_currencies=usd`, baseFetcher, {revalidateOnMount: true, revalidateOnReconnect: true, refreshInterval: 30000, shouldRetryOnError: true, dedupingInterval: 1000, focusThrottleInterval: 5000});

	const supportedNetworks = useMemo((): TNetwork[] => {
		const injectedConnector = connectors.find((e): boolean => e.id.toLowerCase() === 'injected');
		if (!injectedConnector) {
			return [];
		}
		const chainsForInjected = injectedConnector.chains;
		const noTestnet = chainsForInjected.filter(({id}): boolean => id !== 1337);
		return noTestnet.map((network: Chain): TNetwork => (
			{
				value: network.id,
				label: network.name,
				currencySymbol: network.nativeCurrency.symbol,
				blockExplorer: network.blockExplorers?.default.url ?? 'https://etherscan.io'
			}
		));
	}, [connectors]);

	return (
		<>
			<Meta />
			<main
				id={'app'}
				className={'relative p-4'}
				style={{minHeight: '100vh'}}>
				<div className={'pointer-events-auto absolute inset-x-0 top-0 z-30 px-4'}>
					<Navbar supportedNetworks={supportedNetworks} />
				</div>
				<div className={'mb-8'}>
					<Component
						router={props.router}
						prices={data}
						{...pageProps} />
				</div>
				<div className={'absolute inset-x-0 bottom-3 flex items-center justify-center font-mono text-xxs text-neutral-700'}>
					<a
						href={'https://twitter.com/ape_tax'}
						target={'_blank'}
						rel={'noreferrer'}
						className={'dashed-underline-gray cursor-pointer'}>
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
			config={config}
			options={{
				baseSettings: {yDaemonBaseURI: 'https://ydaemon.yearn.finance'},
				ui: {shouldUseThemes: false}
			}}>
			<FactoryContextApp>
				<App {...props} />
			</FactoryContextApp>
		</WithYearn>
	);
}


export default MyApp;
