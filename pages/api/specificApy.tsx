import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import FACTORY_ABI from 'utils/ABI/factory.abi.json';
import YVAULT_ABI from 'utils/ABI/yVault.abi.json';
import {fetchBlockTimestamp, getProvider} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {getProvider as getLibProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

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

	const	currentProvider = getProvider(vault?.CHAIN_ID || 1);
	const	ethcallProvider = await newEthCallProvider(currentProvider);
	const	contract = new Contract(vault.VAULT_ADDR, YVAULT_ABI as never);

	if (activationTimestamp > oneWeekAgo) {
		_grossAPRWeek = '-';
		_grossAPRMonth = '-';
	} else if (activationTimestamp > oneMonthAgo) {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);
		const	[_pastPricePerShareWeek] = await ethcallProvider.tryAll([contract.pricePerShare()], blockOneWeekAgo) as [string];
		const	pastPriceWeek = Number(ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber()));
		const	weekRoi = (currentPrice / pastPriceWeek - 1);

		_grossAPRWeek = (weekRoi ? `${((weekRoi * 100) / 7 * 365).toFixed(2)}%` : '-');
		_grossAPRMonth = '-';
	} else {
		const	blockOneWeekAgo = Number(await fetchBlockTimestamp(oneWeekAgo, vault?.CHAIN_ID || 1) || 0);
		const	blockOneMonthAgo = Number(await fetchBlockTimestamp(oneMonthAgo, vault?.CHAIN_ID || 1) || 0);
		const [[_pastPricePerShareWeek], [_pastPricePerShareMonth]] = await Promise.all([
			ethcallProvider.tryAll([contract.pricePerShare()], blockOneWeekAgo),
			ethcallProvider.tryAll([contract.pricePerShare()], blockOneMonthAgo)
		]) as [[string], [string]];

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
	const	currentProvider = getLibProvider(1 || 1337);
	const	ethcallProvider = await newEthCallProvider(currentProvider);

	const	contract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS as string, FACTORY_ABI);
	const	[numVaults] = await ethcallProvider.tryAll([contract.numVaults()]) as [BigNumber];

	const	vaultListCalls = [];
	for (let i = 0; i < Number(numVaults); i++) {
		vaultListCalls.push(contract.deployedVaults(i));
	}
	const	deployedVaults = await ethcallProvider.tryAll(vaultListCalls) as string[];

	const	vaultDetailsCalls = [];
	for (const vault of deployedVaults) {
		const	vaultContract = new Contract(vault, YVAULT_ABI as never);
		vaultDetailsCalls.push(vaultContract.name());
		vaultDetailsCalls.push(vaultContract.symbol());
		vaultDetailsCalls.push(vaultContract.token());
	}
	const	vaultDetails = await ethcallProvider.tryAll(vaultDetailsCalls) as string[];

	const	vaults = [];
	let		rIndex = 0;
	for (let i = 0; i < Number(numVaults); i++) {
		const	name = vaultDetails[rIndex++];
		const	symbol = vaultDetails[rIndex++];
		const	token = vaultDetails[rIndex++];
		vaults.push({
			LOGO: '🦍🦍',
			VAULT_ABI: 'yVaultV2',
			VAULT_TYPE: 'community',
			VAULT_ADDR: toAddress(deployedVaults[i]),
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

async function getSpecificAPY({network, address, rpc}: {network: number, address: string, rpc: string}): Promise<TSpecificAPIResult> {
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider);
	const	vaultContractMultiCall = new Contract(address, YVAULT_ABI as never);
	let		vaultToUse = Object.values(vaults).find((v): boolean => (v.VAULT_ADDR).toLowerCase() === address.toLowerCase());

	const	callResult = await ethcallProvider.tryAll([
		vaultContractMultiCall.pricePerShare(),
		vaultContractMultiCall.decimals(),
		vaultContractMultiCall.activation()
	]);
	const	[pricePerShare, decimals, activation] = callResult as [BigNumber, BigNumber, BigNumber];

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
	const	{address, network, rpc, revalidate} = req.query;

	const	networkNumber = Number(network);
	const	addressLowercase = (address as string).toLowerCase();

	const	now = new Date().getTime();
	const	lastAccess = specificApyMappingAccess[addressLowercase] || 0;
	if (lastAccess === 0 || ((now - lastAccess) > 10 * 60 * 1000) || revalidate === 'true' || !specificApyMapping[addressLowercase]) {
		const	result = await getSpecificAPY({network: networkNumber, address: addressLowercase, rpc: rpc as string});
		specificApyMapping[addressLowercase] = result;
		specificApyMappingAccess[addressLowercase] = now;
	}
	res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutes
	return res.status(200).json(specificApyMapping[addressLowercase]);
}

export {prepareGrossData};
