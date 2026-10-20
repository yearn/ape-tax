import useSWR from 'swr';
import vaults from 'utils/vaults.json';
import {buildYearnPriceKeys, chunkYearnPriceKeys, fetchYearnPriceBatch, type TYearnPriceResponse} from 'utils/yearnPrices';

const vaultPriceKeys = buildYearnPriceKeys(Object.values(vaults).map(vault => ({
	chainID: vault.CHAIN_ID,
	address: vault.WANT_ADDR
})));

async function fetchYearnPrices(): Promise<TYearnPriceResponse> {
	const batches = chunkYearnPriceKeys(vaultPriceKeys);
	const responses = await Promise.all(batches.map(fetchYearnPriceBatch));
	return responses.reduce<TYearnPriceResponse>((merged, response) => ({
		prices: {...merged.prices, ...response.prices},
		missing: [...merged.missing, ...response.missing],
		stale: [...merged.stale, ...response.stale],
		errors: {...merged.errors, ...response.errors}
	}), {prices: {}, missing: [], stale: [], errors: {}});
}

export function useYearnPrices(): {
	prices: Record<string, number>;
	missing: string[];
	stale: string[];
	errors: Record<string, {code: string; message: string}>;
	error: Error | undefined;
} {
	const {data, error} = useSWR(
		vaultPriceKeys.length ? `yearn-prices:${vaultPriceKeys.join('|')}` : null,
		fetchYearnPrices,
		{dedupingInterval: 120_000, refreshInterval: 120_000, revalidateOnFocus: false}
	);
	const unavailable = new Set([...(data?.missing ?? []), ...(data?.stale ?? []), ...Object.keys(data?.errors ?? {})]);
	const prices = error
		? {}
		: Object.fromEntries(Object.entries(data?.prices ?? {}).filter(([key]) => !unavailable.has(key)));

	return {
		prices,
		missing: data?.missing ?? [],
		stale: data?.stale ?? [],
		errors: data?.errors ?? {},
		error
	};
}
