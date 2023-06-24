import {useCallback, useEffect, useState} from 'react';
import InfoMessage from 'components/InfoMessage';
import VaultActions from 'components/VaultActions';
import VaultDetails from 'components/VaultDetails';
import VaultStrategies from 'components/VaultStrategies';
import VaultWallet from 'components/VaultWallet';
import {ethers} from 'ethers';
import LENS_ABI from 'utils/ABI/lens.abi';
import {fetchBalance, multicall, readContract} from '@wagmi/core';
import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';

import type {ReactElement} from 'react';
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

function	VaultWrapper({vault, prices}: {vault: TVault; prices: any;}): ReactElement {
	const	{address, chainID} = useWeb3();
	const	{networks} = useSettings();
	const	[vaultData, set_vaultData] = useState<TVaultData>(defaultVaultData);

	const	prepareVaultData = useCallback(async (): Promise<void> => {
		if (!vault || !address) {
			return;
		}

		const calls = [];
		const wantContractMultiCall = {
			address: toAddress(vault.WANT_ADDR),
			abi: [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			]
		};
		const vaultContractMultiCall = {
			address: toAddress(vault.VAULT_ADDR),
			abi: VAULT_ABI
		};

		calls.push({...vaultContractMultiCall, functionName: 'apiVersion'});
		calls.push({...vaultContractMultiCall, functionName: 'depositLimit'});
		calls.push({...vaultContractMultiCall, functionName: 'totalAssets'});
		calls.push({...vaultContractMultiCall, functionName: 'availableDepositLimit'});
		calls.push({...vaultContractMultiCall, functionName: 'pricePerShare'});
		calls.push({...vaultContractMultiCall, functionName: 'decimals'});
		calls.push({...vaultContractMultiCall, functionName: 'balanceOf', args: [address]});
		calls.push({...wantContractMultiCall, functionName: 'balanceOf', args: [address]});
		calls.push({...wantContractMultiCall, functionName: 'allowance', args: [address, vault.VAULT_ADDR]});
	
		const callResult = await multicall({contracts: calls as never[], chainId: chainID});
		const apiVersion = callResult[0].result as string;
		const depositLimit = decodeAsBigInt(callResult[1]);
		const totalAssets = decodeAsBigInt(callResult[2]);
		const availableDepositLimit = decodeAsBigInt(callResult[3]);
		const pricePerShare = decodeAsBigInt(callResult[4]);
		const decimals = decodeAsBigInt(callResult[5]);
		const balanceOf = decodeAsBigInt(callResult[6]);
		const wantBalance = decodeAsBigInt(callResult[7]);
		const wantAllowance = decodeAsBigInt(callResult[8]);

		const coinBalance = await fetchBalance({
			address: address
		});
		
		const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
		const	numberDecimals = Number(decimals);

		set_vaultData({
			loaded: true,
			apiVersion: apiVersion,
			decimals: numberDecimals,
			depositLimit: toNormalizedBN(depositLimit, numberDecimals),
			totalAssets: toNormalizedBN(totalAssets, numberDecimals),
			availableDepositLimit: toNormalizedBN(availableDepositLimit, numberDecimals),
			pricePerShare: toNormalizedBN(pricePerShare, numberDecimals),
			coinBalance: toNormalizedBN(coinBalance.value, 18),
			balanceOf: toNormalizedBN(balanceOf, numberDecimals),
			balanceOfValue: Number((Number(ethers.utils.formatUnits(balanceOf, numberDecimals)) * Number(ethers.utils.formatUnits(pricePerShare, numberDecimals)) * price).toFixed(2) || 0),
			wantBalance: toNormalizedBN(wantBalance, numberDecimals),
			wantPrice: price,
			totalAUM: formatToNormalizedValue(totalAssets, numberDecimals) * price,
			progress: isZero(depositLimit) ? 1 : (Number(ethers.utils.formatUnits(depositLimit, numberDecimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, numberDecimals))) / Number(ethers.utils.formatUnits(depositLimit, numberDecimals)),
			allowance: toNormalizedBN(wantAllowance, numberDecimals)
		});

		if (vault.ZAP_ADDR) {
			const allowanceZapOut = await readContract({
				abi: VAULT_ABI,
				address: toAddress(vault.VAULT_ADDR),
				functionName: 'allowance',
				args: [address, toAddress(vault.ZAP_ADDR)]
			});
			set_vaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowanceZapOut, numberDecimals)}));
		}

	}, [vault, address, chainID, prices]);

	useEffect((): void => {
		prepareVaultData();
	}, [prepareVaultData]);

	/**************************************************************************
	** If we had some issues getting the prices ... Let's try again
	**************************************************************************/
	const	refetchVaultData = useCallback(async (): Promise<void> => {
		if (vault?.PRICE_SOURCE?.startsWith('Lens')) {
		
			const	currentNetwork = networks[chainID === 1337 ? 1 : vault.CHAIN_ID || 1];
			if (currentNetwork.lensOracleAddress) {

				const price = await readContract({
					abi: LENS_ABI,
					address: toAddress(currentNetwork.lensOracleAddress),
					functionName: 'getPriceUsdcRecommended',
					args: [toAddress(vault.WANT_ADDR)]
				});

				const normalizedPrice = formatToNormalizedValue(price, 6);
				set_vaultData((v): TVaultData => ({
					...v,
					wantPrice: normalizedPrice,
					wantPriceError: false,
					balanceOfValue: Number(v.balanceOf.normalized) * Number(v.pricePerShare.normalized) * normalizedPrice,
					totalAUM: Number(v.totalAssets.normalized) * normalizedPrice
				}));
			}

		} else {
			const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
			set_vaultData((v): TVaultData => ({
				...v,
				wantPrice: price,
				wantPriceError: false,
				balanceOfValue: Number(v.balanceOf.normalized) * Number(v.pricePerShare.normalized) * price,
				totalAUM: Number(v.totalAssets.normalized) * price
			}));
		}
	}, [vault, chainID, networks, prices]);

	useEffect((): void => {
		refetchVaultData();
	}, [refetchVaultData]);

	return (
		<div className={'mt-8 text-neutral-700'}>
			<div>
				<h1 className={'font-mono text-7xl font-semibold leading-120px'}>{vault.LOGO}</h1>
				<h1 className={'font-mono text-3xl font-semibold text-neutral-900'}>{vault.TITLE}</h1>
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
