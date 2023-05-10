import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Contract} from 'ethcall';
import {request} from 'graphql-request';
import AURA_BOOSTER_ABI from 'utils/ABI/auraBooster.abi.json';
import FACTORY_ABI from 'utils/ABI/factory.abi.json';
import YVAULT_ABI from 'utils/ABI/yVault.abi.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {ReactElement} from 'react';
import type {TGauge} from 'utils/types';

type TBalancerGaugesContext = {
	balancerGauges: TGauge[],
	useBalancerGaugeNonce: number
}
type TListOfGauges = {
	gauges: {
		address: string,
		type: {
			name: string
		}
	}[]
}
/* 🔵 - Yearn Finance **********************************************************
** BalancerGauge is used to retrieve the list of gauges available through
** the Balancer ecosystem.
******************************************************************************/
const	BalancerGaugeContext = createContext<TBalancerGaugesContext>({
	balancerGauges: [],
	useBalancerGaugeNonce: 0
});

export const BalancerGaugeContextApp = ({children}: {children: ReactElement}): ReactElement => {
	const	{provider} = useWeb3();
	const	{safeChainID} = useChainID();
	const	[balancerGauges, set_balancerGauges] = useState<TGauge[]>([]);
	const	[nonce, set_nonce] = useState(0);

	/* 🔵 - Yearn Finance ******************************************************
	**	getBalanceGauges will perform a graphQL query to the balancer subgraph
	**	to retrieve the list of gauges available. The query is performed
	**	asynchronously and followed by a multicall to get the name and symbols
	**	of each of theses gauges.
	***************************************************************************/
	const getBalanceGauges = useCallback(async (): Promise<void> => {
		if (safeChainID !== 1) {
			performBatchedUpdates((): void => {
				set_balancerGauges([]);
				set_nonce((n): number => n + 1);
			});
			return;
		}

		const	listOfGauges = await request(
			'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
			`{gauges(first: 1000) {
				address
				type {
					name
				}
			}}`
		) as TListOfGauges;

		const	gaugeListDetailsCalls = [];
		const	auraPoolsCall = [];

		const	gaugeList = listOfGauges.gauges.filter((e): boolean => e.type.name === 'Ethereum');
		let		currentProvider = provider || getProvider(safeChainID);
		if (currentProvider?.network?.chainId !== 1) {
			currentProvider = getProvider(safeChainID);
		}
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	balancerFactoryContract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS as string, FACTORY_ABI);
		const	auraBoosterContract = new Contract(process.env.AURA_BOOSTER_ADDRESS as string, AURA_BOOSTER_ABI);

		const	[numPools] = await ethcallProvider.tryAll([auraBoosterContract.poolLength()]) as [number];
		for (let i = 0; i < numPools; i++) {
			auraPoolsCall.push(auraBoosterContract.poolInfo(i));
		}
		const	auraPoolsInfo = await ethcallProvider.tryAll(auraPoolsCall) as [{gauge: string}];

		for (const gauge of gaugeList) {
			const	vaultContract = new Contract(gauge.address, YVAULT_ABI as never);
			gaugeListDetailsCalls.push(vaultContract.name());
			gaugeListDetailsCalls.push(vaultContract.symbol());
			gaugeListDetailsCalls.push(balancerFactoryContract.alreadyExistsFromGauge(gauge.address));
		}
		const	gaugesDetails = await ethcallProvider.tryAll(gaugeListDetailsCalls);
		const	gauges: TGauge[] = [];
		let		rIndex = 0;

		for (const currentGauge of gaugeList) {
			const	name = gaugesDetails[rIndex++] as string;
			const	symbol = gaugesDetails[rIndex++] as string;
			const	existAddress = gaugesDetails[rIndex++] as string;
			gauges.push({
				address: toAddress(currentGauge.address),
				name: name,
				symbol: symbol,
				exists: !isZeroAddress(existAddress),
				isAuraOK: !!auraPoolsInfo.find((e): boolean => toAddress(e.gauge) === toAddress(currentGauge.address))
			});
		}

		performBatchedUpdates((): void => {
			set_balancerGauges(gauges);
			set_nonce((n): number => n + 1);
		});
	}, [provider, safeChainID]);

	useEffect((): void => {
		getBalanceGauges();
	}, [getBalanceGauges]);


	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	return (
		<BalancerGaugeContext.Provider value={{balancerGauges, useBalancerGaugeNonce: nonce}}>
			{children}
		</BalancerGaugeContext.Provider>
	);
};


export const useBalancerGauge = (): TBalancerGaugesContext => useContext(BalancerGaugeContext);
export default useBalancerGauge;
