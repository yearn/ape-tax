/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	{ethers}				from	'ethers';
import	{Contract}				from	'ethcall';
import	vaults					from	'utils/vaults.json';
import	yVaultABI				from	'utils/ABI/yVault.abi.json';
import	{prepareGrossData}		from	'pages/api/specificApy';
import	{performGet}			from	'utils/API';
import	* as utils				from	'utils';

const	{newEthCallProvider, getProvider} = utils;

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

async function getVault({network, address, rpc}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider, network);
	const	vaultToUse = Object.values(vaults).find((v) => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());

	const	vaultContract = new Contract(vaultToUse.VAULT_ADDR, yVaultABI);
	const	[apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, activation] = await ethcallProvider.tryAll([
		vaultContract.apiVersion(),
		vaultContract.depositLimit(),
		vaultContract.totalAssets(),
		vaultContract.availableDepositLimit(),
		vaultContract.pricePerShare(),
		vaultContract.decimals(),
		vaultContract.activation(),
	]);

	const	dec = Number(decimals);
	const	strategies = await getVaultStrategies({
		vaultAddress: vaultToUse.VAULT_ADDR,
		vaultSymbol: vaultToUse.WANT_SYMBOL,
		vaultChainID: vaultToUse.CHAIN_ID,
		provider
	});
	return ({
		title: vaultToUse.TITLE,
		logo: vaultToUse.LOGO,
		displayName: `${vaultToUse.LOGO} ${vaultToUse.TITLE}`,
		src: `https://ape.tax/${vaultToUse.SLUG}`,
		status: vaultToUse.VAULT_STATUS,
		type: vaultToUse.VAULT_TYPE,
		address: vaultToUse.VAULT_ADDR,
		network: vaultToUse.CHAIN_ID,
		strategies,
		data: {
			apiVersion: apiVersion,
			depositLimit: ethers.utils.formatUnits(depositLimit, dec),
			totalAssets: ethers.utils.formatUnits(totalAssets, dec),
			availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, dec),
			pricePerShare: ethers.utils.formatUnits(pricePerShare, dec),
			decimals: dec,
			activation: Number(activation)
		},
		want: {
			address: vaultToUse.WANT_ADDR,
			symbol: vaultToUse.WANT_SYMBOL,
			cgID: vaultToUse.COINGECKO_SYMBOL,
		}
	});
}

const	oneVaultMapping = {};
let		oneVaultMappingAccess = {};
export default async function handler(req, res) {
	let		{address, network, rpc, revalidate} = req.query;

	network = Number(network);
	address = address.toLowerCase();

	const	now = new Date().getTime();
	const	lastAccess = oneVaultMappingAccess[address] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !oneVaultMapping[address]) {
		const	result = await getVault({network, rpc, address});
		oneVaultMapping[network] = result;
		oneVaultMappingAccess[network] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(oneVaultMapping[network]);
}

export {prepareGrossData};