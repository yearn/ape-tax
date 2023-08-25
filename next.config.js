/* eslint-disable @typescript-eslint/explicit-function-return-type */
const runtimeCaching = require('next-pwa/cache');
const withTM = require('next-transpile-modules')(['@yearn-finance/web-lib'], {resolveSymlinks: false});
const withPWA = require('next-pwa')({
	dest: './public/',
	register: true,
	skipWaiting: true,
	runtimeCaching,
	buildExcludes: [/middleware-manifest.json$/]
});
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true'
});

module.exports = withTM(withBundleAnalyzer(withPWA({
	async rewrites() {
		return [
			{
				source: '/js/script.js',
				destination: 'https://plausible.io/js/script.js'
			},
			{
				source: '/api/event',
				destination: 'https://plausible.io/api/event'
			}
		];
	},
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
		** Config over the RPC
		**********************************************************************/
		WEB_SOCKET_URL: {
			1: process.env.WS_URL_MAINNET,
			10: process.env.WS_URL_OPTIMISM,
			137: process.env.WS_URL_POLYGON,
			250: process.env.WS_URL_FANTOM,
			42161: process.env.WS_URL_ARBITRUM,
			43114: process.env.WS_URL_AVALANCHE
		},
		JSON_RPC_URL: {
			1: process.env.RPC_URL_MAINNET,
			10: process.env.RPC_URL_OPTIMISM,
			137: process.env.RPC_URL_POLYGON || 'https://polygon.llamarpc.com',
			250: process.env.RPC_URL_FANTOM,
			42161: process.env.RPC_URL_ARBITRUM,
			43114: process.env.RPC_URL_AVALANCHE
		},
		ALCHEMY_KEY: process.env.ALCHEMY_KEY,
		INFURA_KEY: process.env.INFURA_KEY,
		ALCHEMY_KEY_POLYGON: process.env.ALCHEMY_KEY_POLYGON,
		SECRET: process.env.SECRET,
		FTMSCAN_API: process.env.FTMSCAN_API,
		ETHERSCAN_API: process.env.ETHERSCAN_API,
		POLYGONSCAN_API: process.env.POLYGONSCAN_API,
		OPTISCAN_API: process.env.OPTISCAN_API,
		BSCSCAN_API: process.env.BSCSCAN_API,
		SNOWTRACE_API: process.env.SNOWTRACE_API,
		MORALIS_ARBITRUM_KEY: process.env.MORALIS_ARBITRUM_KEY,
		WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID,
		FORKED_CHAIN_ID: process.env.FORKED_CHAIN_ID,
		
		AURA_BOOSTER_ADDRESS: '0x7818A1DA7BD1E64c199029E86Ba244a9798eEE10',
		YEARN_BALANCER_FACTORY_ADDRESS: '0x03B0E3F8B22933C2b0A7Dfc46C2FdB746a106709',
		YEARN_FACTORY_KEEPER_WRAPPER: '0x256e6a486075fbAdbB881516e9b6b507fd082B5D',
		YEARN_ROUTER: {
			137: '0x1112dbcf805682e828606f74ab717abf4b4fd8de',
			43114: '0x1112dbcf805682e828606f74ab717abf4b4fd8de',
			1337: '0x1112dbcf805682e828606f74ab717abf4b4fd8de'
		},
		APR_ORACLE_V3: {
			137: '0x02b0210fC1575b38147B232b40D7188eF14C04f2',
			1337: '0x02b0210fC1575b38147B232b40D7188eF14C04f2'
		}
	}
})));
