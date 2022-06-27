
import	React, {useState, useEffect, useCallback}		from	'react';
import	{ethers}										from	'ethers';
import	{useWeb3}										from	'@yearn-finance/web-lib/contexts';
import	chains											from	'utils/chains.json';
import	{performGet}									from	'utils/API';
import	{parseMarkdown}									from	'utils';

function	Strategies({vault, chainID}) {
	const	{provider, isActive, address} = useWeb3();
	const	[strategiesData, set_strategiesData] = useState([]);
	const	[, set_nonce] = useState(0);
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';

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

		const	vaultContract = new ethers.Contract(vault.VAULT_ADDR, ['function withdrawalQueue(uint256 arg0) view returns (address)'], provider);
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
			const	strategyAddress = await vaultContract.withdrawalQueue(index);
			if (strategyAddress === ethers.constants.AddressZero) {
				shouldBreak = true;
				continue;
			}
			const	strategyContract = new ethers.Contract(strategyAddress, ['function name() view returns (string)'], provider);
			const	name = await strategyContract.name();
			if ([1, 250, 42161].includes(Number(vault.CHAIN_ID))) {
				const	details = await performGet(`https://meta.yearn.network/strategies/${vault.CHAIN_ID}/${strategyAddress}`);
				set_strategiesData((s) => {
					s[index] = {address: strategyAddress, name, description: details?.description ? parseMarkdown(details?.description.replaceAll('{{token}}', vault.WANT_SYMBOL)) : null};
					return (s);
				});
			} else {
				set_strategiesData((s) => {
					s[index] = {address: strategyAddress, name, description: 'Description not provided for this strategy.'};
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

	return (
		<section aria-label={'STRATEGIES'} className={'mt-8'}>
			<h1 className={'text-2xl font-mono font-semibold text-neutral-700 mb-6'}>{'Strategies'}</h1>
			{
				strategiesData.map((strategy, index) => (

					<div key={index} className={'font-mono text-neutral-500 text-sm mb-4'}>
						<div>
							<p className={'inline font-bold'}>{`Strat. ${index}: `}</p>
							<p className={'inline font-bold'}>{strategy.name}</p>
						</div>
						<div className={'max-w-xl w-full text-justify'}>
							<p className={'inline text-xs'} dangerouslySetInnerHTML={{__html: strategy?.description || ''}} />
						</div>
						<div>
							<a
								className={'dashed-underline-gray text-xs'}
								href={`${chainExplorer}/address/${strategy.address}#code`} target={'_blank'} rel={'noreferrer'}>
								{'📃 Contract'}
							</a>
						</div>
					</div>
				))
			}
		</section>
	);
}

export default Strategies;