import {z} from 'zod';

import {fetch, type TFetchReturn} from './fetch';

export const blockTimestampResponseSchema = z.object({
	status: z.string(),
	message: z.string(),
	result: z.string()
});

export type TBlockTimestampDetails = z.infer<typeof blockTimestampResponseSchema>;

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
		const blockTimestampQueryParams = new URLSearchParams({
			module: 'block',
			action: 'getblocknobytime',
			timestamp: timestamp.toString(),
			closest:'before',
			apikey: process.env.POLYGONSCAN_API || ''
		});

		return fetch<TBlockTimestampDetails>({
			endpoint: `https://api.polygonscan.com/api?=${new URLSearchParams(blockTimestampQueryParams)}`,
			schema: blockTimestampResponseSchema
		});
	}

	if (network === 42161) {
		const blockTimestampQueryParams = new URLSearchParams({
			module: 'block',
			action: 'getblocknobytime',
			timestamp: timestamp.toString(),
			closest:'before',
			apikey: process.env.ETHERSCAN_API || ''
		});
		return fetch<TBlockTimestampDetails>({
			endpoint: `https://api.arbiscan.io/api?=${new URLSearchParams(blockTimestampQueryParams)}`,
			schema: blockTimestampResponseSchema
		});
	}

	if(network === 8453) {
		const blockTimestampQueryParams = new URLSearchParams({
			module: 'block',
			action: 'getblocknobytime',
			timestamp: timestamp.toString(),
			closest:'before',
			apikey: process.env.BASESCAN_API || ''
		});
		return fetch<TBlockTimestampDetails>({
			endpoint: `https://api.basescan.org/api?=${new URLSearchParams(blockTimestampQueryParams)}`,
			schema: blockTimestampResponseSchema
		});
	}

	const blockTimestampQueryParams = new URLSearchParams({
		module: 'block',
		action: 'getblocknobytime',
		timestamp: timestamp.toString(),
		closest:'before',
		apikey: process.env.ETHERSCAN_API || ''
	});
	return fetch<TBlockTimestampDetails>({
		endpoint: `https://api.etherscan.io/api?=${new URLSearchParams(blockTimestampQueryParams)}`,
		schema: blockTimestampResponseSchema
	});
}

export async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => void): Promise<void> {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}
