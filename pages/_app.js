/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				_app.js
******************************************************************************/

import	React							from	'react';
import	Head							from	'next/head';
import	{Toaster}						from	'react-hot-toast';
import	useSWR							from	'swr';
import	{DefaultSeo}					from	'next-seo';
import	{Web3ReactProvider}				from	'@web3-react-fork/core';
import	{ethers}						from	'ethers';
import	{Web3ContextApp}				from	'contexts/useWeb3';
import	Navbar							from	'components/Navbar';
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
	const	hasSecretCode = useSecretCode();
	const	WEBSITE_URI = process.env.WEBSITE_URI;
	const	vaultsCGIds = [...new Set(Object.values(vaults).map(vault => vault.COINGECKO_SYMBOL.toLowerCase()))];
	const	{data} = useSWR(`https://api.coingecko.com/api/v3/simple/price?ids=${vaultsCGIds}&vs_currencies=usd`, fetcher, {revalidateOnMount: true, revalidateOnReconnect: true, refreshInterval: 30000, shouldRetryOnError: true, dedupingInterval: 1000, focusThrottleInterval: 5000});

	return (
		<>
			<Head>
				<title>{'Experimental Experiments Registry'}</title>
				<link rel={'icon'} href={'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>'} />
				<meta httpEquiv={'X-UA-Compatible'} content={'IE=edge'} />
				<meta name={'viewport'} content={'width=device-width, initial-scale=1'} />
				<meta name={'description'} content={'Experimental Experiments Registry'} />
				<meta name={'msapplication-TileColor'} content={'#9fcc2e'} />
				<meta name={'theme-color'} content={'#ffffff'} />
				<meta charSet={'utf-8'} />
				<link rel={'preconnect'} href={'https://fonts.googleapis.com'} />
				<link rel={'preconnect'} href={'https://fonts.gstatic.com'} crossOrigin={'true'} />
				<link href={'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap'} rel={'stylesheet'} />

				<meta name={'robots'} content={'index,nofollow'} />
				<meta name={'googlebot'} content={'index,nofollow'} />
				<meta charSet={'utf-8'} />
			</Head>
			<DefaultSeo
				title={'Experimental Experiments Registry'}
				defaultTitle={'Experimental Experiments Registry'}
				description={'Experimental Experiments Registry'}
				openGraph={{
					type: 'website',
					locale: 'en_US',
					url: WEBSITE_URI,
					site_name: 'ape.tax',
					title: 'ape.tax',
					description: 'Experimental Experiments Registry',
					images: [
						{
							url: `${WEBSITE_URI}og.jpg`,
							width: 1200,
							height: 675,
							alt: 'Apes',
						}
					]
				}}
				twitter={{
					handle: '@ape_tax',
					site: '@ape_tax',
					cardType: 'summary_large_image',
				}} />
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
				<div className={'absolute bottom-3 font-mono text-xxs left-0 right-0 flex justify-center items-center text-ygray-600'}>
					<a href={'https://twitter.com/ape_tax'} target={'_blank'} rel={'noreferrer'} className={'dashed-underline-gray'}>
						{'Made with 💙 by the 🦍 community'}
					</a>
				</div>
				{hasSecretCode ? <div className={'absolute inset-0 z-50 bg-cover'} style={{backgroundImage: 'url("/splash_apetax.png")'}} /> : null}
				<Toaster position={'top-center'} toastOptions={{className: 'font-mono text-ygray-700 font-medium text-sm border border-solid border-ygray-200 bg-white noBr shadow-xl'}} />
			</main>
		</>
	);
}

const getLibrary = (provider) => {
	return new ethers.providers.Web3Provider(provider);
};

function	MyApp(props) {
	const	{Component, pageProps} = props;
	
	return (
		<Web3ReactProvider getLibrary={getLibrary}>
			<Web3ContextApp>
				<AppWrapper
					Component={Component}
					pageProps={pageProps}
					element={props.element}
					router={props.router} />
			</Web3ContextApp>
		</Web3ReactProvider>
	);
}


export default MyApp;
