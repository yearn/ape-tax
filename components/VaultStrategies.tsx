import {Fragment, useCallback, useEffect, useState} from 'react';
import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import YVAULT_ABI from 'utils/ABI/yVault.abi.json';
import {harvestStrategy} from 'utils/actions';
import {parseMarkdown, performGet} from 'utils/utils';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {ReactElement} from 'react';
import type {TStrategyData, TVault, TVaultData} from 'utils/types';
import type {TAddress, TDict} from '@yearn-finance/web-lib/types';

type TStrategies = {
	vault: TVault;
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
}
function	Strategies({vault, onUpdateVaultData}: TStrategies): ReactElement {
	const	{provider, isActive, address, chainID} = useWeb3();
	const 	{safeChainID} = useChainID();
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
		const	network = await provider.getNetwork();
		if (network.chainId !== vault.CHAIN_ID && !(network.chainId === 1337)) {
			return;
		}

		let		currentProvider = provider || getProvider(safeChainID);
		if (currentProvider?.network?.chainId !== 1) {
			currentProvider = getProvider(safeChainID);
		}
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	contract = new Contract(vault.VAULT_ADDR, YVAULT_ABI as never);
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
			let	strategyAddress = toAddress();
			try {
				const	[_strategyAddress] = await ethcallProvider.tryAll([contract.withdrawalQueue(index)]) as [string];
				if (toAddress(_strategyAddress) === toAddress(ethers.constants.AddressZero)) {
					shouldBreak = true;
					continue;
				}
				strategyAddress = toAddress(_strategyAddress);
			} catch (error) {
				shouldBreak = true;
				continue;
			}

			const	strategyContract = new Contract(strategyAddress, YVAULT_ABI as never);
			try {
				const	[creditAvailable, name] = await ethcallProvider.tryAll([
					contract.creditAvailable(strategyAddress),
					strategyContract.name()
				]) as [ethers.BigNumber, string];

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
			} catch (error) {
				console.log(error);
			}
			set_nonce((n): number => n + 1);
		}
	}, [safeChainID, chainID, vault.CHAIN_ID, vault.VAULT_ADDR, vault.WANT_SYMBOL, provider]);

	useEffect((): void => {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		prepreStrategiesData();
	}, [vault, isActive, provider, address, prepreStrategiesData]);


	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}
		const	providerToUse = provider || getProvider(chainID === 1337 ? 1337 : vault.CHAIN_ID);
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], providerToUse
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)'
			], providerToUse);

		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, depositLimit, totalAssets, availableDepositLimit, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			providerToUse.getBalance(address),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare()
		]);
		onUpdateVaultData((v): TVaultData => ({
			...v,
			allowance: toNormalizedBN(wantAllowance, v.decimals),
			wantBalance: toNormalizedBN(wantBalance, v.decimals),
			balanceOf: toNormalizedBN(vaultBalance, v.decimals),
			balanceOfValue: formatToNormalizedValue(vaultBalance, v.decimals) * Number(v.pricePerShare.normalized) * v.wantPrice,
			coinBalance: toNormalizedBN(coinBalance, 18),
			depositLimit: toNormalizedBN(depositLimit, v.decimals),
			totalAssets: toNormalizedBN(totalAssets, v.decimals),
			availableDepositLimit: toNormalizedBN(availableDepositLimit, v.decimals),
			pricePerShare: toNormalizedBN(pricePerShare, v.decimals),
			totalAUM: (Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice),
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals))
		}));
	}

	function onHarvestStrategy(strategyAddress: TAddress): void {
		if (isHarvesting) {
			return;
		}
		set_isHarvesting(true);
		harvestStrategy({provider, strategyAddress}, ({error}): void => {
			set_isHarvesting(false);
			if (error) {
				return;
			}
			prepreStrategiesData();
			fetchPostDepositOrWithdraw();
		});
	}

	if (Object.values(strategiesData).length === 0) {
		return <Fragment />;
	}

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
									disabled={isHarvesting || !isActive || !provider || strategy.creditAvailable.raw.isZero()}
									onClick={(): void => onHarvestStrategy(strategy.address)}
									className={'dashed-underline-gray text-xs'}>
									{strategy?.creditAvailable?.raw.isZero() ? '🌱 All funds deployed' : `🚜 Harvest to deploy ${strategy.creditAvailable.normalized} ${vault.WANT_SYMBOL}`}
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
