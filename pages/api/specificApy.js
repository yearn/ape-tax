/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	axios					from	'axios';
import	{ethers}				from	'ethers';
import	{Provider, Contract}	from	'ethcall';
import	{fn}					from	'utils/fn';
import	vaults					from	'utils/vaults.json';
import	yVaultABI				from	'utils/ABI/yVault.abi.json';
import	Web3Contract			from	'web3-eth-contract';

async function newEthCallProvider(provider, chainID) {
	const	ethcallProvider = new Provider();
	if (chainID === 1337) {
		await	ethcallProvider.init(new ethers.providers.JsonRpcProvider('http://localhost:8545'));
		ethcallProvider.multicallAddress = '0xc04d660976c923ddba750341fe5923e47900cf24';
		return ethcallProvider;
	}
	await	ethcallProvider.init(provider);
	if (chainID === 42161) {
		ethcallProvider.multicallAddress = '0x10126Ceb60954BC35049f24e819A380c505f8a0F';
	}
	return	ethcallProvider;
}

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

export default fn(async ({address, network = 1, rpc}) => {
	network = Number(network);
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
}, {maxAge: 10 * 60}); //10 mn

export {prepareGrossData};