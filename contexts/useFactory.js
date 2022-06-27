import	React, {useContext, createContext}				from	'react';
import	{Contract}										from	'ethcall';
import	{useWeb3}										from	'@yearn-finance/web-lib/contexts';
import	{providers, performBatchedUpdates, toAddress}	from	'@yearn-finance/web-lib/utils';
import	FACTORY_ABI										from	'utils/ABI/factory.abi';
import	YVAULT_ABI										from	'utils/ABI/yVault.abi';

/* 🔵 - Yearn Finance **********************************************************

******************************************************************************/
const	FactoryContext = createContext();
export const FactoryContextApp = ({children}) => {
	const	{provider, chainID} = useWeb3();
	const	[communityVaults, set_communityVaults] = React.useState(undefined);
	const	[nonce, set_nonce] = React.useState(0);

	/* 🔵 - Yearn Finance ******************************************************
	**	
	***************************************************************************/
	const getWalletStatus = React.useCallback(async () => {
		const	currentProvider = provider || providers.getProvider(chainID || 1337);
		const	ethcallProvider = await providers.newEthCallProvider(currentProvider);

		const	contract = new Contract(process.env.BALANCER_GLOBAL_ADDRESS, FACTORY_ABI);
		const	[numVaults] = await ethcallProvider.tryAll([contract.numVaults()]);

		const	vaultListCalls = [];
		for (let i = 0; i < numVaults; i++) {
			vaultListCalls.push(contract.deployedVaults(i));
		}
		const	deployedVaults = await ethcallProvider.tryAll(vaultListCalls);

		const	vaultDetailsCalls = [];
		for (const vault of deployedVaults) {
			const	vaultContract = new Contract(vault, YVAULT_ABI);
			vaultDetailsCalls.push(vaultContract.name());
			vaultDetailsCalls.push(vaultContract.symbol());
			vaultDetailsCalls.push(vaultContract.token());
		}
		const	vaultDetails = await ethcallProvider.tryAll(vaultDetailsCalls);

		const	vaults = [];
		let		rIndex = 0;
		for (let i = 0; i < numVaults; i++) {
			const	name = vaultDetails[rIndex++];
			const	symbol = vaultDetails[rIndex++];
			const	token = vaultDetails[rIndex++];
			vaults.push({
				LOGO: '🦍🦍',
				VAULT_ABI: 'yVaultV2',
				VAULT_TYPE: 'community',
				VAULT_ADDR: toAddress(deployedVaults[i]),
				TITLE: name,
				SYMBOL: symbol,
				WANT_ADDR: toAddress(token),
				WANT_SYMBOL: symbol.replace('yvBlp', ''),
				COINGECKO_SYMBOL: '',
				VAULT_STATUS: 'active',
				CHAIN_ID: 1,
				PRICE_SOURCE: 'Lens 🔮'
			});
		}

		performBatchedUpdates(() => {
			set_communityVaults(vaults);
			set_nonce((n) => n + 1);
		});
	}, [provider, chainID]);

	React.useEffect(() => {
		getWalletStatus();
	}, [getWalletStatus]);


	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	return (
		<FactoryContext.Provider
			value={{
				communityVaults,
				useFactoryNonce: nonce
			}}>
			{children}
		</FactoryContext.Provider>
	);
};


export const useFactory = () => useContext(FactoryContext);
export default useFactory;