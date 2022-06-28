import	React, {useCallback}				from	'react';
import	{NextSeo}							from	'next-seo';
import	{useWeb3}							from	'@yearn-finance/web-lib/contexts';
import	{useClientEffect}					from	'@yearn-finance/web-lib/hooks';
import	{toAddress, providers}				from	'@yearn-finance/web-lib/utils';
import	VaultDetails						from	'components/VaultWrapper';
import	useFactory							from	'contexts/useFactory';
import	useWindowInFocus					from	'hook/useWindowInFocus';
import	vaults								from	'utils/vaults.json';
import	chains								from	'utils/chains.json';

function	Wrapper({vault, slug, prices}) {
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
								alt: 'Apes',
							}
						]
					}} />
				<div className={'flex flex-col justify-center items-center mt-8'}>
					<p className={'text-4xl font-mono font-medium leading-11'}>{'❌🔌'}</p>
					<p className={'text-4xl font-mono font-medium text-neutral-700 leading-11'}>{'Not connected'}</p>
					<button
						onClick={openModalLogin}
						className={'bg-neutral-50 hover:bg-neutral-100 transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-medium mt-8'}>
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
								alt: 'Apes',
							}
						]
					}} />
				<div className={'flex flex-col justify-center items-center mt-8'}>
					<p className={'text-4xl font-mono font-medium leading-11'}>{'❌⛓'}</p>
					<p className={'text-4xl font-mono font-medium text-neutral-700 leading-11'}>{'Wrong Chain'}</p>
					<button
						onClick={() => onSwitchChain(currentVault.CHAIN_ID)}
						className={'bg-neutral-50 hover:bg-neutral-100 transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-medium mt-8'}>
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
							alt: 'Apes',
						}
					]
				}} />
			<VaultDetails
				vault={currentVault}
				provider={provider}
				getProvider={providers.getProvider}
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
