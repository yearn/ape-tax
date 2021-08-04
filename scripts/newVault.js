const	inquirer = require('inquirer');
const	{ethers} = require('ethers');
const	axios = require('axios');
const	fs = require('fs');
const	args = require('yargs/yargs')(process.argv.slice(2)).string('address').argv

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

let	defaultVaultABI = 'yVaultV2';
let	defaultVaultType = 'experimental';
let	defaultVaultStatus = 'active';
let	defaultVaultChain = 1;
let	questions = [];
/******************************************************************************
**	If the name is not in the arguments, let's prompt it.
**	The name will be associated with the `TITLE` key.
******************************************************************************/
if (!args.name) {
	questions.push({
		type: 'input',
		name: 'vaultName',
		message: 'What\'s the name of your vault ?',
	});
}

/******************************************************************************
**	If the logo is not in the arguments, let's prompt it.
**	The logo will be associated with the `LOGO` key. Emojis are expected.
******************************************************************************/
if (!args.logo) {
	questions.push({
		type: 'input',
		name: 'vaultLogo',
		message: 'What\'s the logo for your vault ?',
	});
}

/******************************************************************************
**	If the chain is not in the arguments, let's prompt it.
**	The chain will be associated with the `CHAINID` key. Numbers are expected.
**	Possible value : 1, 56, 137, 250
******************************************************************************/
if (!args.chain || !([1, 56, 137, 250]).includes(args.chain)) {
	questions.push(		{
		type: 'list',
		name: 'vaultChain',
		message: 'Which chain ?',
		choices: ['Mainnet (1)', 'BSC (56)', 'Polygon (137)', 'Fantom Opera (250)'],
	},);
} else {
	if (args.chain === 1)
		defaultVaultChain = 'Mainnet (1)';
	if (args.chain === 56)
		defaultVaultChain = 'BSC (56)';
	if (args.chain === 137)
		defaultVaultChain = 'Polygon (137)';
	if (args.chain === 250)
		defaultVaultChain = 'Fantom Opera (250)';
}

/******************************************************************************
**	If the address is not in the arguments, let's prompt it.
**	The address will be associated with the `VAULT_ADDR` key. Address not 0 is
**	expected.
******************************************************************************/
if (!args.address) {
	questions.push({
		type: 'input',
		name: 'vaultAddress',
		message: 'What\'s the address of your vault ?',
	});
}

/******************************************************************************
**	If the dev is not in the arguments, let's prompt it.
**	The dev will be associated with the `VAULT_DEV` key.
******************************************************************************/
if (!args.dev) {
	questions.push({
		type: 'input',
		name: 'vaultDev',
		message: 'Who is the dev of this vault ?',
	});
}

/******************************************************************************
**	If the abi is not in the arguments, let's prompt it.
**	The abi will be associated with the `VAULT_ABI` key.
**	Only if fast is not enabled.
**	Possible value : yVaultV2, LidoVault
******************************************************************************/
if ((!args.abi || !(['yVaultV2', 'LidoVault']).includes(args.abi)) && !args.fast) {
	questions.push({
		type: 'list',
		name: 'vaultABI',
		message: 'What is the ABI to use for this vault ?',
		choices: ['yVaultV2', 'LidoVault'],
		default: 'yVaultV2'
	});
} else {
	defaultVaultABI = args.abi;
}

/******************************************************************************
**	If the type is not in the arguments, let's prompt it.
**	The type will be associated with the `VAULT_TYPE` key.
**	Only if fast is not enabled.
**	Possible value : experimental, weird
******************************************************************************/
if ((!args.type || !(['experimental', 'weird']).includes(args.type)) && !args.fast) {
	questions.push({
		type: 'list',
		name: 'vaultType',
		message: 'What kind of vault is it ?',
		choices: ['experimental', 'weird'],
	});
} else {
	defaultVaultType = args.type;
}

/******************************************************************************
**	If the status is not in the arguments, let's prompt it.
**	The status will be associated with the `VAULT_STATUS` key.
**	Only if fast is not enabled.
**	Possible value : experimental, weird
******************************************************************************/
if ((!args.status || !(['active', 'withdraw', 'stealth', 'endorsed']).includes(args.status)) && !args.fast) {
	questions.push({
		type: 'list',
		name: 'vaultStatus',
		message: 'What is the status of vault is it ?',
		choices: ['active', 'withdraw', 'stealth', 'endorsed'],
	});
} else {
	defaultVaultStatus = args.status;
}

inquirer.prompt(questions).then(async ({
	vaultName = args.name,
	vaultLogo = args.logo,
	vaultAddress = args.address,
	vaultDev = args.dev,
	vaultChain = defaultVaultChain,
	vaultABI = defaultVaultABI,
	vaultType = defaultVaultType,
	vaultStatus = defaultVaultStatus,
}) => {
	const	address = toAddress(vaultAddress);
	if (address === ADDRESS_ZERO) {
		throw 'Cannot be address 0';
	}
	const	provider = getProvider(ENUM_CHAIN[vaultChain]);
	const	contract = new ethers.Contract(address, ['function token() view returns (address)'], provider);
	const	tokenAddress = await contract.token();
	const	erc20Contract = new ethers.Contract(tokenAddress, ['function symbol() view returns (string)'], provider);
	const	tokenSymbol = await erc20Contract.symbol();
	const	tokenInfo = await getTokenInfo(tokenAddress);
	if (!tokenInfo?.id) {
		console.log('❌ Impossible to find corresponding token on coinGecko.')
		const	{wantID} = await inquirer.prompt([{
			type: 'input',
			name: 'wantSymbol',
			message: 'What coingeckoID should we use ?',
		}]);
		tokenInfo.id = wantID;
	}
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
		WANT_SYMBOL: tokenSymbol,
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