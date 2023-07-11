import {chains} from 'utils/chains';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';

import type {TNDict} from '@yearn-finance/web-lib/types';
import type {TChain} from '@yearn-finance/web-lib/utils/web3/chains';

type TUseChainReturn = {
	get: (chainID: number) => TChain | null;
	getCurrent: () => TChain | null;
	getAll: () => TNDict<TChain>;
}

/* 🔵 - Yearn Finance ******************************************************
** This hook can be used to grab details about a network.
** It will return details of the network.
**************************************************************************/
export function useChain(): TUseChainReturn {
	const {safeChainID} = useChainID();

	return {
		get: (chainID: number): TChain | null => {
			return chains[chainID] ? chains[chainID] : null;
		},
		getCurrent: (): TChain | null => {
			return chains[safeChainID] ? chains[safeChainID] : null;
		},
		getAll: (): TNDict<TChain> => chains
	};
}
