
import React, {useCallback, useEffect, useState} from 'react';
import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import {parseMarkdown} from 'utils';
import YVAULT_ABI from 'utils/ABI/yVault.abi';
import {harvestStrategy} from 'utils/actions';
import {performGet} from 'utils/API';
import chains from 'utils/chains.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

function	Strategies({vault, decimals, chainID, onUpdateVaultData}) {
	const	{provider, isActive, address} = useWeb3();
	const	[strategiesData, set_strategiesData] = useState({});
	const	[, set_nonce] = useState(0);
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	[isHarvesting, set_isHarvesting] = useState(false);

	/**************************************************************************
	** Retrieve the details of the attached strategies and compute some of the
	** elements for the UI.
	**************************************************************************/
	const prepreStrategiesData = useCallback(async () => {
		if (chainID !== vault?.CHAIN_ID && !(chainID === 1337)) {
			return;
		}
		const	network = await provider.getNetwork();
		if (network.chainId !== vault.CHAIN_ID && !(network.chainId === 1337)) {
			return;
		}

		const	currentProvider = provider || getProvider(chainID || 1337);
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	contract = new Contract(vault.VAULT_ADDR, YVAULT_ABI);
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
			const	[strategyAddress] = await ethcallProvider.tryAll([contract.withdrawalQueue(index)]);
			if (strategyAddress === ethers.constants.AddressZero) {
				shouldBreak = true;
				continue;
			}
			const	strategyContract = new Contract(strategyAddress, YVAULT_ABI);
			const	[creditAvailable, name] = await ethcallProvider.tryAll([
				contract.creditAvailable(strategyAddress),
				strategyContract.name()
			]);

			if ([1, 10, 250, 42161].includes(Number(vault.CHAIN_ID))) {
				try {
					const	details = await performGet(`https://meta.yearn.network/api/${vault.CHAIN_ID}/strategies/${strategyAddress}`);
					if (details) {
						set_strategiesData((s) => {
							s[toAddress(strategyAddress)] = {
								address: strategyAddress,
								name: name,
								description: details?.description ? parseMarkdown(details?.description.replaceAll('{{token}}', vault.WANT_SYMBOL)) : 'Description not provided for this strategy.',
								creditAvailable: creditAvailable
							};
							return (s);
						});	
					} else {
						set_strategiesData((s) => {
							s[toAddress(strategyAddress)] = {
								address: strategyAddress,
								name: name,
								description: 'Description not provided for this strategy.',
								creditAvailable: creditAvailable
							};
							return (s);
						});
					}
				} catch (error) {
					set_strategiesData((s) => {
						s[toAddress(strategyAddress)] = {
							address: strategyAddress,
							name: name,
							description: 'Description not provided for this strategy.',
							creditAvailable: creditAvailable
						};
						return (s);
					});
				}
			} else {
				set_strategiesData((s) => {
					s[toAddress(strategyAddress)] = {
						address: strategyAddress,
						name: name,
						description: 'Description not provided for this strategy.',
						creditAvailable: creditAvailable
					};
					return (s);
				});
			}
			set_nonce(n => n + 1);
		}
	}, [chainID, vault.CHAIN_ID, vault.VAULT_ADDR, provider]);

	useEffect(() => {
		if (!vault || !isActive || !provider || !address) {
			return;
		}
		prepreStrategiesData();
	}, [vault, isActive, provider, address, prepreStrategiesData]);


	async function	fetchPostDepositOrWithdraw() {
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
		onUpdateVaultData(v => ({
			...v,
			allowance: Number(ethers.utils.formatUnits(wantAllowance, v.decimals)),
			wantBalance: Number(ethers.utils.formatUnits(wantBalance, v.decimals)).toFixed(2),
			wantBalanceRaw: wantBalance,
			balanceOf: Number(ethers.utils.formatUnits(vaultBalance, v.decimals)).toFixed(2),
			balanceOfRaw: vaultBalance,
			balanceOfValue: (Number(ethers.utils.formatUnits(vaultBalance, v.decimals)) * v.pricePerShare * v.wantPrice).toFixed(2),
			coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
			depositLimit: Number(ethers.utils.formatUnits(depositLimit, v.decimals)).toFixed(2),
			totalAssets: Number(ethers.utils.formatUnits(totalAssets, v.decimals)).toFixed(2),
			availableDepositLimit: Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals)).toFixed(2),
			pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, v.decimals)).toFixed(4),
			totalAUM: (Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice).toFixed(2),
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals))
		}));
	}

	function	onHarvestStrategy(strategyAddress) {
		if (isHarvesting) {
			return;
		}
		set_isHarvesting(true);
		harvestStrategy({provider, strategyAddress}, ({error}) => {
			set_isHarvesting(false);
			if (error) {
				return;
			}
			prepreStrategiesData();
			fetchPostDepositOrWithdraw();
		});
	}

	return (
		<section aria-label={'STRATEGIES'} className={'mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-900'}>{'Strategies'}</h1>
			{
				Object.values(strategiesData).map((strategy, index) => (

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
									disabled={isHarvesting || !isActive || !provider || strategy.creditAvailable.isZero()}
									onClick={() => onHarvestStrategy(strategy.address)}
									className={'dashed-underline-gray text-xs'}
									href={`${chainExplorer}/address/${strategy.address}#code`}
									target={'_blank'}
									rel={'noreferrer'}>
									{strategy.creditAvailable.isZero() ? '🌱 All funds deployed' : `🚜 Harvest to deploy ${ethers.utils.formatUnits(strategy.creditAvailable, decimals)} ${vault.WANT_SYMBOL}`}
								</button>
							</div>
						) : null}
					</div>
				))
			}
		</section>
	);
}

export default Strategies;
