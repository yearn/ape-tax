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
	if (network === 43114) {
		const	result = await performGet(`https://api.snowtrace.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.SNOWTRACE_API}`);
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

// export async function fetchCryptoPrice(from = '', to = 'usd'): Promise<any> {
// 	const	result = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);
// 	console.log(result);

// 	if (result) {
// 		return result;
// 	}
// 	return null;
// }

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
