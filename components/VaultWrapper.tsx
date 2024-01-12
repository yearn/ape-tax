import {type ReactElement, useCallback, useEffect, useState} from 'react';
import InfoMessage from 'components/InfoMessage';
import VaultActions from 'components/VaultActions';
import VaultDetails from 'components/VaultDetails';
import VaultStrategies from 'components/VaultStrategies';
import VaultWallet from 'components/VaultWallet';
import {YVAULT_ABI} from 'utils/ABI/yVaultv2.abi';
import {YVAULTV3_ABI} from 'utils/ABI/yVaultv3.abi';
import {maxUint256} from 'viem';
import {erc20ABI, fetchBalance, readContract, readContracts} from '@wagmi/core';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt, decodeAsNumber, decodeAsString} from '@yearn-finance/web-lib/utils/decoder';
import {toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';

import type {TCoinGeckoPrices} from 'schemas/coinGeckoSchemas';
import type {TVault, TVaultData} from 'utils/types';

const		defaultVaultData: TVaultData = {
	loaded: false,
	depositLimit: toNormalizedBN(0),
	totalAssets: toNormalizedBN(0),
	availableDepositLimit: toNormalizedBN(0),
	coinBalance: toNormalizedBN(0),
	balanceOf: toNormalizedBN(0),
	wantBalance: toNormalizedBN(0),
	allowance: toNormalizedBN(0),
	allowanceYRouter: toNormalizedBN(0),
	allowanceZapOut: toNormalizedBN(0),
	pricePerShare: toNormalizedBN(1),
	decimals: 18,
	totalAUM: 0,
	balanceOfValue: 0,
	wantPrice: 0,
	wantPriceError: false,
	progress:  0,
	apiVersion: '-'
};

function	VaultWrapper({vault, prices}: {vault: TVault; prices: TCoinGeckoPrices;}): ReactElement {
	const	{address} = useWeb3();
	const	[vaultData, set_vaultData] = useState<TVaultData>(defaultVaultData);

	const	prepareVaultData = useCallback(async (): Promise<void> => {
		if (!vault || !address) {
			return;
		}

		const data = await readContracts({
			contracts: [
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'totalAssets'},
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'pricePerShare'},
				{abi: erc20ABI, address: toAddress(vault.WANT_ADDR), functionName: 'decimals'},
				{abi: erc20ABI, address: toAddress(vault.WANT_ADDR), functionName: 'balanceOf', args: [toAddress(address)]},
				{abi: erc20ABI, address: toAddress(vault.WANT_ADDR), functionName: 'allowance', args: [toAddress(address), toAddress(vault.VAULT_ADDR)]},
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'balanceOf', args: [toAddress(address)]},
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'apiVersion'},
				{abi: YVAULTV3_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'api_version'},
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'depositLimit'},
				{abi: YVAULT_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'availableDepositLimit'},
				{abi: YVAULTV3_ABI, address: toAddress(vault.VAULT_ADDR), functionName: 'maxDeposit', args: [toAddress(address)]}
			]
		});
		const coinBalance = await fetchBalance({address: address});
		const decimals = decodeAsNumber(data[2]);
		const totalAssets = toNormalizedBN(decodeAsBigInt(data[0]), decimals);
		const pricePerShare = toNormalizedBN(decodeAsBigInt(data[1]), decimals);
		const wantBalance = toNormalizedBN(decodeAsBigInt(data[3]), decimals);
		const wantAllowance = toNormalizedBN(decodeAsBigInt(data[4]), decimals);
		const balanceOf = toNormalizedBN(decodeAsBigInt(data[5]), decimals);
		const apiVersion = decodeAsString(data[6], decodeAsString(data[7], '2'));
		let depositLimit = toNormalizedBN(0n);
		let availableDepositLimit = toNormalizedBN(0n);
		if (vault.VAULT_ABI.startsWith('v3')) {
			depositLimit = toNormalizedBN(decodeAsBigInt(data[10]), decimals);
			availableDepositLimit = toNormalizedBN(decodeAsBigInt(data[10]), decimals);
		} else {
			depositLimit = toNormalizedBN(decodeAsBigInt(data[8]) >= (maxUint256 - 1n) ? decodeAsBigInt(data[8]) : decodeAsBigInt(data[8]) + totalAssets.raw, decimals);
			availableDepositLimit = toNormalizedBN(decodeAsBigInt(data[9]), decimals);
		}
		const price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;

		set_vaultData({
			loaded: true,
			apiVersion,
			decimals,
			depositLimit,
			totalAssets,
			availableDepositLimit,
			pricePerShare,
			coinBalance: toNormalizedBN(coinBalance.value, 18),
			balanceOf,
			balanceOfValue: Number(balanceOf.normalized) * Number(pricePerShare.normalized) * price,
			wantBalance,
			wantPrice: price,
			totalAUM: Number(totalAssets.normalized) * price,
			progress: isZero(depositLimit.raw) ? 1 : (Number(depositLimit.normalized) - Number(availableDepositLimit.normalized)) / Number(depositLimit.normalized),
			allowance: wantAllowance,
			allowanceYRouter: wantAllowance
		});

		if (vault.ZAP_ADDR) {
			const allowanceZapOut = await readContract({
				abi: YVAULT_ABI,
				address: toAddress(vault.VAULT_ADDR),
				functionName: 'allowance',
				args: [address, toAddress(vault.ZAP_ADDR)]
			});
			set_vaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowanceZapOut, decimals)}));
		}

	}, [vault, address, prices]);

	useEffect((): void => {
		prepareVaultData();
	}, [prepareVaultData]);

	useEffect((): void => {
		const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
		set_vaultData((v): TVaultData => ({
			...v,
			wantPrice: price,
			wantPriceError: false,
			balanceOfValue: Number(v.balanceOf.normalized) * Number(v.pricePerShare.normalized) * price,
			totalAUM: Number(v.totalAssets.normalized) * price
		}));

	}, [prices, vault]);

	return (
		<div className={'mt-8 text-neutral-700'}>
			<div>
				<h1 className={'text-7xl leading-120px'}>{vault.LOGO}</h1>
				<h1 className={'text-3xl font-semibold text-neutral-900'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage
				status={vault.VAULT_STATUS} />
			<VaultDetails
				vault={vault}
				vaultData={vaultData} />
			<VaultStrategies
				vault={vault}
				onUpdateVaultData={set_vaultData} />
			<VaultWallet
				vault={vault}
				vaultData={vaultData} />
			<VaultActions
				vault={vault}
				vaultData={vaultData}
				onUpdateVaultData={set_vaultData} />
		</div>
	);
}

export default VaultWrapper;
