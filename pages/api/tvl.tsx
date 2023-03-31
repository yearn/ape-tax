import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import yVaultABI from 'utils/ABI/yVault.abi.json';
import {getProvider, performGet} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {Call} from 'ethcall';
import type {BigNumber} from 'ethers';
import type {NextApiRequest, NextApiResponse} from 'next';
import type {TTVL} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';

function chunk<T>(arr: T[], size: number): T[][] {
	return arr.reduce((acc: T[][], e: T, i: number): T[][] => (i % size ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);
}

async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

async function getTVL({network, rpc}: {network: number, rpc: string}): Promise<TTVL> {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider);
	const	_calls: Call[] = [];
	const	_cgIDS: string[] = [];
	let		_tvlEndorsed = 0;
	let		_tvlExperimental = 0;
	let		_tvlDeprecated = 0;

	Object.values(vaults).forEach((v): void => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const	vaultContract = new Contract(v.VAULT_ADDR, yVaultABI as never);
		_calls.push(...[
			vaultContract.totalAssets(),
			vaultContract.decimals()
		]);
		_cgIDS.push(v.COINGECKO_SYMBOL);
	});
	const	callResult = await ethcallProvider.tryAll(_calls);
	const	chunkedCallResult = chunk(callResult, 2);
	const	prices = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${_cgIDS}&vs_currencies=usd`);
	let		index = 0;

	await asyncForEach(Object.entries(vaults), async ([, v]): Promise<void> => {
		if (v.CHAIN_ID !== network || v.VAULT_STATUS === 'stealth' || v.VAULT_TYPE === 'weird') {
			return;
		}
		const	[totalAssets, decimals] = chunkedCallResult[index] as [BigNumber, BigNumber];
		const	price = prices?.[v.COINGECKO_SYMBOL.toLowerCase()]?.usd || 0;
		const	dec = Number(decimals);
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
	const	{network, rpc, revalidate} = req.query;
	const	networkNumber = Number(network);

	const	now = new Date().getTime();
	const	lastAccess = tvlMappingAccess[networkNumber] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 5 * 60 * 1000) || revalidate === 'true' || !tvlMapping[networkNumber]) {
		const	result = await getTVL({network: networkNumber, rpc: rpc as string});
		tvlMapping[networkNumber] = result;
		tvlMappingAccess[networkNumber] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=300'); // 5 minutes
	return res.status(200).json(tvlMapping[networkNumber]);
}
