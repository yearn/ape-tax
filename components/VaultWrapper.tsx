import {useCallback, useEffect, useState} from 'react';
import InfoMessage from 'components/InfoMessage';
import VaultActions from 'components/VaultActions';
import VaultDetails from 'components/VaultDetails';
import VaultStrategies from 'components/VaultStrategies';
import VaultWallet from 'components/VaultWallet';
import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import LENS_ABI from 'utils/ABI/lens.abi.json';
import YVAULT_V3_BASE_ABI from 'utils/ABI/yVaultV3Base.abi';
import {getChainIDOrTestProvider} from 'utils/utils';
import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import ERC20_ABI from '@yearn-finance/web-lib/utils/abi/erc20.abi';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {getProvider, newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

import type {BigNumber} from 'ethers';
import type {ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';

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

function	VaultWrapper({vault, prices}: {vault: TVault; prices: any;}): ReactElement {
	const	{provider, address, chainID} = useWeb3();
	const	{networks} = useSettings();
	const	[vaultData, set_vaultData] = useState<TVaultData>(defaultVaultData);

	const	prepareVaultData = useCallback(async (): Promise<void> => {
		if (!vault || !provider || !address || (chainID !== vault?.CHAIN_ID && !(chainID === 1337))) {
			return;
		}
		const	providerToUse = await getChainIDOrTestProvider(provider, vault.CHAIN_ID);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function apiVersion() public view returns (string)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function availableDepositLimit(address) public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
				'function decimals() public view returns (uint256)',
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function activation() public view returns(uint256)'
			],
			providerToUse
		);
		const	ethcallProvider = await newEthCallProvider(providerToUse);
		const	wantContractMultiCall = new Contract(vault.WANT_ADDR, ERC20_ABI);
		const	vaultV2ContractMultiCall = new Contract(vault.VAULT_ADDR, VAULT_ABI);
		const	vaultV3ContractMultiCall = new Contract(vault.VAULT_ADDR, YVAULT_V3_BASE_ABI);
		const	yearnRouterForChain = (process.env.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID];
		const	allowanceSpender = vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR;
		const	calls = [
			vaultV2ContractMultiCall.apiVersion(),
			vaultV2ContractMultiCall.totalAssets(),
			vaultV2ContractMultiCall.pricePerShare(),
			vaultV2ContractMultiCall.decimals(),
			vaultV2ContractMultiCall.balanceOf(address),
			wantContractMultiCall.balanceOf(address),
			wantContractMultiCall.allowance(address, allowanceSpender),
			vaultV3ContractMultiCall.allowance(address, yearnRouterForChain)
		];
		if (vault.VAULT_ABI === 'v3') {
			calls.push(vaultV3ContractMultiCall.availableDepositLimit(address));
			calls.push(vaultV3ContractMultiCall.availableDepositLimit(address));
		} else {
			calls.push(vaultV2ContractMultiCall.depositLimit());
			calls.push(vaultV2ContractMultiCall.availableDepositLimit());
		}
		const	canFail = calls.map((): false => false);
		const	callResult = await ethcallProvider.tryEach(calls, canFail) as [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber];

		const	[apiVersion, totalAssets, pricePerShare, decimals, balanceOf, wantBalance, wantAllowance, allowanceYRouter, depositLimit, availableDepositLimit] = callResult;
		const	coinBalance = await providerToUse.getBalance(address);
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
			coinBalance: toNormalizedBN(coinBalance, 18),
			balanceOf: toNormalizedBN(balanceOf, numberDecimals),
			balanceOfValue: Number((Number(ethers.utils.formatUnits(balanceOf, numberDecimals)) * Number(ethers.utils.formatUnits(pricePerShare, numberDecimals)) * price).toFixed(2) || 0),
			wantBalance: toNormalizedBN(wantBalance, numberDecimals),
			wantPrice: price,
			totalAUM: formatToNormalizedValue(totalAssets, numberDecimals) * price,
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, numberDecimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, numberDecimals))) / Number(ethers.utils.formatUnits(depositLimit, numberDecimals)),
			allowance: toNormalizedBN(wantAllowance, numberDecimals),
			allowanceYRouter: toNormalizedBN(allowanceYRouter, numberDecimals)
		});

		if (vault.ZAP_ADDR) {
			const	allowantZapOut = await vaultContract.allowance(address, vault.ZAP_ADDR);
			set_vaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowantZapOut, numberDecimals)}));
		}
	}, [vault, provider, address, chainID, prices]);

	useEffect((): void => {
		prepareVaultData();
	}, [prepareVaultData]);

	/**************************************************************************
	** If we had some issues getting the prices ... Let's try again
	**************************************************************************/
	const	retrievePrices = useCallback(async (): Promise<void> => {
		const	currentProvider = provider || getProvider(vault.CHAIN_ID || 1337);
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	currentNetwork = networks[chainID === 1337 ? 1 : vault.CHAIN_ID || 1];

		if (currentNetwork.lensOracleAddress) {
			const	lensPriceContract = new Contract(currentNetwork.lensOracleAddress, LENS_ABI);
			const	[price] = await ethcallProvider.tryAll([lensPriceContract.getPriceUsdcRecommended(vault.WANT_ADDR)]) as [BigNumber];
			const normalizedPrice = Number(ethers.utils.formatUnits(price, 6));
			set_vaultData((v): TVaultData => ({
				...v,
				wantPrice: normalizedPrice,
				wantPriceError: false,
				balanceOfValue: Number(v.balanceOf.normalized) * Number(v.pricePerShare.normalized) * normalizedPrice,
				totalAUM: Number(v.totalAssets.normalized) * normalizedPrice
			}));
		}
	}, [chainID, networks, provider, vault.CHAIN_ID, vault.WANT_ADDR]);
	useEffect((): void => {
		if (vault?.PRICE_SOURCE?.startsWith('Lens')) {
			retrievePrices();
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
	}, [chainID, networks, prices, provider, vault]);

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
