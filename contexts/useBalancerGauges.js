import React, {createContext, useContext} from 'react';
import {Contract} from 'ethcall';
import {request} from 'graphql-request';
import AURA_BOOSTER_ABI from 'utils/ABI/auraBooster.abi';
import FACTORY_ABI from 'utils/ABI/factory.abi';
import YVAULT_ABI from 'utils/ABI/yVault.abi';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

/* 🔵 - Yearn Finance **********************************************************
** BalancerGauge is used to retrieve the list of gauges available through
** the Balancer ecosystem.
******************************************************************************/
const	BalancerGaugeContext = createContext();
export const BalancerGaugeContextApp = ({children}) => {
	const	{provider, chainID} = useWeb3();
	const	[balancerGauges, set_balancerGauges] = React.useState(undefined);
	const	[nonce, set_nonce] = React.useState(0);

	/* 🔵 - Yearn Finance ******************************************************
	**	getBalanceGauges will perform a graphQL query to the balancer subgraph
	**	to retrieve the list of gauges available. The query is performed
	**	asynchronously and followed by a multicall to get the name and symbols
	**	of each of theses gauges.
	***************************************************************************/
	const getBalanceGauges = React.useCallback(async () => {
		if (chainID !== 1 && chainID !== 1337) {
			performBatchedUpdates(() => {
				set_balancerGauges(undefined);
				set_nonce((n) => n + 1);
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
		);

		const	gaugeListDetailsCalls = [];
		const	auraPoolsCall = [];

		const	gaugeList = listOfGauges.gauges.filter(e => e.type.name === 'Ethereum');
		const	currentProvider = provider || getProvider(chainID || 1337);
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	balancerFactoryContract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS, FACTORY_ABI);
		const	auraBoosterContract = new Contract(process.env.AURA_BOOSTER_ADDRESS, AURA_BOOSTER_ABI);

		const	[numPools] = await ethcallProvider.tryAll([auraBoosterContract.poolLength()]);
		for (let i = 0; i < numPools; i++) {
			auraPoolsCall.push(auraBoosterContract.poolInfo(i));
		}
		const	auraPoolsInfo = await ethcallProvider.tryAll(auraPoolsCall);

		for (const gauge of gaugeList) {
			const	vaultContract = new Contract(gauge.address, YVAULT_ABI);
			gaugeListDetailsCalls.push(vaultContract.name());
			gaugeListDetailsCalls.push(vaultContract.symbol());
			gaugeListDetailsCalls.push(balancerFactoryContract.alreadyExistsFromGauge(gauge.address));
		}
		const	gaugesDetails = await ethcallProvider.tryAll(gaugeListDetailsCalls);
		const	gauges = [];
		let		rIndex = 0;
		for (let i = 0; i < gaugeList.length; i++) {
			const	name = gaugesDetails[rIndex++];
			const	symbol = gaugesDetails[rIndex++];
			const	exists = gaugesDetails[rIndex++];
			gauges.push({
				address: toAddress(gaugeList[i].address),
				name: name,
				symbol: symbol,
				exists: !isZeroAddress(exists),
				isAuraOK: auraPoolsInfo.find(e => toAddress(e.gauge) === toAddress(gaugeList[i].address))
			});
		}

		performBatchedUpdates(() => {
			set_balancerGauges(gauges);
			set_nonce((n) => n + 1);
		});
	}, [provider, chainID]);

	React.useEffect(() => {
		getBalanceGauges();
	}, [getBalanceGauges]);


	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	return (
		<BalancerGaugeContext.Provider
			value={{
				balancerGauges,
				useBalancerGaugeNonce: nonce
			}}>
			{children}
		</BalancerGaugeContext.Provider>
	);
};


export const useBalancerGauge = () => useContext(BalancerGaugeContext);
export default useBalancerGauge;
