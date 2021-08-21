/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Saturday January 2nd 2021
**	@Filename:				API.js
******************************************************************************/

import	axios			from	'axios';

export const	performGet = (url) => {
	return (
		axios.get(url)
			.then(function (response) {
				return response.data;
			})
			.catch(function (error) {
				console.warn(error);
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

export async function	fetchBlockTimestamp(timestamp) {
	const	result = await performGet(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=JXRIIVMTAN887F9D7NCTVQ7NMGNT1A4KA3`);

	if (result) {
		return result.result;
	}
	return null;
}