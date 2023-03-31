import React, {useCallback} from 'react';
import {NextSeo} from 'next-seo';
import VaultDetails from 'components/VaultWrapper';
import useFactory from 'contexts/useFactory';
import useWindowInFocus from 'hook/useWindowInFocus';
import chains from 'utils/chains.json';
import vaults from 'utils/vaults.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useClientEffect} from '@yearn-finance/web-lib/hooks/useClientEffect';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {getProvider} from '@yearn-finance/web-lib/utils/web3/providers';

function Wrapper({vault, slug, prices}) {
	const	{provider, isActive, address, ens, chainID, openModalLogin} = useWeb3();
	const	{communityVaults} = useFactory();
	const	[currentVault, set_currentVault] = React.useState(vault);
	const	windowInFocus = useWindowInFocus();

	/* 🔵 - Yearn Finance ******************************************************
	** Trigger a suggestion to switch chain if the user is on the wrong chain
	**************************************************************************/
	const onSwitchChain = useCallback((newChainID) => {
		if (newChainID === chainID) {
			return;
		}
		if (!provider || !isActive) {
			console.error('Not initialized');
			return;
		}
		if (Number(newChainID) === 1) {
			provider.send('wallet_switchEthereumChain', [{chainId: '0x1'}]).catch((error) => console.error(error));
		} else {
			provider.send('wallet_addEthereumChain', [chains[newChainID].chain_swap, address]).catch((error) => console.error(error));
		}
	}, [isActive, address, chainID, provider]);
	useClientEffect(() => {
		if (!vault) {
			return;
		}
		if (windowInFocus && chainID !== vault.CHAIN_ID && !(chainID === 1337)) {
			onSwitchChain(vault.CHAIN_ID);
		}
	}, [chainID, onSwitchChain, vault, windowInFocus]);

	useClientEffect(() => {
		if (!vault && communityVaults !== undefined) {
			const	_currentVault = communityVaults.find((v) => v.VAULT_ADDR === toAddress(slug));
			set_currentVault(_currentVault);
		}
	}, [vault, communityVaults]);

	if (!currentVault) {
		return null;
	}

	/* 🔵 - Yearn Finance ******************************************************
	** User's wallet is not active, print something to ask him to connect first
	**************************************************************************/
	if (!isActive) {
		return (
			<section aria-label={'NO_WALLET'}>
				<NextSeo
					openGraph={{
						title: currentVault.TITLE,
						images: [
							{
								url: `https://og-image-tbouder.vercel.app/${currentVault.LOGO}.jpeg`,
								width: 1200,
								height: 1200,
								alt: 'Apes'
							}
						]
					}} />
				<div className={'mt-8 flex flex-col items-center justify-center'}>
					<p className={'font-mono text-4xl font-medium leading-11'}>{'❌🔌'}</p>
					<p className={'font-mono text-4xl font-medium leading-11 text-neutral-900'}>{'Not connected'}</p>
					<button
						onClick={openModalLogin}
						className={'bg-neutral-50 mt-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-medium transition-colors hover:bg-neutral-100'}>
						{'🔌 Connect wallet'}
					</button>
				</div>
			</section>
		);
	}

	/* 🔵 - Yearn Finance ******************************************************
	** User's wallet is connected to the wrong chain, ask him to switch
	**************************************************************************/
	if (chainID !== currentVault.CHAIN_ID && !(chainID === 1337)) {
		return (
			<section aria-label={'WRONG_CHAIN'}>
				<NextSeo
					openGraph={{
						title: currentVault.TITLE,
						images: [
							{
								url: `https://og.major.farm/${currentVault.LOGO}.jpeg`,
								width: 800,
								height: 600,
								alt: 'Apes'
							}
						]
					}} />
				<div className={'mt-8 flex flex-col items-center justify-center'}>
					<p className={'font-mono text-4xl font-medium leading-11'}>{'❌⛓'}</p>
					<p className={'font-mono text-4xl font-medium leading-11 text-neutral-900'}>{'Wrong Chain'}</p>
					<button
						onClick={() => onSwitchChain(currentVault.CHAIN_ID)}
						className={'bg-neutral-50 mt-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-medium transition-colors hover:bg-neutral-100'}>
						{'🔀 Change network'}
					</button>
				</div>
			</section>
		);
	}

	/* 🔵 - Yearn Finance ******************************************************
	** All good, render the vault data
	**************************************************************************/
	return (
		<>
			<NextSeo
				openGraph={{
					title: currentVault.TITLE,
					images: [
						{
							url: `https://og-image-tbouder.vercel.app/${currentVault.LOGO}.jpeg`,
							width: 1200,
							height: 1200,
							alt: 'Apes'
						}
					]
				}} />
			<VaultDetails
				vault={currentVault}
				provider={provider}
				getProvider={getProvider}
				address={address}
				ens={ens}
				chainID={chainID}
				prices={prices} />
		</>
	);
}


export async function getStaticPaths() {
	const	slug = Object.keys(vaults).filter(key => key !== 'yvsteth').map(key => ({params: {slug: key}})) || [];

	return	{paths: slug, fallback: true};
}

export async function getStaticProps({params}) {
	if ((params.slug.toLowerCase()).startsWith('0x')) {
		return {props: {vault: null, slug: params.slug}};
	}
	return {props: {vault: vaults[params.slug], slug: params.slug}};
}

export default Wrapper;
