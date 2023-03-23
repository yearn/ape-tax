import React, {useCallback, useEffect, useState} from 'react';
import InfoMessage from 'components/InfoMessage';
import VaultActions from 'components/VaultActions';
import VaultDetails from 'components/VaultDetails';
import VaultStrategies from 'components/VaultStrategies';
import VaultWallet from 'components/VaultWallet';
import {Contract} from 'ethcall';
import {BigNumber, ethers} from 'ethers';
import ERC20ABI from 'utils/ABI/erc20.abi.json';
import LENS_ABI from 'utils/ABI/lens.abi.json';
import YVAULTABI from 'utils/ABI/yVault.abi.json';
import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';

const		defaultVaultData = {
	loaded: false,
	depositLimit: -1,
	totalAssets: 0,
	availableDepositLimit: 0,
	pricePerShare: 1,
	decimals: 18,
	coinBalance: 0,
	balanceOf: 0,
	balanceOfRaw: 0,
	balanceOfValue: 0,
	wantBalance: 0,
	wantPrice: 0,
	wantPriceError: false,
	totalAUM: 0,
	progress:  0,
	allowance: 0,
	apiVersion: '-',
	wantBalanceRaw: BigNumber.from(0),
	allowanceZapOut: 0
};


function	VaultWrapper({vault, provider, getProvider, address, chainID, prices}) {
	const	{safeChainID} = useChainID();
	const	{networks} = useSettings();
	const	[vaultData, set_vaultData] = useState(defaultVaultData);
	const	prepareVaultData = useCallback(async () => {
		if (!vault || !provider || !address || (chainID !== vault?.CHAIN_ID && !(chainID === 1337))) {
			return;
		}
		const	network = await provider.getNetwork();
		if (network.chainId !== vault.CHAIN_ID && !(network.chainId === 1337)) {
			return;
		}
		let		providerToUse = provider || getProvider(safeChainID);
		if (chainID === 1337) {
			providerToUse = provider;
		}

		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function apiVersion() public view returns (string)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
				'function decimals() public view returns (uint256)',
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function activation() public view returns(uint256)'
			],
			providerToUse
		);
		const	ethcallProvider = await newEthCallProvider(providerToUse);
		const	wantContractMultiCall = new Contract(vault.WANT_ADDR, ERC20ABI);
		const	vaultContractMultiCall = new Contract(vault.VAULT_ADDR, YVAULTABI);
		const	callResult = await ethcallProvider.all([
			vaultContractMultiCall.apiVersion(),
			vaultContractMultiCall.depositLimit(),
			vaultContractMultiCall.totalAssets(),
			vaultContractMultiCall.availableDepositLimit(),
			vaultContractMultiCall.pricePerShare(),
			vaultContractMultiCall.decimals(),
			vaultContractMultiCall.balanceOf(address),
			wantContractMultiCall.balanceOf(address),
			wantContractMultiCall.allowance(address, vault.VAULT_ADDR)
		]);
		const	[apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, balanceOf, wantBalance, wantAllowance] = callResult;
		const	coinBalance = await providerToUse.getBalance(address);
		const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;

		set_vaultData({
			loaded: true,
			apiVersion: apiVersion,
			depositLimit: Number(ethers.utils.formatUnits(depositLimit, decimals)).toFixed(2),
			totalAssets: Number(ethers.utils.formatUnits(totalAssets, decimals)).toFixed(2),
			availableDepositLimit: Number(ethers.utils.formatUnits(availableDepositLimit, decimals)).toFixed(2),
			pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, decimals)).toFixed(4),
			decimals,
			coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
			balanceOf: Number(ethers.utils.formatUnits(balanceOf, decimals)).toFixed(2),
			balanceOfRaw: balanceOf,
			balanceOfValue: (Number(ethers.utils.formatUnits(balanceOf, decimals)) * Number(ethers.utils.formatUnits(pricePerShare, decimals)) * price).toFixed(2),
			wantBalance: Number(ethers.utils.formatUnits(wantBalance, decimals)).toFixed(2),
			wantBalanceRaw: wantBalance,
			wantPrice: price,
			totalAUM: (Number(ethers.utils.formatUnits(totalAssets, decimals)) * price).toFixed(2),
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, decimals))) / Number(ethers.utils.formatUnits(depositLimit, decimals)),
			allowance: Number(ethers.utils.formatUnits(wantAllowance, decimals))
		});

		if (vault.ZAP_ADDR) {
			const	allowantZapOut = await vaultContract.allowance(address, vault.ZAP_ADDR);
			set_vaultData((v) => ({...v, allowanceZapOut: Number(ethers.utils.formatUnits(allowantZapOut, decimals))}));
		}

	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vault, provider, address, chainID, safeChainID]);

	useEffect(() => {
		prepareVaultData();
	}, [prepareVaultData]);

	/**************************************************************************
	** If we had some issues getting the prices ... Let's try again
	**************************************************************************/
	const	fetchPrice = useCallback(async () => {
		const	currentProvider = provider || getProvider(vault.CHAIN_ID || 1337);
		const	ethcallProvider = await newEthCallProvider(currentProvider);
		const	lensPriceContract = new Contract(networks[safeChainID].lensOracleAddress, LENS_ABI);
		const	[price] = await ethcallProvider.tryAll([lensPriceContract.getPriceUsdcRecommended(vault.WANT_ADDR)]);
		const	normalizedPrice = Number(ethers.utils.formatUnits(price, 6));
		set_vaultData(v => ({
			...v,
			wantPrice: normalizedPrice,
			wantPriceError: false,
			balanceOfValue: (v.balanceOf * v.pricePerShare * normalizedPrice).toFixed(2),
			totalAUM: (v.totalAssets * normalizedPrice).toFixed(2)
		}));
	}, [safeChainID, getProvider, networks, provider, vault.CHAIN_ID, vault.WANT_ADDR]);

	useEffect(() => {
		if (vault?.PRICE_SOURCE?.startsWith('Lens')) {
			fetchPrice();
		} else {
			const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
			set_vaultData(v => ({
				...v,
				wantPrice: price,
				wantPriceError: false,
				balanceOfValue: (v.balanceOf * v.pricePerShare * price).toFixed(2),
				totalAUM: (v.totalAssets * price).toFixed(2)
			}));
		}
	}, [prices, vault, fetchPrice]);

	return (
		<div className={'mt-8 text-neutral-700'}>
			<div>
				<h1 className={'font-mono text-7xl font-semibold leading-120px text-neutral-900'}>{vault.LOGO}</h1>
				<h1 className={'font-mono text-3xl font-semibold text-neutral-900'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage status={vault.VAULT_STATUS} />
			<VaultDetails vault={vault} vaultData={vaultData} />
			<VaultStrategies
				vault={vault}
				decimals={vaultData.decimals}
				chainID={chainID}
				onUpdateVaultData={set_vaultData} />
			<VaultWallet vault={vault} vaultData={vaultData} />
			<VaultActions
				vault={vault}
				vaultData={vaultData}
				onUpdateVaultData={set_vaultData} />
		</div>
	);
}

export default VaultWrapper;
