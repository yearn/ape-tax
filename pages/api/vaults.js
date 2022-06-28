/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				vaults.js
******************************************************************************/

import	{ethers, BigNumber}		from	'ethers';
import	{Contract}				from	'ethcall';
import	{providers}				from	'@yearn-finance/web-lib/utils';
import	{fn}					from	'utils/fn';
import	vaults					from	'utils/vaults.json';
import	yVaultABI				from	'utils/ABI/yVault.abi.json';
import	{prepareGrossData}		from	'pages/api/specificApy';

const chunk = (arr, size) => arr.reduce((acc, e, i) => (i % size ? acc[acc.length - 1].push(e) : acc.push([e]), acc), []);

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

function getProvider(chain = 1) {
	if (chain === 1) {
		if (process.env.ALCHEMY_KEY) {
			return new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY);
		} else {
			return new ethers.providers.InfuraProvider('homestead', '9aa3d95b3bc440fa88ea12eaa4456161');
		}
	} else if (chain === 56) {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');
	} else if (chain === 100) {
		return new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com/');
	} else if (chain === 137) {
		return new ethers.providers.JsonRpcProvider('https://rpc-mainnet.matic.network');
	} else if (chain === 250) {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
	} else if (chain === 1337) {
		return new ethers.providers.JsonRpcProvider('http://localhost:8545');
	} else if (chain === 42161) {
		return new ethers.providers.JsonRpcProvider('https://arbitrumrpc.com');
	} 
	return (new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY));
}

export default fn(async ({network = 1, rpc, status = 'active', apy = 0}) => {
	network = Number(network);
	let		provider = getProvider(network);
	if (rpc !== undefined) {
		provider = new ethers.providers.JsonRpcProvider(rpc);
	}
	const	ethcallProvider = await providers.newEthCallProvider(provider);
	const	_vaults = [];
	const	_calls = [];

	Object.values(vaults).forEach((v) => {
		if (v.CHAIN_ID !== network || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'ape-active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new')) {
			return;	
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;	
		}
		const	vaultContract = new Contract(v.VAULT_ADDR, yVaultABI);
		_calls.push(...[
			vaultContract.apiVersion(),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.activation(),
		]);
	});
	let		isCallASuccess = true;
	let		chunkedCallResult = [];
	try {
		const	callResult = await ethcallProvider.tryAll(_calls);
		chunkedCallResult = chunk(callResult, 7);
	} catch (error) {
		isCallASuccess = false;
		console.error(error);
	}
	let		index = 0;

	await asyncForEach(Object.entries(vaults), async ([k, v]) => {
		if (v.CHAIN_ID !== network || v.VAULT_TYPE === 'weird') {
			return;
		}
		if (status === 'ape-active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new')) {
			return;	
		}
		if (status === 'active' && (v.VAULT_STATUS !== 'active' && v.VAULT_STATUS !== 'new' && v.VAULT_STATUS !== 'endorsed')) {
			return;	
		}
		let	apiVersion = '0';
		let	depositLimit = BigNumber.from('0');
		let	totalAssets = BigNumber.from('0');
		let	availableDepositLimit = BigNumber.from('0');
		let	pricePerShare = BigNumber.from('0');
		let	decimals = 18;
		let	activation = '0';

		if (isCallASuccess)
			[apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, activation] = chunkedCallResult[index];
		const	dec = Number(decimals);
		index++;

		if (apy === 1) {
			const	grossData = await prepareGrossData({
				vault: v,
				pricePerShare,
				decimals,
				activation,
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
					depositLimit: ethers.utils.formatUnits(depositLimit, dec),
					totalAssets: ethers.utils.formatUnits(totalAssets, dec),
					availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, dec),
					pricePerShare: ethers.utils.formatUnits(pricePerShare, dec),
					decimals: dec,
					activation: Number(activation)
				},
				APY: {
					week: grossData.week,
					month: grossData.month,
					inception: grossData.inception,
				},
				want: {
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL,
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
					depositLimit: ethers.utils.formatUnits(depositLimit, dec),
					totalAssets: ethers.utils.formatUnits(totalAssets, dec),
					availableDepositLimit: ethers.utils.formatUnits(availableDepositLimit, dec),
					pricePerShare: ethers.utils.formatUnits(pricePerShare, dec),
					decimals: dec,
					activation: Number(activation)
				},
				want: {
					address: v.WANT_ADDR,
					symbol: v.WANT_SYMBOL,
					cgID: v.COINGECKO_SYMBOL,
				}
			});
		}
	});
	return _vaults;
}, {maxAge: 10 * 60}); //10 mn
