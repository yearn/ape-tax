/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Tuesday August 3rd 2021
**	@Filename:				newVault.js
******************************************************************************/

const	inquirer = require('inquirer');
const	{ethers} = require('ethers');
const	axios = require('axios');
const	fs = require('fs');

async function getTokenInfo(tokenAddress) {
	try {
		const	data = await axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`).then(e => e.data);
		return	data;		
	} catch (error) {
		return	{};
	}
}
function	getSlugFromString(str) {
    str = str.replace(/^\s+|\s+$/g, '');
    str = str.toLowerCase();
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    return str;
}
function	getProvider(chain = 1) {
	if (chain === 1) {
		return new ethers.providers.AlchemyProvider('homestead');
	} else if (chain === 137) {
		return new ethers.providers.JsonRpcProvider(`https://rpc-mainnet.matic.network`);
	} else if (chain === 250) {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools/');
	} else if (chain === 56) {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
	}
	return (new ethers.providers.AlchemyProvider('homestead'));
}

const	ENUM_CHAIN = {
	'Mainnet (1)': 1,
	'BSC (56)': 56,
	'Polygon (137)': 137,
	'Fantom Opera (250)': 250,
}
const	ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
const	toAddress = (address) => {
	if (!address) {
		return ADDRESS_ZERO;
	}
	if (address === 'GENESIS') {
		return ADDRESS_ZERO;
	}
	try {
		return ethers.utils.getAddress(address);	
	} catch (error) {
		return ADDRESS_ZERO;
	}
};

let	questions = [];
if (process.argv.includes('--fast') || process.argv.includes('-f')) {
	questions = [
		{
			type: 'input',
			name: 'vaultName',
			message: 'What\'s the name of your vault ?',
		},
		{
			type: 'input',
			name: 'vaultLogo',
			message: 'What\'s the logo for your vault ?',
		},
		{
			type: 'list',
			name: 'vaultChain',
			message: 'Which chain ?',
			choices: ['Mainnet (1)', 'BSC (56)', 'Polygon (137)', 'Fantom Opera (250)'],
		},
		{
			type: 'input',
			name: 'vaultAddress',
			message: 'What\'s the address of your vault ?',
		},
		{
			type: 'input',
			name: 'vaultDev',
			message: 'Who is the dev of this vault ?',
		}
	];
} else {
	questions = [
		{
			type: 'input',
			name: 'vaultName',
			message: 'What\'s the name of your vault ?',
		},
		{
			type: 'input',
			name: 'vaultLogo',
			message: 'What\'s the logo for your vault ?',
		},
		{
			type: 'list',
			name: 'vaultChain',
			message: 'Which chain ?',
			choices: ['Mainnet (1)', 'BSC (56)', 'Polygon (137)', 'Fantom Opera (250)'],
		},
		{
			type: 'input',
			name: 'vaultAddress',
			message: 'What\'s the address of your vault ?',
		},
		{
			type: 'input',
			name: 'vaultDev',
			message: 'Who is the dev of this vault ?',
		},
		{
			type: 'list',
			name: 'vaultABI',
			message: 'What kind of vault is it ?',
			choices: ['yVaultV2', 'LidoVault'],
			default: 'yVaultV2',
			filter(val) {
				return val.toLowerCase();
			},
		},
		{
			type: 'list',
			name: 'vaultType',
			message: 'What kind of vault is it ?',
			choices: ['experimental', 'weird'],
		},
		{
			type: 'list',
			name: 'vaultStatus',
			message: 'What is the status of vault is it ?',
			choices: ['active', 'withdraw', 'stealth', 'endorsed'],
		}
	];
}

inquirer.prompt(questions).then(async ({
	vaultName,
	vaultLogo,
	vaultChain,
	vaultAddress,
	vaultDev,
	vaultABI = 'yVaultV2',
	vaultType = 'experimental',
	vaultStatus = 'active',
}) => {
	const	address = toAddress(vaultAddress);
	if (address === ADDRESS_ZERO) {
		throw 'Cannot be address 0';
	}
	const	provider = getProvider(ENUM_CHAIN[vaultChain]);
	const	contract = new ethers.Contract(address, ['function token() view returns (address)'], provider);
	const	[tokenAddress] = await Promise.all([contract.token()]);
	const	tokenInfo = await getTokenInfo(tokenAddress);
	const	vaultSlug = getSlugFromString(vaultName);
	const	vaults = require('../src/vaults.json');
	
	if (vaults[vaultSlug] !== undefined) {
		throw 'Vault already used. Please use another name !';
	}
	if (Object.values(vaults).some(e => toAddress(e.VAULT_ADDR) === vaultAddress && e.CHAIN_ID === ENUM_CHAIN[vaultChain])) {
		throw 'A vault with this address is already used !';
	}
	vaults[vaultSlug] = {
		TITLE: vaultName,
		LOGO: vaultLogo,
		VAULT_ABI: vaultABI,
		VAULT_TYPE: vaultType,
		VAULT_ADDR: address,
		WANT_ADDR: toAddress(tokenAddress),
		WANT_SYMBOL: tokenInfo.symbol.toUpperCase(),
		COINGECKO_SYMBOL: tokenInfo.id,
		VAULT_DEV: vaultDev,
		VAULT_STATUS: vaultStatus,
		CHAIN_ID: ENUM_CHAIN[vaultChain]
	};
	const stringifiedVault = JSON.stringify(vaults, null, 2);
	fs.writeFile(`${__dirname}/../src/vaults.json`, stringifiedVault, 'utf8', (err) => {
		if (err) {
			throw 'Impossible to update vaults.json';
		}
	});
	console.log(`✅ Bravo !`)
})
.catch((error) => {
	if (error)
		console.error(error)
});