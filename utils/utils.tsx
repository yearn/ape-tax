import {z} from 'zod';
import axios from 'axios';

import {fetch} from './fetch';

import type {AxiosError, AxiosResponse} from 'axios';
import type {TFetchReturn} from './fetch';

export const blockTimestampResponseSchema = z.object({
	status: z.string(),
	message: z.string(),
	result: z.number()
});

export type TBlockTimestampDetails = z.infer<typeof blockTimestampResponseSchema>;

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

export async function fetchBlockTimestamp(timestamp: number, network = 1): TFetchReturn<TBlockTimestampDetails> {
	if (network === 250) {
		const blockTimestampQueryParams = new URLSearchParams({
			module: 'block',
			action: 'getblocknobytime',
			timestamp: timestamp.toString(),
			closest:'before',
			apikey: process.env.FTMSCAN_API || ''
		});
		
		return fetch<TBlockTimestampDetails>({
			endpoint: `https://api.ftmscan.com/api?=${new URLSearchParams(blockTimestampQueryParams)}`,
			schema: blockTimestampResponseSchema
		});
	}

	if (network === 137) {
		const baseURL = 'https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp';

		return fetch<TBlockTimestampDetails>({
			endpoint: `${baseURL}=${new URLSearchParams(`${timestamp}`)}&closest=before&apikey=${process.env.POLYGONSCAN_API}`,
			schema: blockTimestampResponseSchema
		});
	}

	if (network === 42161) {
		const baseURL = 'https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp';

		return fetch<TBlockTimestampDetails>({
			endpoint: `${baseURL}=${new URLSearchParams(`${timestamp}`)}&closest=before&apikey=${process.env.ETHERSCAN_API}`,
			schema: blockTimestampResponseSchema
		});
	}


	const baseURL = 'https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp';
				
	return fetch<TBlockTimestampDetails>({
		endpoint: `${baseURL}=${new URLSearchParams(`${timestamp}`)}&closest=before&apikey=${process.env.ETHERSCAN_API}`,
		schema: blockTimestampResponseSchema
	});
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

// export async function fetchCryptoPrice(from = '', to = 'usd'): Promise<any> {
// 	const	result = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);
// 	console.log(result);

// 	if (result) {
// 		return result;
// 	}
// 	return null;
// }
