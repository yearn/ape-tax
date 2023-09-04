import {ethers} from 'ethers';
import {coinGeckoPricesSchema} from 'schemas/coinGeckoSchemas';
import vaults from 'utils/vaults.json';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {getClient} from '@yearn-finance/web-lib/utils/wagmi/utils';

import {fetch} from '../../utils/fetch';

import type {NextApiRequest, NextApiResponse} from 'next';
import type {TCoinGeckoPrices} from 'schemas/coinGeckoSchemas';
import type {TTVL} from 'utils/types';
import type {ContractFunctionConfig} from 'viem';
import type {TNDict} from '@yearn-finance/web-lib/types';

function chunk<T>(arr: T[], size: number): T[][] {
	return arr.reduce((acc: T[][], e: T, i: number): T[][] => (i % size ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);
}

async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

async function getTVL({network}: {network: number}): Promise<TTVL> {
	const multicallInstance = getClient(network || 1).multicall;
	const tvlCalls: ContractFunctionConfig[] = [];
	const _cgIDS: string[] = [];
	let _tvlEndorsed = 0;
	let _tvlExperimental = 0;
	let _tvlDeprecated = 0;

	Object.values(vaults).forEach((v): void => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const vaultContract = {address: toAddress(v.VAULT_ADDR), abi: VAULT_ABI};
		tvlCalls.push({...vaultContract, functionName: 'totalAssets'});
		tvlCalls.push({...vaultContract, functionName: 'decimals'});

		_cgIDS.push(v.COINGECKO_SYMBOL);
	});

	const callResult = await multicallInstance({contracts: tvlCalls as never[]});
	const chunkedCallResult = chunk(callResult, 2);
	const cgPricesQueryParams = new URLSearchParams({
		ids: `${_cgIDS}`,
		vs_currencies: 'usd'
	});

	const {data: cgPrices} = await fetch<TCoinGeckoPrices>({
		endpoint: `https://api.coingecko.com/api/v3/simple/price?${cgPricesQueryParams}`,
		schema: coinGeckoPricesSchema
	});

	let index = 0;

	await asyncForEach(Object.entries(vaults), async ([, v]): Promise<void> => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const totalAssets = decodeAsBigInt(chunkedCallResult[index][0]);
		const decimals = decodeAsBigInt(chunkedCallResult[index][1]);
		const price = cgPrices?.[v.COINGECKO_SYMBOL.toLowerCase()]?.usd || 0;
		const dec = Number(decimals);
		index++;

		if (v.VAULT_STATUS === 'endorsed') {
			_tvlEndorsed += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		} else if (v.VAULT_STATUS === 'withdraw') {
			_tvlDeprecated += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		} else {
			_tvlExperimental += Number(ethers.utils.formatUnits(totalAssets, dec)) * price;
		}
	});
	return {
		tvlEndorsed: _tvlEndorsed,
		tvlExperimental: _tvlExperimental,
		tvlDeprecated: _tvlDeprecated,
		tvl: _tvlEndorsed + _tvlExperimental + _tvlDeprecated
	};
}

const tvlMapping: TNDict<TTVL> = {};
const tvlMappingAccess: TNDict<number> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse<TNDict<TTVL>>): Promise<void> {
	const {network, revalidate} = req.query;
	const networkNumber = Number(network);

	const now = new Date().getTime();
	const lastAccess = tvlMappingAccess[networkNumber] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 5 * 60 * 1000) || revalidate === 'true' || !tvlMapping[networkNumber]) {
		const result = await getTVL({network: networkNumber});
		tvlMapping[networkNumber] = result;
		tvlMappingAccess[networkNumber] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=300'); // 5 minutes
	return res.status(200).json(tvlMapping[networkNumber]);
}
