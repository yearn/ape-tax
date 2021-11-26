/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				API.js
******************************************************************************/

import	axios			from	'axios';

export const	performGet = (url) => {
	return (
		axios.get(url)
			.then(function (response) {
				return response.data;
			})
			.catch(function () {
				return null;
			})
	);
};

export async function	fetchYearnVaults() {
	const	result = await performGet('https://api.yearn.finance/v1/chains/1/vaults/all');

	if (result) {
		return result;
	}
	return null;
}

export async function	fetchCryptoPrice(from, to = 'usd') {
	const	result = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);

	if (result) {
		return result;
	}
	return null;
}

export async function	fetchBlockTimestamp(timestamp, network = 1) {
	if (network === 250) {
		const	result = await performGet(`https://api.ftmscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.FTMSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 56) {
		const	result = await performGet(`https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.BSCSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 137) {
		const	result = await performGet(`https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.POLYGONSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}
	if (network === 42161) {
		const	result = await performGet(`https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);

		if (result) {
			return result.result;
		}
		return null;
	}

	const	result = await performGet(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API}`);

	if (result) {
		return result.result;
	}
	return null;
}
