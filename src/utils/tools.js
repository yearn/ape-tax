import axios from 'axios';

const	performGet = (url) => {
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

export async function	fetchCryptoPrice(from, to = 'usd') {
	const	result = await performGet(`https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`);

	if (result) {
		return result;
	}
	return null;
}
export async function	fetchYearnVaults() {
	const	result = await performGet('https://api.yearn.finance/v1/chains/1/vaults/all');

	if (result) {
		return result;
	}
	return null;
}
export async function	fetchBlockTimestamp(timestamp) {
	const	result = await performGet(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=JXRIIVMTAN887F9D7NCTVQ7NMGNT1A4KA3`);

	if (result) {
		return result;
	}
	return null;
}
export async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}