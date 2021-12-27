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
import	* as utils				from	'utils';
import	{performGet}			from	'utils/API';

const	{newEthCallProvider, getProvider, asyncForEach, chunk} = utils;

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

async function getVaults({network, rpc, status, apy}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider, network);
	const	_vaults = [];
	const	_calls = [];

	Object.values(vaults).forEach((v) => {
		if (v.CHAIN_ID !== network || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;	
		}
		const	vaultContract = new Contract(v.VAULT_ADDR, yVaultABI);
		_calls.push(...[
			vaultContract.apiVersion(),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.activation(),
		]);
	});
	const	callResult = await ethcallProvider.all(_calls);
	const	chunkedCallResult = chunk(callResult, 7);
	let		index = 0;

	await asyncForEach(Object.entries(vaults), async ([k, v]) => {
		if (v.CHAIN_ID !== network || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;	
		}
		const	[apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, activation] = chunkedCallResult[index];
		const	dec = Number(decimals);
		index++;

		if (Number(apy) === 1) {
			const	grossData = await prepareGrossData({vault: v, pricePerShare, decimals, activation});
			_vaults.push({
				title: v.TITLE,
				logo: v.LOGO,
				displayName: `${v.LOGO} ${v.TITLE}`,
				src: `https://ape.tax/${k}`,
				status: v.VAULT_STATUS,
				type: v.VAULT_TYPE,
				address: v.VAULT_ADDR,
				network: v.CHAIN_ID,
				data: {
					apiVersion: apiVersion,
					depositLimit: ethers.utils.formatUnits(depositLimit, dec),
					totalAssets: ethers.utils.formatUnits(totalAssets, dec),
					availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, dec),
					pricePerShare: ethers.utils.formatUnits(pricePerShare, dec),
					decimals: dec,
					activation: Number(activation)
				},
				APY: {
					week: grossData.week,
					month: grossData.month,
					inception: grossData.inception,
				},
				want: {
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL,
				}
			});
		} else {
			_vaults.push({
				title: v.TITLE,
				logo: v.LOGO,
				displayName: `${v.LOGO} ${v.TITLE}`,
				src: `https://ape.tax/${k}`,
				status: v.VAULT_STATUS,
				type: v.VAULT_TYPE,
				address: v.VAULT_ADDR,
				network: v.CHAIN_ID,
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
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL,
				}
			});
		}
	});
	return _vaults;
}

const	vaultMapping = {};
let		vaultMappingAccess = {};
export default async function handler(req, res) {
	let		{apy = 0, network = 1, rpc, status = 'active', revalidate} = req.query;

	network = Number(network);
	const	now = new Date().getTime();
	const	lastAccess = vaultMappingAccess[network] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !vaultMapping[network]) {
		const	result = await getVaults({network, rpc, status, apy});
		vaultMapping[network] = result;
		vaultMappingAccess[network] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(vaultMapping[network]);
}

export {prepareGrossData};