import React, {useCallback, useState} from 'react';
import {NextSeo} from 'next-seo';
import VaultWrapper from 'components/VaultWrapper';
import {useFactory} from 'contexts/useFactory';
import useWindowInFocus from 'hook/useWindowInFocus';
import vaults from 'utils/vaults.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useClientEffect} from '@yearn-finance/web-lib/hooks/useClientEffect';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {GetStaticPathsResult} from 'next';
import type {ReactElement} from 'react';
import type {TVault} from 'utils/types';
import type {TDict} from '@yearn-finance/web-lib/types';

function	Wrapper({vault, slug, prices}: {vault: TVault, slug: string, prices: any}): ReactElement | null {
	const	{provider, isActive, address, chainID, openLoginModal} = useWeb3();
	const	{communityVaults} = useFactory();
	const	[currentVault, set_currentVault] = useState(vault);
	const	isWindowInFocus = useWindowInFocus();

	/* 🔵 - Yearn Finance ******************************************************
	** Trigger a suggestion to switch chain if the user is on the wrong chain
	**************************************************************************/
	const onSwitchChain = useCallback((newChainID: number): void => {
		if (newChainID === chainID) {
			return;
		}
		if (!provider || !isActive) {
			console.error('Not initialized');
			return;
		}
		if (Number(newChainID) === 1) {
			provider.send('wallet_switchEthereumChain', [{chainId: '0x1'}]).catch((error: string): void => console.error(error));
		} else {
			provider.send('wallet_addEthereumChain', [CHAINS[newChainID]?.chain_swap, address]).catch((error: string): void => console.error(error));
		}
	}, [isActive, address, chainID, provider]);

	useClientEffect((): void => {
		if (!vault) {
			return;
		}
		if (isWindowInFocus && chainID !== vault.CHAIN_ID && !(chainID === 1337)) {
			onSwitchChain(vault.CHAIN_ID);
		}
	}, [chainID, onSwitchChain, vault, isWindowInFocus]);

	useClientEffect((): void => {
		if (!vault && communityVaults !== undefined) {
			const	_currentVault = communityVaults.find((v: TVault): boolean => v.VAULT_ADDR === toAddress(slug));
			if (_currentVault) {
				set_currentVault(_currentVault);
			}
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
					<p className={'font-mono text-4xl font-medium leading-11 text-neutral-700'}>{'Not connected'}</p>
					<button
						onClick={openLoginModal}
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
					<p className={'font-mono text-4xl font-medium leading-11 text-neutral-700'}>{'Wrong Chain'}</p>
					<button
						onClick={(): void => onSwitchChain(currentVault.CHAIN_ID)}
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
			<VaultWrapper
				vault={currentVault}
				prices={prices} />
		</>
	);
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
	const	slug = Object.keys(vaults).map((key): any => ({params: {slug: key}})) || [];
	return	{paths: slug, fallback: true};
}

export async function getStaticProps({params}: {params: {slug: string}}): Promise<any> {
	if ((params.slug.toLowerCase()).startsWith('0x')) {
		return {props: {vault: null, slug: params.slug}};
	}
	return {props: {vault: (vaults as TDict<TVault>)[params.slug], slug: params.slug}};
}

export default Wrapper;
