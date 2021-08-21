/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Sunday June 13th 2021
**	@Filename:				_app.js
******************************************************************************/

import	React							from	'react';
import	Head							from	'next/head';
import	{Web3ReactProvider}				from	'@web3-react/core';
import	{ethers}						from	'ethers';
import	{Web3ContextApp}				from	'contexts/useWeb3';
import	Navbar							from	'components/Navbar';
import	useSecret						from	'hook/useSecret';

import	'style/Default.css';
import	'tailwindcss/tailwind.css';

const useSecretCode = () => {
	const secretCode = process.env.SECRET.split(',');
	const success = useSecret(secretCode);
	return success;
};

function	AppWrapper(props) {
	const	{Component, pageProps, router} = props;
	const	hasSecretCode = useSecretCode();

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
			</Head>
			<main id={'app'} className={'p-4 relative'} style={{minHeight: '100vh'}}>
				<div className={'z-30 pointer-events-auto absolute top-0 left-0 right-0 px-4'}>
					<Navbar router={router} />
				</div>
				<div className={'mb-8'}>
					<Component
						key={router.route}
						element={props.element}
						router={props.router}
						{...pageProps} />
				</div>
				<div className={'absolute bottom-3 font-mono text-xxs left-0 right-0 flex justify-center items-center text-ygray-600'}>
					{'Made with 💙 by the 🦍 community'}
				</div>
				{hasSecretCode ? <div className={'absolute inset-0 z-50 bg-cover'} style={{backgroundImage: 'url("/splash_apetax.png")'}} /> : null}
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
