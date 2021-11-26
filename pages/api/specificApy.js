/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	{ethers}				from	'ethers';
import	vaults					from	'utils/vaults.json';
import	yVaultABI				from	'utils/ABI/yVault.abi.json';
import	Web3Contract			from	'web3-eth-contract';
import	{Contract}				from	'ethcall';
import	{fetchBlockTimestamp}	from	'utils/API';
import	utils					from	'utils';

const	{newEthCallProvider, getProvider, getWeb3Provider} = utils;

async function	prepareGrossData({vault, pricePerShare, decimals, activation}) {
	let		_grossAPRWeek = '-';
	let		_grossAPRMonth = '-';
	let		_grossAPRInception = '-';
	const	activationTimestamp = Number(activation);
	const	oneWeekAgo = (new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0);
	const	oneMonthAgo = (new Date(Date.now() - 30.5 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0);
	const	currentPrice = ethers.utils.formatUnits(pricePerShare, decimals.toNumber());

	if (activationTimestamp > oneWeekAgo) {
		_grossAPRWeek = '-';
		_grossAPRMonth = '-';
	} else if (activationTimestamp > oneMonthAgo) {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault.CHAIN_ID) || 0);
		Web3Contract.setProvider(getWeb3Provider(vault.CHAIN_ID));
		const [_pastPricePerShareWeek] = await Promise.all([
			new Web3Contract(yVaultABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneWeekAgo),
		]);
		const	pastPriceWeek = ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber());
		const	weekRoi = (currentPrice / pastPriceWeek - 1);
		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = '-';
	} else {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault.CHAIN_ID) || 0);
		const	blockOneMonthAgo = Number(await fetchBlockTimestamp(oneMonthAgo, vault.CHAIN_ID) || 0);
		Web3Contract.setProvider(getWeb3Provider(vault.CHAIN_ID));
		const [_pastPricePerShareWeek, _pastPricePerShareMonth] = await Promise.all([
			new Web3Contract(yVaultABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneWeekAgo),
			new Web3Contract(yVaultABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneMonthAgo)
		]);
		const	pastPriceWeek = ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber());
		const	pastPriceMonth = ethers.utils.formatUnits(_pastPricePerShareMonth, decimals.toNumber());
		const	weekRoi = (currentPrice / pastPriceWeek - 1);
		const	monthRoi = (currentPrice / pastPriceMonth - 1);
		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = (monthRoi ? `${((monthRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
	}

	const	inceptionROI = (currentPrice - 1);
	_grossAPRInception = (inceptionROI ? `${(inceptionROI * 100).toFixed(4)}%` : '-');

	return {
		week: _grossAPRWeek,
		month: _grossAPRMonth,
		inception: _grossAPRInception,
		extra: {
			pricePerShare: currentPrice,
			decimals: Number(decimals)
		}
	};
}

async function getSpecificAPY({network, address, rpc}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider, network);
	const	vaultToUse = Object.values(vaults).find((v) => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());
	const	vaultContractMultiCall = new Contract(vaultToUse.VAULT_ADDR, yVaultABI);
	const	callResult = await ethcallProvider.all([
		vaultContractMultiCall.pricePerShare(),
		vaultContractMultiCall.decimals(),
		vaultContractMultiCall.activation(),
	]);
	const	[pricePerShare, decimals, activation] = callResult;
	return prepareGrossData({
		vault: vaultToUse,
		pricePerShare,
		decimals,
		activation,
	});
}


const	specificApyMapping = {};
let		specificApyMappingAccess = {};
export default async function handler(req, res) {
	let		{address, network, rpc, revalidate} = req.query;

	network = Number(network);
	address = address.toLowerCase();

	const	now = new Date().getTime();
	const	lastAccess = specificApyMappingAccess[address] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !specificApyMapping[address]) {
		const	result = await getSpecificAPY({network, address, rpc});
		specificApyMapping[address] = result;
		specificApyMappingAccess[address] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(specificApyMapping[address]);
}

export {prepareGrossData};