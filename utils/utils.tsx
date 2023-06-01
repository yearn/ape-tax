import {ethers} from 'ethers';
import axios from 'axios';

import type {AxiosError, AxiosResponse} from 'axios';

export const performGet = async (url: string): Promise<any> => {
	return (
		axios.get(url)
			.then(function (response: AxiosResponse): any {
				return response.data;
			})
			.catch(function (error: AxiosError): null {
				console.warn(error);
				return null;
			})
	);
};

export async function fetchBlockTimestamp(timestamp: number, network = 1): Promise<number> {
	if (network === 250) {
		const	result = await performGet(`https://api.ftmscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.FTMSCAN_API}`);
		if (result) {
			return result.result;
		}
		return 0;
	}
	if (network === 56) {
		const	result = await performGet(`https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.BSCSCAN_API}`);
		if (result) {
			return result.result;
		}
		return 0;
	}
	if (network === 137) {
		const	result = await performGet(`https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.POLYGONSCAN_API}`);
		if (result) {
			return result.result;
		}
		return 0;
	}
	if (network === 42161) {
		const	result = await performGet(`https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);
		if (result) {
			return result.result;
		}
		return 0;
	}
	if (network === 100) {
		const	result = await performGet(`https://blockscout.com/xdai/mainnet/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before`);
		if (result) {
			return result.result;
		}
		return 0;
	}

	const	result = await performGet(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);

	if (result) {
		return result.result;
	}
	return 0;
}

export async function fetchCryptoPrice(from = '', to = 'usd'): Promise<any> {
	const	result = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);

	if (result) {
		return result;
	}
	return null;
}

export function getProvider(chain = 1): ethers.providers.BaseProvider {
	if (chain === 1) {
		if (process.env.ALCHEMY_KEY) {
			return new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY);
		}
		return new ethers.providers.InfuraProvider('homestead', '9aa3d95b3bc440fa88ea12eaa4456161');
	}
	if (chain === 56) {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');
	}
	if (chain === 100) {
		return new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com/');
	}
	if (chain === 137) {
		if (process.env.ALCHEMY_KEY_POLYGON) {
			return new ethers.providers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_POLYGON}`);
		}
		return new ethers.providers.JsonRpcProvider('https://rpc-mainnet.matic.network');
	}
	if (chain === 250) {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
	}
	if (chain === 1337) {
		return new ethers.providers.JsonRpcProvider('http://localhost:8545');
	}
	if (chain === 42161) {
		return new ethers.providers.JsonRpcProvider(`https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ARBITRUM_KEY}/arbitrum/mainnet`);
	}
	return (new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY));
}

export function getProviderURI(chain = 1): string {
	if (chain === 1) {
		return (`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`);
	}
	if (chain === 56) {
		return ('https://bsc-dataseed1.defibit.io/');
	}
	if (chain === 100) {
		return ('https://rpc.gnosischain.com/');
	}
	if (chain === 137) {
		return (`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_POLYGON}`);
	}
	if (chain === 250) {
		return ('https://rpc.ftm.tools');
	}
	if (chain === 1337) {
		return ('http://localhost:8545');
	}
	if (chain === 42161) {
		return (`https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ARBITRUM_KEY}/arbitrum/mainnet`);
	}
	return (`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`);
}

export async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => void): Promise<void> {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

export function	parseMarkdown(markdownText: string): string {
	const htmlText = markdownText
		.replace(/\[(.*?)\]\((.*?)\)/gim, "<a class='hover:underline cursor-pointer' target='_blank' href='$2'>$1</a>");

	return htmlText.trim();
}
