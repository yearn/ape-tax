import React from 'react';
import {Toaster} from 'react-hot-toast';
import Meta from 'components/Meta';
import Navbar from 'components/Navbar';
import {BalancerGaugeContextApp} from 'contexts/useBalancerGauges';
import {FactoryContextApp} from 'contexts/useFactory';
import useSecret from 'hook/useSecret';
import vaults from 'utils/vaults.json';
import useSWR from 'swr';
import {useUI} from '@yearn-finance/web-lib/contexts/useUI';
import {WithYearn} from '@yearn-finance/web-lib/contexts/WithYearn';

import	'style/Default.css';
import	'tailwindcss/tailwind.css';

const fetcher = (...args) => fetch(...args).then(res => res.json());
const useSecretCode = () => {
	const secretCode = process.env.SECRET.split(',');
	const success = useSecret(secretCode);
	return success;
};

function	AppWrapper(props) {
	const	{Component, pageProps, router} = props;
	const	{switchTheme} = useUI();
	const	hasSecretCode = useSecretCode();
	const	vaultsCGIds = [...new Set(Object.values(vaults).map(vault => vault.COINGECKO_SYMBOL.toLowerCase()))];
	const	{data} = useSWR(`https://api.coingecko.com/api/v3/simple/price?ids=${vaultsCGIds}&vs_currencies=usd`, fetcher, {revalidateOnMount: true, revalidateOnReconnect: true, refreshInterval: 30000, shouldRetryOnError: true, dedupingInterval: 1000, focusThrottleInterval: 5000});

	return (
		<>
			<Meta />
			<main
				id={'app'}
				className={'relative p-4'}
				style={{minHeight: '100vh'}}>
				<div className={'pointer-events-auto absolute inset-x-0 top-0 z-30 px-4'}>
					<Navbar router={router} />
				</div>
				<div className={'mb-8'}>
					<Component
						key={router.route}
						element={props.element}
						router={props.router}
						prices={data}
						{...pageProps} />
				</div>
				<div className={'absolute inset-x-0 bottom-3 flex items-center justify-center font-mono text-xxs text-neutral-500'}>
					<a
						href={'https://twitter.com/ape_tax'}
						target={'_blank'}
						rel={'noreferrer'}
						className={'dashed-underline-gray cursor-pointer'}>
						{'Made with 💙 by the 🦍 community'}
					</a>
					<p className={'mx-2'}>
						{' - '}
					</p>
					<p onClick={switchTheme} className={'dashed-underline-gray cursor-pointer'}>
						{'Switch theme'}
					</p>
				</div>
				{hasSecretCode ? <div className={'absolute inset-0 z-50 bg-cover'} style={{backgroundImage: 'url("/splash_apetax.png")'}} /> : null}
				<Toaster position={'top-center'} toastOptions={{className: 'leading-4 text-xs text-neutral-500 font-semibold border border-solid border-neutral-400 font-mono bg-neutral-0 noBr noShadow toaster'}} />
			</main>
		</>
	);
}

function	MyApp(props) {
	const	{Component, pageProps} = props;
	
	return (
		<WithYearn
			options={{
				ui: {
					shouldUseThemes: true,
					shouldUseDefaultToaster: false
				}
			}}>
			<BalancerGaugeContextApp>
				<FactoryContextApp>
					<AppWrapper
						Component={Component}
						pageProps={pageProps}
						element={props.element}
						router={props.router} />
				</FactoryContextApp>
			</BalancerGaugeContextApp>
		</WithYearn>
	);
}


export default MyApp;
