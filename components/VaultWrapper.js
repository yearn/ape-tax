import	React, {useState, useEffect, useCallback}		from	'react';
import	{ethers, BigNumber}								from	'ethers';
import	{Contract}										from	'ethcall';
import	{providers}										from	'@yearn-finance/web-lib/utils';
import	{useSettings}									from	'@yearn-finance/web-lib/contexts';
import	InfoMessage										from	'components/InfoMessage';
import	VaultStrategies									from	'components/VaultStrategies';
import	VaultDetails									from	'components/VaultDetails';
import	VaultWallet										from	'components/VaultWallet';
import	VaultActions									from	'components/VaultActions';
import	ERC20ABI										from	'utils/ABI/erc20.abi.json';
import	YVAULTABI										from	'utils/ABI/yVault.abi.json';
import	LENS_ABI										from	'utils/ABI/lens.abi.json';

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
		let		providerToUse = provider;
		if (vault.CHAIN_ID === 250 && network.chainId !== 1337) {
			providerToUse = getProvider('fantom');
		}
		if (vault.CHAIN_ID === 4 && network.chainId !== 1337) {
			providerToUse = getProvider('rinkeby');
		}
		if (vault.CHAIN_ID === 137 && network.chainId !== 1337) {
			providerToUse = getProvider('polygon');
		}
		if (vault.CHAIN_ID === 42161 && network.chainId !== 1337) {
			providerToUse = getProvider('arbitrum');
		}
		if (vault.CHAIN_ID === 100 && network.chainId !== 1337) {
			providerToUse = getProvider('xdai');
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
				'function activation() public view returns(uint256)',
			],
			providerToUse
		);
		const	ethcallProvider = await providers.newEthCallProvider(providerToUse);

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
			wantContractMultiCall.allowance(address, vault.VAULT_ADDR),
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
	}, [vault, provider, address, chainID]);

	useEffect(() => {
		prepareVaultData();
	}, [prepareVaultData]);

	/**************************************************************************
	** If we had some issues getting the prices ... Let's try again
	**************************************************************************/
	useEffect(() => {
		if (vault.PRICE_SOURCE.startsWith('Lens')) {
			const	currentProvider = provider || providers.getProvider(vault.CHAIN_ID || 1337);
			providers.newEthCallProvider(currentProvider).then((ethcallProvider) => {
				const	lensPriceContract = new Contract(networks[chainID === 1337 ? 1 : vault.CHAIN_ID || 1].lensAddress, LENS_ABI);
				ethcallProvider.tryAll([lensPriceContract.getPriceUsdcRecommended(vault.WANT_ADDR)]).then(([price]) => {
					const normalizedPrice = Number(ethers.utils.formatUnits(price, 6));
					set_vaultData(v => ({
						...v,
						wantPrice: normalizedPrice,
						wantPriceError: false,
						balanceOfValue: (v.balanceOf * v.pricePerShare * normalizedPrice).toFixed(2),
						totalAUM: (v.totalAssets * normalizedPrice).toFixed(2),
					}));
				});
			});

		} else {
			const	price = prices?.[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
			set_vaultData(v => ({
				...v,
				wantPrice: price,
				wantPriceError: false,
				balanceOfValue: (v.balanceOf * v.pricePerShare * price).toFixed(2),
				totalAUM: (v.totalAssets * price).toFixed(2),
			}));
		}
	}, [chainID, networks, prices, provider, vault]);

	return (
		<div className={'mt-8 text-neutral-500'}>
			<div>
				<h1 className={'text-7xl font-mono font-semibold text-neutral-700 leading-120px'}>{vault.LOGO}</h1>
				<h1 className={'text-3xl font-mono font-semibold text-neutral-700'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage status={vault.VAULT_STATUS} />
			<VaultDetails vault={vault} vaultData={vaultData} />
			<VaultStrategies vault={vault} chainID={chainID} />
			<VaultWallet vault={vault} vaultData={vaultData} />
			<VaultActions vault={vault} vaultData={vaultData} onUpdateVaultData={set_vaultData} />
		</div>
	);
}

export default VaultWrapper;