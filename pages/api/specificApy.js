/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	axios					from	'axios';
import	{ethers}				from	'ethers';
import	{Contract}				from	'ethcall';
import	{providers, toAddress}	from	'@yearn-finance/web-lib/utils';
import	vaults					from	'utils/vaults.json';
import	YVAULT_ABI				from	'utils/ABI/yVault.abi';
import	FACTORY_ABI				from	'utils/ABI/factory.abi';
import	Web3Contract			from	'web3-eth-contract';

async function	fetchBlockTimestamp(timestamp, network = 1) {
	if (network === 250) {
		const	result = await performGet(`https://api.ftmscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.FTMSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 56) {
		const	result = await performGet(`https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.BSCSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 137) {
		const	result = await performGet(`https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.POLYGONSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 42161) {
		const	result = await performGet(`https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 100) {
		const	result = await performGet(`https://blockscout.com/xdai/mainnet/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before
`);

		if (result) {
			return result.result;
		}
		return null;
	}

	const	result = await performGet(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);

	if (result) {
		return result.result;
	}
	return null;
}

export const	performGet = (url) => {
	return (
		axios.get(url)
			.then(function (response) {
				return response.data;
			})
			.catch(function (error) {
				console.warn(error);
				return null;
			})
	);
};

function getProvider(chain = 1) {
	if (chain === 1) {
		if (process.env.ALCHEMY_KEY) {
			return new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY);
		} else {
			return new ethers.providers.InfuraProvider('homestead', '9aa3d95b3bc440fa88ea12eaa4456161');
		}
	} else if (chain === 'polygon' || chain === 137) {
		if (process.env.ALCHEMY_KEY_POLYGON) {
			return new ethers.providers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_POLYGON}`);
		}
		return new ethers.providers.JsonRpcProvider('https://rpc-mainnet.matic.network');
	} else if (chain === 250) {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
	} else if (chain === 56) {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
	} else if (chain === 42161) {
		return new ethers.providers.JsonRpcProvider(`https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ARBITRUM_KEY}/arbitrum/mainnet`);
	} else if (chain === 1337) {
		return new ethers.providers.JsonRpcProvider('http://localhost:8545');
	} else if (chain === 100) {
		return new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com/');
	}
	return (new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY));
}
function getWeb3Provider(chain = 1) {
	if (chain === 1) {
		return (`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`);
	} else if (chain === 'polygon' || chain === 137) {
		return (`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_POLYGON}`);
	} else if (chain === 250) {
		return ('https://rpc.ftm.tools');
	} else if (chain === 56) {
		return ('https://bsc-dataseed1.defibit.io/');
	} else if (chain === 42161) {
		return (`https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ARBITRUM_KEY}/arbitrum/mainnet`);
	} else if (chain === 1337) {
		return ('http://localhost:8545');
	} else if (chain === 100) {
		return ('https://rpc.gnosischain.com/');
	}
	return (`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`);
}

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
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);
		Web3Contract.setProvider(getWeb3Provider(vault?.CHAIN_ID || 1));
		const [_pastPricePerShareWeek] = await Promise.all([
			new Web3Contract(YVAULT_ABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneWeekAgo),
		]);
		const	pastPriceWeek = ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber());
		const	weekRoi = (currentPrice / pastPriceWeek - 1);
		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = '-';
	} else {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);
		const	blockOneMonthAgo = Number(await fetchBlockTimestamp(oneMonthAgo, vault?.CHAIN_ID || 1) || 0);
		Web3Contract.setProvider(getWeb3Provider(vault?.CHAIN_ID || 1));
		const [_pastPricePerShareWeek, _pastPricePerShareMonth] = await Promise.all([
			new Web3Contract(YVAULT_ABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneWeekAgo),
			new Web3Contract(YVAULT_ABI, vault.VAULT_ADDR).methods.pricePerShare().call(undefined, blockOneMonthAgo)
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

async function getCommunityVaults() {
	const	currentProvider = providers.getProvider(1 || 1337);
	const	ethcallProvider = await providers.newEthCallProvider(currentProvider);

	const	contract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS, FACTORY_ABI);
	const	[numVaults] = await ethcallProvider.tryAll([contract.numVaults()]);

	const	vaultListCalls = [];
	for (let i = 0; i < numVaults; i++) {
		vaultListCalls.push(contract.deployedVaults(i));
	}
	const	deployedVaults = await ethcallProvider.tryAll(vaultListCalls);

	const	vaultDetailsCalls = [];
	for (const vault of deployedVaults) {
		const	vaultContract = new Contract(vault, YVAULT_ABI);
		vaultDetailsCalls.push(vaultContract.name());
		vaultDetailsCalls.push(vaultContract.symbol());
		vaultDetailsCalls.push(vaultContract.token());
	}
	const	vaultDetails = await ethcallProvider.tryAll(vaultDetailsCalls);

	const	vaults = [];
	let		rIndex = 0;
	for (let i = 0; i < numVaults; i++) {
		const	name = vaultDetails[rIndex++];
		const	symbol = vaultDetails[rIndex++];
		const	token = vaultDetails[rIndex++];
		vaults.push({
			LOGO: '🦍🦍',
			VAULT_ABI: 'yVaultV2',
			VAULT_TYPE: 'community',
			VAULT_ADDR: toAddress(deployedVaults[i]),
			TITLE: name,
			SYMBOL: symbol,
			WANT_ADDR: toAddress(token),
			WANT_SYMBOL: symbol.replace('yvBlp', ''),
			COINGECKO_SYMBOL: '',
			VAULT_STATUS: 'active',
			CHAIN_ID: 1,
			PRICE_SOURCE: 'Lens 🔮'
		});
	}

	return vaults;
}

async function getSpecificAPY({network, address, rpc}) {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await providers.newEthCallProvider(provider);
	const	vaultContractMultiCall = new Contract(address, YVAULT_ABI);
	let		vaultToUse = Object.values(vaults).find((v) => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());

	const	callResult = await ethcallProvider.tryAll([
		vaultContractMultiCall.pricePerShare(),
		vaultContractMultiCall.decimals(),
		vaultContractMultiCall.activation(),
	]);
	const	[pricePerShare, decimals, activation] = callResult;

	if (!vaultToUse) {
		const	communityVaults = await getCommunityVaults();
		vaultToUse = Object.values(communityVaults).find((v) => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());
	}

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
