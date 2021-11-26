/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	{ethers}					from	'ethers';
import	{Contract}					from	'ethcall';
import	vaults						from	'utils/vaults.json';
import	yVaultABI					from	'utils/ABI/yVault.abi.json';
import	{performGet}				from	'utils/API';
import	* as utils					from	'utils';

const	{newEthCallProvider, getProvider, chunk, asyncForEach} = utils;

async function getTVL({network, rpc}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider, network);
	const	_calls = [];
	const	_cgIDS = [];
	let		_tvlEndorsed = 0;
	let		_tvlExperimental = 0;
	let		_tvlDeprecated = 0;

	Object.values(vaults).forEach((v) => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const	vaultContract = new Contract(v.VAULT_ADDR, yVaultABI);
		_calls.push(...[
			vaultContract.totalAssets(),
			vaultContract.decimals(),
		]);
		_cgIDS.push(v.COINGECKO_SYMBOL);
	});
	const	callResult = await ethcallProvider.all(_calls);
	const	chunkedCallResult = chunk(callResult, 2);
	const	prices = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${_cgIDS}&vs_currencies=usd`);
	let		index = 0;

	await asyncForEach(Object.entries(vaults), async ([, v]) => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const	[totalAssets, decimals] = chunkedCallResult[index];
		const	price = prices?.[v.COINGECKO_SYMBOL.toLowerCase()]?.usd || 0;
		const	dec = Number(decimals);
		index++;

		if (v.VAULT_STATUS === 'endorsed') {
			_tvlEndorsed += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		} else if (v.VAULT_STATUS === 'withdraw') {
			_tvlDeprecated += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		} else {
			_tvlExperimental += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		}
	});
	return {
		tvlEndorsed: _tvlEndorsed,
		tvlExperimental: _tvlExperimental,
		tvlDeprecated: _tvlDeprecated,
		tvl: _tvlEndorsed + _tvlExperimental + _tvlDeprecated
	};
}

const	tvlMapping = {};
let		tvlMappingAccess = {};
export default async function handler(req, res) {
	let		{network = 1, rpc, revalidate} = req.query;
	network = Number(network);

	const	now = new Date().getTime();
	const	lastAccess = tvlMappingAccess[network] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 5 * 60 * 1000) || revalidate === 'true' || !tvlMapping[network]) {
		const	result = await getTVL({network, rpc});
		tvlMapping[network] = result;
		tvlMappingAccess[network] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=300'); // 5 minutes
	return res.status(200).json(tvlMapping[network]);
}
