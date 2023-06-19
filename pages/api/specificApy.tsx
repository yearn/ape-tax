import {ethers} from 'ethers';
import BALANCER_FACTORY_ABI from 'utils/ABI/balancerFactory.abi';
import YVAULT_ABI from 'utils/ABI/yVault.abi';
import {fetchBlockTimestamp} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {multicall, readContract} from '@wagmi/core';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';

import type {BigNumber} from 'ethers';
import type {NextApiRequest, NextApiResponse} from 'next';
import type {TSpecificAPIResult, TVault} from 'utils/types';
import type {TDict} from '@yearn-finance/web-lib/types';

async function	prepareGrossData({vault, pricePerShare, decimals, activation}: {
	vault: TVault;
	pricePerShare: BigNumber;
	decimals: BigNumber;
	activation: number;
}): Promise<TSpecificAPIResult> {
	let		_grossAPRWeek = '-';
	let		_grossAPRMonth = '-';
	let		_grossAPRInception = '-';
	const	activationTimestamp = Number(activation);
	const	oneWeekAgo = Number((new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0));
	const	oneMonthAgo = Number((new Date(Date.now() - 30.5 * 24 * 60 * 60 * 1000).valueOf() / 1000).toFixed(0));
	const	currentPrice = Number(ethers.utils.formatUnits(pricePerShare, decimals.toNumber()));

	if (activationTimestamp > oneWeekAgo) {
		_grossAPRWeek = '-';
		_grossAPRMonth = '-';
	} else if (activationTimestamp > oneMonthAgo) {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);

		const calls = [];
		const yVaultContract = {address: toAddress(vault.VAULT_ADDR), abi: YVAULT_ABI};
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneWeekAgo]});

		const ppsData = await multicall({contracts: calls, chainId: vault?.CHAIN_ID || 1});
		const _pastPricePerShareWeek = ppsData[0].result as string;

		const	pastPriceWeek = Number(ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber()));
		const	weekRoi = (currentPrice / pastPriceWeek - 1);

		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = '-';
	} else {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);
		const	blockOneMonthAgo = Number(await fetchBlockTimestamp(oneMonthAgo, vault?.CHAIN_ID || 1) || 0);

		const calls = [];
		const yVaultContract = {address: toAddress(vault.VAULT_ADDR), abi: YVAULT_ABI};
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneWeekAgo]});
		calls.push({...yVaultContract, functionName: 'pricePerShare', args: [blockOneMonthAgo]});

		const ppsData = await multicall({contracts: calls, chainId: vault?.CHAIN_ID || 1});
		const _pastPricePerShareWeek = ppsData[0].result as string;
		const _pastPricePerShareMonth = ppsData[0].result as string;

		const	pastPriceWeek = Number(ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber()));
		const	pastPriceMonth = Number(ethers.utils.formatUnits(_pastPricePerShareMonth, decimals.toNumber()));
		const	weekRoi = (currentPrice / pastPriceWeek - 1);
		const	monthRoi = (currentPrice / pastPriceMonth - 1);
		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = (monthRoi ? `${((monthRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
	}

	const	inceptionROI = (currentPrice - 1);
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

	const numVaults = await readContract({
		address: BALANCER_FACTORY_ADDRESS,
		abi: BALANCER_FACTORY_ABI,
		functionName: 'numVaults'
	});

	const	vaultListCalls = [];
	for (let i = 0; i < Number(numVaults); i++) {
		const balancerFactoryContract = {address: BALANCER_FACTORY_ADDRESS, abi: BALANCER_FACTORY_ABI};
		vaultListCalls.push({...balancerFactoryContract, functionName: 'deployedVaults', args: [i]});
	}

	const deployedVaults = await multicall({contracts: vaultListCalls, chainId: 1});

	const	vaultDetailsCalls = [];
	for (const vault of deployedVaults) {
		const VAULT_ADDRESS = toAddress(vault.result as string);
		const vaultContract = {address: VAULT_ADDRESS, abi: VAULT_ABI};
		vaultDetailsCalls.push({...vaultContract, functionName: 'name'});
		vaultDetailsCalls.push({...vaultContract, functionName: 'symbol'});
		vaultDetailsCalls.push({...vaultContract, functionName: 'token'});
	}

	const vaultDetails = await multicall({contracts: vaultDetailsCalls, chainId: 1});

	const	vaults = [];
	let		rIndex = 0;
	for (let i = 0; i < Number(numVaults); i++) {
		const	name = vaultDetails[rIndex++].result as string;
		const	symbol = vaultDetails[rIndex++].result as string;
		const	token = vaultDetails[rIndex++].result as string;
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
	const	apyCalls = [];
	const vaultContract = {address: toAddress(address), abi: VAULT_ABI};
	apyCalls.push({...vaultContract, functionName: 'pricePerShare'});
	apyCalls.push({...vaultContract, functionName: 'decimals'});
	apyCalls.push({...vaultContract, functionName: 'activation'});

	const callResult = await multicall({contracts: apyCalls, chainId: network || 1});
	const pricePerShare = callResult[0].result as BigNumber;
	const decimals = callResult[1].result as BigNumber;
	const activation = callResult[2].result as BigNumber;

	let vaultToUse = Object.values(vaults).find((v): boolean => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());

	if (!vaultToUse) {
		const	communityVaults = await getCommunityVaults();
		vaultToUse = Object.values(communityVaults).find((v): boolean => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());
	}

	return prepareGrossData({
		vault: vaultToUse as TVault,
		pricePerShare,
		decimals,
		activation: Number(activation)
	});
}


const	specificApyMapping: TDict<TSpecificAPIResult> = {};
const	specificApyMappingAccess: TDict<number> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse<TSpecificAPIResult>): Promise<void> {
	const	{address, network, revalidate} = req.query;

	const	networkNumber = Number(network);
	const	addressLowercase = (address as string).toLowerCase();

	const	now = new Date().getTime();
	const	lastAccess = specificApyMappingAccess[addressLowercase] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !specificApyMapping[addressLowercase]) {
		const	result = await getSpecificAPY({network: networkNumber, address: addressLowercase});
		specificApyMapping[addressLowercase] = result;
		specificApyMappingAccess[addressLowercase] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(specificApyMapping[addressLowercase]);
}

export {prepareGrossData};
