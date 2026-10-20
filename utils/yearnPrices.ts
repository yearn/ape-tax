export const YEARN_PRICE_CHAIN_NAME_BY_ID: Record<number, string> = {
	1: 'ethereum',
	10: 'optimism',
	100: 'gnosis',
	137: 'polygon',
	146: 'sonic',
	250: 'fantom',
	8453: 'base',
	42161: 'arbitrum',
	80094: 'berachain',
	747474: 'katana',
	4663: 'robinhood',
	999: 'hyperliquid'
};

export type TYearnPriceToken = {chainID: number; address: string};
export type TYearnPriceResponse = {
	prices: Record<string, number>;
	missing: string[];
	stale: string[];
	errors: Record<string, {code: string; message: string}>;
};

export function buildYearnPriceKey(chainID: number, address: string): string | undefined {
	const chainName = YEARN_PRICE_CHAIN_NAME_BY_ID[chainID];
	if (!chainName || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
		return undefined;
	}
	return `${chainName}:${address.toLowerCase()}`;
}

export function buildYearnPriceKeys(tokens: TYearnPriceToken[]): string[] {
	return [...new Set(tokens.flatMap(token => {
		const key = buildYearnPriceKey(token.chainID, token.address);
		return key ? [key] : [];
	}))].sort();
}

export function chunkYearnPriceKeys(keys: string[]): string[][] {
	return Array.from({length: Math.ceil(keys.length / 50)}, (_, index) => keys.slice(index * 50, (index + 1) * 50));
}

export async function fetchYearnPriceBatch(keys: string[]): Promise<TYearnPriceResponse> {
	const query = encodeURIComponent(JSON.stringify(keys));
	const response = await fetch(`/api/prices/spot?coins=${query}`);
	const payload = await response.json() as TYearnPriceResponse & {error?: string | {message?: string}};
	if (!response.ok) {
		const message = typeof payload.error === 'string' ? payload.error : payload.error?.message;
		throw new Error(message || `Price Service request failed (${response.status})`);
	}
	return payload;
}
