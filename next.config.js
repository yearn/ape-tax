/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				next.config.js
******************************************************************************/

const Dotenv = require('dotenv-webpack');

module.exports = ({
	plugins: [
		new Dotenv()
	],
	env: {
		/* 🔵 - Yearn Finance **************************************************
		** Stuff used for the SEO or some related elements, like the title, the
		** github url etc.
		** - WEBSITE_URI is used to display the og image and get the base URI
		** - WEBSITE_NAME is used as name displayed on the top of the tab in
		**   the browser.
		** - WEBSITE_TITLE should be the name of your website. It may be used
		**   by third parties to display your app name (coinbase for instance)
		** - WEBSITE_DESCRIPTION is used in the meta tags
		** - PROJECT_GITHUB_URL should be the link to your project on GitHub
		**********************************************************************/
		WEBSITE_URI: 'https://ape.tax/',
		WEBSITE_NAME: 'ape.tax',
		WEBSITE_TITLE: 'ape.tax',
		WEBSITE_DESCRIPTION: 'Experimental Experiments Registry',
		PROJECT_GITHUB_URL: 'https://github.com/saltyfacu/ape-tax',

		/* 🔵 - Yearn Finance **************************************************
		** Some config used to control the behaviour of the web library. By
		** default, all of theses are set to false.
		** USE_WALLET: should we allow the user to connect a wallet via
		**             metamask or wallet connect?
		** USE_PRICES: should we fetch the prices for a list of tokens? If true
		**             the CG_IDS array should be populated with the tokens
		**             to fetch.
		** USE_PRICE_TRI_CRYPTO: should we fetch the special Tri Crypto token
		** 			   price? (require blockchain call)
		** USE_NETWORKS: indicate if the app should be able to change networks
		**********************************************************************/
		USE_WALLET: true,
		USE_PRICES: false,
		USE_PRICE_TRI_CRYPTO: false,
		USE_NETWORKS: true,
		CG_IDS: [],
		TOKENS: [],

		/* 🔵 - Yearn Finance **************************************************
		** Config over the RPC
		**********************************************************************/
		WEB_SOCKET_URL: {
			1: process.env.WS_URL_MAINNET,
			250: process.env.WS_URL_FANTOM,
			42161: process.env.WS_URL_ARBITRUM
		},
		JSON_RPC_URL: {
			1: process.env.RPC_URL_MAINNET,
			250: process.env.RPC_URL_FANTOM,
			42161: process.env.RPC_URL_ARBITRUM
		},
		ALCHEMY_KEY: process.env.ALCHEMY_KEY,
		INFURA_KEY: process.env.INFURA_KEY,
		ALCHEMY_KEY_POLYGON: process.env.ALCHEMY_KEY_POLYGON,
		SECRET: process.env.SECRET,
		FTMSCAN_API: process.env.FTMSCAN_API,
		ETHERSCAN_API: process.env.ETHERSCAN_API,
		POLYGONSCAN_API: process.env.POLYGONSCAN_API,
		BSCSCAN_API: process.env.BSCSCAN_API,
		MORALIS_ARBITRUM_KEY: process.env.MORALIS_ARBITRUM_KEY,

		AURA_BOOSTER_ADDRESS: '0x7818A1DA7BD1E64c199029E86Ba244a9798eEE10',
		YEARN_BALANCER_FACTORY_ADDRESS: '0x03B0E3F8B22933C2b0A7Dfc46C2FdB746a106709',
		YEARN_FACTORY_KEEPER_WRAPPER: '0x256e6a486075fbAdbB881516e9b6b507fd082B5D',
	}
});
