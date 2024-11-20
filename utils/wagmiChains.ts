import type {Chain} from 'wagmi';

const currencyDetails: {[key: number]: {name: string, symbol: string}} = {
	1: {name: 'Ether', symbol: 'ETH'},
	10: {name: 'Ether', symbol: 'ETH'},
	137: {name: 'Matic', symbol: 'MATIC'},
	250: {name: 'Fantom', symbol: 'FTM'},
	42161: {name: 'Ether', symbol: 'ETH'},
	8453: {name: 'Ether', symbol: 'ETH'}
};

const explorerDetails: {[key: number]: {name: string, url: string}} = {
	1: {name: 'Etherscan', url: 'https://etherscan.io'},
	10: {name: 'Optimism Explorer', url: 'https://optimistic.etherscan.io'},
	137: {name: 'PolygonScan', url: 'https://polygonscan.com'},
	250: {name: 'FTMScan', url: 'https://ftmscan.com'},
	42161: {name: 'Arbiscan', url: 'https://arbiscan.io'},
	8453: {name: 'BaseScan', url: 'https://basescan.org/'}
};

const forkedChainID = Number(process.env.FORKED_CHAIN_ID);

export const localhost = {
	id: 1_337,
	name: 'Localhost',
	network: 'localhost',
	nativeCurrency: {
		decimals: 18,
		name: currencyDetails[forkedChainID || 1].name,
		symbol: currencyDetails[forkedChainID || 1].symbol
	},
	rpcUrls: {
		default: {http: ['http://0.0.0.0:8545', 'http://127.0.0.1:8545', 'http://localhost:8545']},
		public: {http: ['http://0.0.0.0:8545', 'http://127.0.0.1:8545', 'http://localhost:8545']}
	},
	blockExplorers: {
		default: {
			name: explorerDetails[forkedChainID || 1].name,
			url : explorerDetails[forkedChainID || 1].url
		}
	},
	contracts: {
		ensRegistry: {
			address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
		},
		ensUniversalResolver: {
			address: '0xE4Acdd618deED4e6d2f03b9bf62dc6118FC9A4da',
			blockCreated: 16773775
		},
		multicall3: {
			address: '0xca11bde05977b3631167028862be2a173976ca11',
			blockCreated: 14353601
		}
	}
} as const satisfies Chain;

