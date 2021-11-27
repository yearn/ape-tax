/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	{ethers}				from	'ethers';
import	vaults					from	'utils/vaults.json';
import	{prepareGrossData}		from	'pages/api/specificApy';
import	{performGet}			from	'utils/API';
import	* as utils				from	'utils';

const	{getProvider} = utils;

async function getVaultStrategies({vaultAddress, vaultSymbol, vaultChainID, provider}) {
	const	vaultContract = new ethers.Contract(
		vaultAddress,
		['function withdrawalQueue(uint256 arg0) view returns (address)'],
		provider
	);
	const	strategiesIndex = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
	const 	strategies = [];
	let		shouldBreak = false;
	for (let i = 0; i < strategiesIndex.length; i++) {
		const index = strategiesIndex[i];
		if (shouldBreak) {
			return;
		}

		/**************************************************************************
		** The fun part to get all the strategies addresses is that we need to
		** retrieve the address of the strategy from withdrawQueue, looping
		** through the max number of strategies until we hit 0
		**************************************************************************/
		const	strategyAddress = await vaultContract.withdrawalQueue(index);
		if (strategyAddress === ethers.constants.AddressZero) {
			shouldBreak = true;
			return strategies;
		}
		const	strategyContract = new ethers.Contract(strategyAddress, ['function name() view returns (string)'], provider);
		const	[name, details] = await Promise.all([
			strategyContract.name(),
			performGet(`https://meta.yearn.network/strategies/${vaultChainID}/${strategyAddress}`),
		]);

		strategies.push({
			address: strategyAddress,
			name,
			description: details?.description ? details?.description.replaceAll('{{token}}', vaultSymbol) : null
		});	
	}
	return strategies;
}

async function getStrategies({network, address, rpc}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	vaultToUse = Object.values(vaults).find((v) => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());

	const	strategies = await getVaultStrategies({
		vaultAddress: vaultToUse.VAULT_ADDR,
		vaultSymbol: vaultToUse.WANT_SYMBOL,
		vaultChainID: vaultToUse.CHAIN_ID,
		provider
	});
	return (strategies);
}

const	oneVaultStrategiesMapping = {};
let		oneVaultStrategiesMappingAccess = {};
export default async function handler(req, res) {
	let		{address, network, rpc, revalidate} = req.query;
	if (!address || address === '') {
		return res.status(200).json({});
	}

	network = Number(network);
	address = address.toLowerCase();

	const	now = new Date().getTime();
	const	lastAccess = oneVaultStrategiesMappingAccess[address] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 60 * 60 * 1000) || revalidate === 'true' || !oneVaultStrategiesMapping[address]) {
		const	result = await getStrategies({network, rpc, address});
		oneVaultStrategiesMapping[network] = result;
		oneVaultStrategiesMappingAccess[network] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=3600'); // 60 minutes
	return res.status(200).json(oneVaultStrategiesMapping[network]);
}

export {prepareGrossData};