import {Fragment, useCallback, useEffect, useState} from 'react';
import {harvestStrategy} from 'utils/actions';
import {parseMarkdown, performGet} from 'utils/utils';
import {multicall, readContract} from '@wagmi/core';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {toBigInt, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {ReactElement} from 'react';
import type {TStrategyData, TVault} from 'utils/types';
import type {TAddress, TDict} from '@yearn-finance/web-lib/types';

type TStrategies = {
	vault: TVault;
	// onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
}
function	Strategies({vault}: TStrategies): ReactElement {
	const	{provider, isActive, address, chainID} = useWeb3();
	const	chainExplorer = CHAINS[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	[strategiesData, set_strategiesData] = useState<TDict<TStrategyData>>({});
	const	[, set_nonce] = useState(0);
	const	[isHarvesting, set_isHarvesting] = useState(false);

	/**************************************************************************
	** Retrieve the details of the attached strategies and compute some of the
	** elements for the UI.
	**************************************************************************/
	const prepreStrategiesData = useCallback(async (): Promise<void> => {
		if (chainID !== vault?.CHAIN_ID && !(chainID === 1337)) {
			return;
		}

		const vaultContract = {address: toAddress(vault.VAULT_ADDR), abi: VAULT_ABI};
		let		shouldBreak = false;
		for (let index = 0; index < 20; index++) {
			if (shouldBreak) {
				continue;
			}

			/**************************************************************************
			** The fun part to get all the strategies addresses is that we need to
			** retrieve the address of the strategy from withdrawQueue, looping
			** through the max number of strategies until we hit 0
			**************************************************************************/
			const strategyAddress = await readContract({...vaultContract, functionName: 'withdrawalQueue', args: [toBigInt(index)]});

			if (isZeroAddress(strategyAddress)) {
				shouldBreak = true;
				continue;
			}
			const callResult = await multicall({
				contracts: [
					{address: toAddress(vault.VAULT_ADDR), abi: VAULT_ABI, functionName: 'creditAvailable', args: [strategyAddress]},
					{address: strategyAddress, abi: VAULT_ABI, functionName: 'name'}
				],
				chainId: chainID || 1
			});
			const creditAvailable = decodeAsBigInt(callResult[0]);
			const name = callResult[1].result as string;

			if ([1, 10, 250, 42161].includes(Number(vault.CHAIN_ID))) {
				try {
					const	details = await performGet(`https://meta.yearn.network/api/${vault.CHAIN_ID}/strategies/${strategyAddress}`);
					if (details) {
						set_strategiesData((s): TDict<TStrategyData> => {
							s[toAddress(strategyAddress)] = {
								address: toAddress(strategyAddress),
								name: name,
								description: details?.description ? parseMarkdown(details?.description.replaceAll('{{token}}', vault.WANT_SYMBOL)) : 'Description not provided for this strategy.',
								creditAvailable: toNormalizedBN(creditAvailable)
							};
							return (s);
						});
					} else {
						set_strategiesData((s): TDict<TStrategyData> => {
							s[toAddress(strategyAddress)] = {
								address: toAddress(strategyAddress),
								name: name,
								description: 'Description not provided for this strategy.',
								creditAvailable: toNormalizedBN(creditAvailable)
							};
							return (s);
						});
					}
				} catch (error) {
					set_strategiesData((s): TDict<TStrategyData> => {
						s[toAddress(strategyAddress)] = {
							address: toAddress(strategyAddress),
							name: name,
							description: 'Description not provided for this strategy.',
							creditAvailable: toNormalizedBN(creditAvailable)
						};
						return (s);
					});
				}
			} else {
				set_strategiesData((s): TDict<TStrategyData> => {
					s[toAddress(strategyAddress)] = {
						address: toAddress(strategyAddress),
						name: name,
						description: 'Description not provided for this strategy.',
						creditAvailable: toNormalizedBN(creditAvailable)
					};
					return (s);
				});
			}
			set_nonce((n): number => n + 1);
		}
	}, [chainID, vault.CHAIN_ID, vault.VAULT_ADDR, vault.WANT_SYMBOL]);

	useEffect((): void => {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		prepreStrategiesData();
	}, [vault, isActive, provider, address, prepreStrategiesData]);


	const onHarvestStrategy = useCallback(async (strategyAddress: TAddress): Promise<void> => {
		set_isHarvesting(true);

		const result = await harvestStrategy({
			connector: provider,
			contractAddress: strategyAddress
		}); 

		set_isHarvesting(false);
		
		if(result.isSuccessful){
			alert('onHarvestStrategy worked!');
		}
	}, [provider]);

	return (
		<section aria-label={'STRATEGIES'} className={'mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-900'}>{'Strategies'}</h1>
			{
				Object.values(strategiesData).map((strategy, index): ReactElement => (
					<div key={index} className={'mb-4 font-mono text-sm text-neutral-700'}>
						<div>
							<p className={'inline font-bold'}>{`Strat. ${index}: `}</p>
							<p className={'inline font-bold'}>{strategy.name}</p>
						</div>
						<div className={'w-full max-w-xl text-justify'}>
							<p className={'inline text-xs'} dangerouslySetInnerHTML={{__html: strategy?.description || ''}} />
						</div>
						<div>
							<a
								className={'dashed-underline-gray text-xs'}
								href={`${chainExplorer}/address/${strategy.address}#code`}
								target={'_blank'}
								rel={'noreferrer'}>
								{'📃 Contract'}
							</a>
						</div>
						{vault.VAULT_TYPE === 'community' ? (
							<div>
								<button
									disabled={isHarvesting || !isActive || !provider || isZero(strategy.creditAvailable.raw)}
									onClick={async (): Promise<void> => onHarvestStrategy(strategy.address)}
									className={'dashed-underline-gray text-xs'}>
									{isZero(strategy?.creditAvailable?.raw) ? '🌱 All funds deployed' : `🚜 Harvest to deploy ${strategy.creditAvailable.normalized} ${vault.WANT_SYMBOL}`}
								</button>
							</div>
						) : <Fragment />}
					</div>
				))
			}
		</section>
	);
}

export default Strategies;
