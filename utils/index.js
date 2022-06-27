/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				index.js
******************************************************************************/

export async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

export function	formatAmount(amount, decimals = 2) {
	let		locale = 'fr-FR';
	if (typeof(navigator) !== 'undefined')
		locale = navigator?.language || 'fr-FR';
	return (new Intl.NumberFormat([locale, 'en-US'], {minimumFractionDigits: 0, maximumFractionDigits: decimals}).format(amount));
}

export function	formatValue(value, decimals = 2) {
	return (new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: decimals}).format(value));
}

export function	parseMarkdown(markdownText) {
	const htmlText = markdownText
		.replace(/\[(.*?)\]\((.*?)\)/gim, "<a class='hover:underline cursor-pointer' target='_blank' href='$2'>$1</a>");

	return htmlText.trim();
}