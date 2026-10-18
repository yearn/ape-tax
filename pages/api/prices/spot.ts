import type {NextApiRequest, NextApiResponse} from 'next';

const YEARN_PRICES_URL = 'https://prices.yearn.dev/api/prices/spot';
const MAX_SPOT_TOKENS = 50;
const MAX_PRICE_AGE_SECONDS = 24 * 60 * 60;
const SUPPORTED_CHAINS = new Set([
	'ethereum',
	'optimism',
	'gnosis',
	'polygon',
	'sonic',
	'fantom',
	'base',
	'arbitrum',
	'berachain',
	'katana',
	'robinhood',
	'hyperliquid'
]);
const TOKEN_KEY_PATTERN = /^([a-z]+):(0x[a-fA-F0-9]{40})$/;

type TPriceCoin = {
	error?: {code?: unknown; message?: unknown};
	prices?: {price?: unknown; timestamp?: unknown}[];
};
type TSpotResponse = {
	coins?: {
		[key: string]: TPriceCoin;
	};
};

function parseCoins(value: string | string[] | undefined): string[] {
	const rawCoins = Array.isArray(value) ? value[0] : value;
	if (!rawCoins) {
		throw new Error('Missing coins query parameter');
	}

	const parsed: unknown = JSON.parse(rawCoins);
	if (!Array.isArray(parsed)) {
		throw new Error('Coins payload must be an array');
	}
	if (parsed.length > MAX_SPOT_TOKENS) {
		throw new Error(`A maximum of ${MAX_SPOT_TOKENS} tokens is allowed`);
	}

	return [...new Set(parsed.map((value): string => {
		if (typeof value !== 'string') {
			throw new Error('Each coin must be a token key string');
		}
		const match = TOKEN_KEY_PATTERN.exec(value);
		if (!match || !SUPPORTED_CHAINS.has(match[1].toLowerCase())) {
			throw new Error('Each coin must use a supported chain name and token address');
		}
		return `${match[1].toLowerCase()}:${match[2].toLowerCase()}`;
	}))].sort((left, right): number => left.localeCompare(right));
}

function setCacheHeaders(response: NextApiResponse, cacheable: boolean): void {
	const cacheControl = cacheable ? 'public, s-maxage=120, stale-while-revalidate=600' : 'no-store';
	response.setHeader('Cache-Control', cacheControl);
	response.setHeader('Vercel-CDN-Cache-Control', cacheControl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET');
		res.status(405).json({error: 'Method not allowed'});
		return;
	}

	const apiKey = process.env.YEARN_PRICES_API_KEY?.trim();
	if (!apiKey) {
		setCacheHeaders(res, false);
		res.status(500).json({error: 'YEARN_PRICES_API_KEY is not configured'});
		return;
	}

	let coins: string[];
	try {
		coins = parseCoins(req.query.coins);
	} catch (error) {
		setCacheHeaders(res, false);
		res.status(400).json({error: error instanceof Error ? error.message : 'Invalid coins query parameter'});
		return;
	}

	try {
		const upstreamUrl = new URL(YEARN_PRICES_URL);
		upstreamUrl.searchParams.set('coins', JSON.stringify(coins));
		const upstream = await fetch(upstreamUrl, {
			headers: {Authorization: `Bearer ${apiKey}`, Accept: 'application/json'},
			cache: 'no-store'
		});
		const rawBody = await upstream.text();
		let payload: unknown = {};
		try {
			payload = rawBody ? JSON.parse(rawBody) : {};
		} catch {
			payload = {error: 'Price Service returned invalid JSON'};
		}

		if (!upstream.ok) {
			setCacheHeaders(res, false);
			res.status(upstream.status).json(payload);
			return;
		}

		const response = payload as TSpotResponse;
		const prices: {[key: string]: number} = {};
		const missing: string[] = [];
		const stale: string[] = [];
		const errors: {[key: string]: {code: string; message: string}} = {};
		for (const coin of coins) {
			const quote = response.coins?.[coin];
			if (quote?.error) {
				errors[coin] = {
					code: typeof quote.error.code === 'string' ? quote.error.code : 'PRICE_UNAVAILABLE',
					message: typeof quote.error.message === 'string' ? quote.error.message : 'Price is unavailable'
				};
				continue;
			}

			const point = quote?.prices?.[0];
			if (!point || typeof point.price !== 'number' || !Number.isFinite(point.price) || point.price < 0) {
				missing.push(coin);
				continue;
			}
			prices[coin] = point.price;

			const timestamp = point.timestamp;
			if (
				typeof timestamp !== 'number' ||
				!Number.isFinite(timestamp) ||
				timestamp <= 0 ||
				Date.now() / 1000 - timestamp > MAX_PRICE_AGE_SECONDS
			) {
				stale.push(coin);
			}
		}

		setCacheHeaders(res, missing.length === 0 && stale.length === 0 && Object.keys(errors).length === 0);
		res.status(200).json({prices, missing, stale, errors});
	} catch {
		setCacheHeaders(res, false);
		res.status(502).json({error: 'Price Service request failed'});
	}
}
