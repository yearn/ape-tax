/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				_app.js
******************************************************************************/

import	React							from	'react';
import	{Toaster}						from	'react-hot-toast';
import	useSWR							from	'swr';
import	{WithYearn, useUI}				from	'@yearn-finance/web-lib/contexts';
import	{FactoryContextApp}				from	'contexts/useFactory';
import	{BalancerGaugeContextApp}		from	'contexts/useBalancerGauges';
import	Navbar							from	'components/Navbar';
import	Meta							from	'components/Meta';
import	useSecret						from	'hook/useSecret';
import	vaults							from	'utils/vaults.json';

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
			<main id={'app'} className={'p-4 relative'} style={{minHeight: '100vh'}}>
				<div className={'z-30 pointer-events-auto absolute top-0 left-0 right-0 px-4'}>
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
				<div className={'absolute bottom-3 font-mono text-xxs left-0 right-0 flex justify-center items-center text-neutral-500'}>
					<a href={'https://twitter.com/ape_tax'} target={'_blank'} rel={'noreferrer'} className={'dashed-underline-gray cursor-pointer'}>
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
		<WithYearn options={{
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
