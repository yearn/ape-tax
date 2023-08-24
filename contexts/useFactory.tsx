import {createContext, type ReactElement, useCallback, useContext, useEffect, useState} from 'react';
import BALANCER_FACTORY_ABI from 'utils/ABI/balancerFactory.abi';
import {multicall, readContract} from '@wagmi/core';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';

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
const FactoryContext = createContext<TFactoryContext>({
	communityVaults: [],
	getCommunityVaults: async (): Promise<void> => undefined,
	useFactoryNonce: 0
});

export const FactoryContextApp = ({children}: {children: ReactElement}): ReactElement => {
	const {safeChainID} = useChainID();
	const [communityVaults, set_communityVaults] = useState<TVault[]>([]);
	const [nonce, set_nonce] = useState(0);

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

		const BALANCER_FACTORY_ADDRESS = toAddress(process.env.YEARN_BALANCER_FACTORY_ADDRESS);

		const numVaults = await readContract({
			address: BALANCER_FACTORY_ADDRESS,
			abi: BALANCER_FACTORY_ABI,
			functionName: 'numVaults'
		});

		const vaultListCalls = [];
		for (let i = 0; i < Number(numVaults); i++) {
			const balancerFactoryContract = {address: BALANCER_FACTORY_ADDRESS, abi: BALANCER_FACTORY_ABI};
			vaultListCalls.push({...balancerFactoryContract, functionName: 'deployedVaults', args: [i]});
		}

		const deployedVaults = await multicall({contracts: vaultListCalls, chainId: safeChainID});
		const vaultDetailsCalls = [];
		for (const vault of deployedVaults) {
			const VAULT_ADDRESS = toAddress(vault.result as string);
			const vaultContract = {address: VAULT_ADDRESS, abi: VAULT_ABI};
			vaultDetailsCalls.push({...vaultContract, functionName: 'name'});
			vaultDetailsCalls.push({...vaultContract, functionName: 'symbol'});
			vaultDetailsCalls.push({...vaultContract, functionName: 'token'});
		}

		const vaultDetails = await multicall({contracts: vaultDetailsCalls, chainId: safeChainID});
		const vaults: TVault[] = [];
		let		rIndex = 0;
		for (let i = 0; i < numVaults; i++) {
			const name = vaultDetails[rIndex++].result as string;
			const symbol = vaultDetails[rIndex++].result as string;
			const token = vaultDetails[rIndex++].result as string;
			vaults.push({
				LOGO: '🦍🦍',
				VAULT_ABI: 'yVaultV2',
				VAULT_TYPE: 'community',
				VAULT_ADDR: toAddress(deployedVaults[i].result as string),
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
	}, [safeChainID]);

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
