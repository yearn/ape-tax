import {ethers} from 'ethers';
import BALANCER_FACTORY_ABI from 'utils/ABI/balancerFactory.abi';
import YVAULT_ABI from 'utils/ABI/yVault.abi';
import {fetchBlockTimestamp} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {getPublicClient} from '@wagmi/core';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {formatToNormalizedValue} from '@yearn-finance/web-lib/utils/format.bigNumber';

import type {NextApiRequest, NextApiResponse} from 'next';
import type {TSpecificAPIResult, TVault} from 'utils/types';
import type {ContractFunctionConfig} from 'viem';
import type {TDict} from '@yearn-finance/web-lib/types';

async function	prepareGrossData({vault, pricePerShare, decimals, activation}: {
	vault: TVault;
	pricePerShare: bigint;
	decimals: bigint;
	activation: number;
}): Promise<TSpecificAPIResult> {
	let	_grossAPRWeek = '-';
	let	_grossAPRMonth = '-';
	let	_grossAPRInception = '-';
	const activationTimestamp = Number(activation);
	const oneWeekAgo = Number((new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0));
	const oneMonthAgo = Number((new Date(Date.now() - 30.5 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0));
	const currentPrice = formatToNormalizedValue(pricePerShare, Number(decimals));
	const multicallInstance = getPublicClient({chainId: vault?.CHAIN_ID || 1}).multicall;

	if (activationTimestamp > oneWeekAgo) {
		_grossAPRWeek = '-';
		_grossAPRMonth = '-';
	} else if (activationTimestamp > oneMonthAgo) {

		const weekTimestamp = await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1);
		const blockOneWeekAgo = weekTimestamp.data?.result || 0;

		const calls: ContractFunctionConfig[] = [];
		const yVaultContract = {address: toAddress(vault.VAULT_ADDR), abi: YVAULT_ABI};
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneWeekAgo]});

		const ppsData = await multicallInstance({contracts: calls as never[]});
		const _pastPricePerShareWeek = decodeAsBigInt(ppsData[0]);
		const pastPriceWeek = formatToNormalizedValue(_pastPricePerShareWeek, Number(decimals));
		const weekRoi = (currentPrice / pastPriceWeek - 1);

		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = '-';
	} else {
		const weekTimestamp = await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1);
		const blockOneWeekAgo = weekTimestamp.data?.result || 0;

		const monthTimestamp = await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1);
		const blockOneMonthAgo = monthTimestamp.data?.result || 0;

		const calls: ContractFunctionConfig[] = [];
		const yVaultContract = {address: toAddress(vault.VAULT_ADDR), abi: YVAULT_ABI};
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneWeekAgo]});
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneMonthAgo]});

		const ppsData = await multicallInstance({contracts: calls as never[]});
		const _pastPricePerShareWeek = decodeAsBigInt(ppsData[0]);
		const _pastPricePerShareMonth = decodeAsBigInt(ppsData[1]);

		const pastPriceWeek = Number(ethers.utils.formatUnits(_pastPricePerShareWeek, Number(decimals)));
		const pastPriceMonth = Number(ethers.utils.formatUnits(_pastPricePerShareMonth, Number(decimals)));
		const weekRoi = (currentPrice / pastPriceWeek - 1);
		const monthRoi = (currentPrice / pastPriceMonth - 1);
		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = (monthRoi ? `${((monthRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
	}

	const inceptionROI = (currentPrice - 1);
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

async function getCommunityVaults(): Promise<TVault[]> {
	const BALANCER_FACTORY_ADDRESS = toAddress(process.env.YEARN_BALANCER_FACTORY_ADDRESS);
	const multicallInstance = getPublicClient({chainId: 1}).multicall;
	const readContractInstance = getPublicClient({chainId: 1}).readContract;

	const numVaults = await readContractInstance({
		address: BALANCER_FACTORY_ADDRESS,
		abi: BALANCER_FACTORY_ABI,
		functionName: 'numVaults'
	});

	const vaultListCalls = [];
	for (let i = 0; i < Number(numVaults); i++) {
		const balancerFactoryContract = {address: BALANCER_FACTORY_ADDRESS, abi: BALANCER_FACTORY_ABI};
		vaultListCalls.push({...balancerFactoryContract, functionName: 'deployedVaults', args: [i]});
	}

	const deployedVaults = await multicallInstance({contracts: vaultListCalls});
	const vaultDetailsCalls = [];
	for (const vault of deployedVaults) {
		const VAULT_ADDRESS = toAddress(vault.result as string);
		const vaultContract = {address: VAULT_ADDRESS, abi: VAULT_ABI};
		vaultDetailsCalls.push({...vaultContract, functionName: 'name'});
		vaultDetailsCalls.push({...vaultContract, functionName: 'symbol'});
		vaultDetailsCalls.push({...vaultContract, functionName: 'token'});
	}

	const vaultDetails = await multicallInstance({contracts: vaultDetailsCalls});
	const vaults: TVault[] = [];
	let	rIndex = 0;
	for (let i = 0; i < Number(numVaults); i++) {
		const name = vaultDetails[rIndex++].result as string;
		const symbol = vaultDetails[rIndex++].result as string;
		const token = vaultDetails[rIndex++].result as string;
		vaults.push({
			LOGO: '🦍🦍',
			VAULT_ABI: 'yVaultV2',
			VAULT_TYPE: 'community',
			VAULT_ADDR: toAddress(deployedVaults[i].result as string),
			TITLE: name,
			SYMBOL: symbol,
			WANT_ADDR: toAddress(token),
			WANT_SYMBOL: symbol.replace('yvBlp', ''),
			COINGECKO_SYMBOL: '',
			VAULT_STATUS: 'active',
			CHAIN_ID: 1,
			PRICE_SOURCE: 'Lens 🔮'
		});
	}

	return vaults;
}

async function getSpecificAPY({network, address}: {network: number, address: string}): Promise<TSpecificAPIResult> {
	const multicallInstance = getPublicClient({chainId: network || 1}).multicall;
	const apyCalls = [];
	const vaultContract = {address: toAddress(address), abi: VAULT_ABI};
	apyCalls.push({...vaultContract, functionName: 'pricePerShare'});
	apyCalls.push({...vaultContract, functionName: 'decimals'});
	apyCalls.push({...vaultContract, functionName: 'activation'});

	const callResult = await multicallInstance({contracts: apyCalls});
	const pricePerShare = decodeAsBigInt(callResult[0]);
	const decimals = decodeAsBigInt(callResult[1]);
	const activation = decodeAsBigInt(callResult[2]);

	let vaultToUse = Object.values(vaults).find((v): boolean => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());
	if (!vaultToUse) {
		const communityVaults = await getCommunityVaults();
		vaultToUse = Object.values(communityVaults).find((v): boolean => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());
	}

	return prepareGrossData({
		vault: vaultToUse as TVault,
		pricePerShare,
		decimals,
		activation: Number(activation)
	});
}


const specificApyMapping: TDict<TSpecificAPIResult> = {};
const specificApyMappingAccess: TDict<number> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse<TSpecificAPIResult>): Promise<void> {
	const {address, network, revalidate} = req.query;

	const networkNumber = Number(network);
	const addressLowercase = (address as string).toLowerCase();

	const now = new Date().getTime();
	const lastAccess = specificApyMappingAccess[addressLowercase] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !specificApyMapping[addressLowercase]) {
		const result = await getSpecificAPY({network: networkNumber, address: addressLowercase});
		specificApyMapping[addressLowercase] = result;
		specificApyMappingAccess[addressLowercase] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(specificApyMapping[addressLowercase]);
}

export {prepareGrossData};
