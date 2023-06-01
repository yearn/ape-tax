import {Contract} from 'ethcall';
import {BigNumber, ethers} from 'ethers';
import {prepareGrossData} from 'pages/api/specificApy';
import yVaultABI from 'utils/ABI/yVault.abi.json';
import {fn} from 'utils/fn';
import {getProvider} from 'utils/utils';
import vaults from 'utils/vaults.json';
import {newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {Call} from 'ethcall';
import type {TAPIVault} from 'utils/types';

function chunk<T>(arr: T[], size: number): T[][] {
	return arr.reduce((acc: T[][], e: T, i: number): T[][] => (i % size ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);
}

async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

export default fn(async ({network = 1, rpc = '', status = 'active', apy = 0}): Promise<any> => {
	const	numberNetwork = Number(network);
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await newEthCallProvider(provider);
	const	_vaults: TAPIVault[] = [];
	const	_calls: Call[] = [];

	Object.values(vaults).forEach((v): void => {
		if (v.CHAIN_ID !== numberNetwork || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'ape-active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new')) {
			return;
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;
		}
		const	vaultContract = new Contract(v.VAULT_ADDR, yVaultABI as never);
		_calls.push(...[
			vaultContract.apiVersion(),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.activation()
		]);
	});
	let		isCallASuccess = true;
	let		chunkedCallResult: unknown[] = [];
	try {
		const	callResult = await ethcallProvider.tryAll(_calls);
		chunkedCallResult = chunk(callResult, 7);
	} catch (error) {
		isCallASuccess = false;
		console.error(error);
	}
	let		index = 0;

	await asyncForEach(Object.entries(vaults), async ([k, v]): Promise<void> => {
		if (v.CHAIN_ID !== numberNetwork || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'ape-active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new')) {
			return;
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;
		}
		let	apiVersion = '0';
		let	depositLimit = BigNumber.from(0);
		let	totalAssets = BigNumber.from(0);
		let	availableDepositLimit = BigNumber.from(0);
		let	pricePerShare = BigNumber.from(0);
		let	decimals = BigNumber.from(18);
		let	activation = 0;

		if (isCallASuccess) {
			[apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, activation] = chunkedCallResult[index] as [
				string,
				BigNumber,
				BigNumber,
				BigNumber,
				BigNumber,
				BigNumber,
				number
			];
		}
		const	numberDecimals = Number(decimals);
		index++;

		if (apy === 1) {
			const	grossData = await prepareGrossData({
				vault: v,
				pricePerShare,
				decimals,
				activation
			});
			_vaults.push({
				title: v.TITLE,
				logo: v.LOGO,
				displayName: `${v.LOGO} ${v.TITLE}`,
				src: `https://ape.tax/${k}`,
				status: v.VAULT_STATUS,
				type: v.VAULT_TYPE,
				address: v.VAULT_ADDR,
				network: v.CHAIN_ID,
				data: {
					apiVersion: apiVersion,
					depositLimit: ethers.utils.formatUnits(depositLimit, numberDecimals),
					totalAssets: ethers.utils.formatUnits(totalAssets, numberDecimals),
					availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, numberDecimals),
					pricePerShare: ethers.utils.formatUnits(pricePerShare, numberDecimals),
					decimals: numberDecimals,
					activation: Number(activation)
				},
				APY: {
					week: grossData.week,
					month: grossData.month,
					inception: grossData.inception
				},
				want: {
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL
				}
			});
		} else {
			_vaults.push({
				title: v.TITLE,
				logo: v.LOGO,
				displayName: `${v.LOGO} ${v.TITLE}`,
				src: `https://ape.tax/${k}`,
				status: v.VAULT_STATUS,
				type: v.VAULT_TYPE,
				address: v.VAULT_ADDR,
				network: v.CHAIN_ID,
				data: {
					apiVersion: apiVersion,
					depositLimit: ethers.utils.formatUnits(depositLimit, numberDecimals),
					totalAssets: ethers.utils.formatUnits(totalAssets, numberDecimals),
					availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, numberDecimals),
					pricePerShare: ethers.utils.formatUnits(pricePerShare, numberDecimals),
					decimals: numberDecimals,
					activation: Number(activation)
				},
				want: {
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL
				}
			});
		}
	});
	return _vaults;
}, {maxAge: 10 * 60}); //10 mn
