import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Contract} from 'ethcall';
import VAULT_FACTORY_ABI from 'utils/ABI/vaultFactory.abi';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {ReactElement} from 'react';
import type {TVault} from 'utils/types';

type TFactoryContext = {
	communityVaults: TVault[],
	getCommunityVaults: () => Promise<void>,
	useFactoryNonce: number
}
/* 🔵 - Yearn Finance **********************************************************
** The Factory Context is used to retrieve the list of community vaults
** deployed via the Balancer Factory contract.
******************************************************************************/
const	FactoryContext = createContext<TFactoryContext>({
	communityVaults: [],
	getCommunityVaults: async (): Promise<void> => undefined,
	useFactoryNonce: 0
});

export const FactoryContextApp = ({children}: {children: ReactElement}): ReactElement => {
	const	{provider} = useWeb3();
	const	{safeChainID} = useChainID();
	const	[communityVaults, set_communityVaults] = useState<TVault[]>([]);
	const	[nonce, set_nonce] = useState(0);

	/* 🔵 - Yearn Finance ******************************************************
	**	getCommunityVaults will fetch the currently deployed community vaults
	***************************************************************************/
	const getCommunityVaults = useCallback(async (): Promise<void> => {
		if (safeChainID !== 1) {
			performBatchedUpdates((): void => {
				set_communityVaults([]);
				set_nonce((n): number => n + 1);
			});
			return;
		}
		let		currentProvider = provider || getProvider(safeChainID);
		if (currentProvider?.network?.chainId !== 1) {
			currentProvider = getProvider(safeChainID);
		}
		const	ethcallProvider = await newEthCallProvider(currentProvider);

		const	contract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS as string, VAULT_FACTORY_ABI as never);
		const	[numVaults] = await ethcallProvider.tryAll([contract.numVaults()]) as [number];

		const	vaultListCalls = [];
		for (let i = 0; i < numVaults; i++) {
			vaultListCalls.push(contract.deployedVaults(i));
		}
		const	deployedVaults = await ethcallProvider.tryAll(vaultListCalls) as string[];

		const	vaultDetailsCalls = [];
		for (const vault of deployedVaults) {
			const	vaultContract = new Contract(vault, VAULT_ABI as never);
			vaultDetailsCalls.push(vaultContract.name());
			vaultDetailsCalls.push(vaultContract.symbol());
			vaultDetailsCalls.push(vaultContract.token());
		}
		const	vaultDetails = await ethcallProvider.tryAll(vaultDetailsCalls);

		const	vaults: TVault[] = [];
		let		rIndex = 0;
		for (let i = 0; i < numVaults; i++) {
			const	name = vaultDetails[rIndex++] as string;
			const	symbol = vaultDetails[rIndex++] as string;
			const	token = vaultDetails[rIndex++] as string;
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

		performBatchedUpdates((): void => {
			set_communityVaults(vaults);
			set_nonce((n): number => n + 1);
		});
	}, [provider, safeChainID]);

	useEffect((): void => {
		getCommunityVaults();
	}, [getCommunityVaults]);

	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	return (
		<FactoryContext.Provider
			value={{
				communityVaults,
				getCommunityVaults,
				useFactoryNonce: nonce
			}}>
			{children}
		</FactoryContext.Provider>
	);
};


export const useFactory = (): TFactoryContext => useContext(FactoryContext);
export default useFactory;
