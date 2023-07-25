import type {TNDict} from '@yearn-finance/web-lib/types';

export type TChain = {
	chainID: string;
	name: string;
	displayName: string;
	coin: string;
	block_explorer: string;
	chain_swap?: {
		chainId: string;
		blockExplorerUrls: string[];
		chainName: string;
		rpcUrls: string[];
		nativeCurrency: {
			name: string;
			symbol: string;
			decimals: number;
		};
	};
}

/**
 * @deprecated Use the hook `useChain` instead
 */
const CHAINS: TNDict<TChain> = {
	1: {
		'chainID': '1',
		'name': 'ETH Mainnet',
		'displayName': 'Ethereum',
		'coin': 'ETH',
		'block_explorer': 'https://etherscan.io'
	},
	4: {
		'chainID': '4',
		'name': 'Rinkeby Testnet',
		'displayName': 'Rinkeby',
		'coin': 'rETH',
		'block_explorer': 'https://rinkeby.etherscan.io/',
		'chain_swap': {
			'chainId': '0x4',
			'blockExplorerUrls': ['https://rinkeby.etherscan.io/'],
			'chainName': 'Rinkeby Testnet',
			'rpcUrls': ['https://rinkeby.infura.io/v3/'],
			'nativeCurrency': {
				'name': 'rEthereum',
				'symbol': 'rETH',
				'decimals': 18
			}
		}
	},
	5: {
		'chainID': '5',
		'name': 'Goerli Testnet',
		'displayName': 'Goerli',
		'coin': 'gETH',
		'block_explorer': 'https://goerli.etherscan.io/',
		'chain_swap': {
			'chainId': '0x5',
			'blockExplorerUrls': ['https://goerli.etherscan.io/'],
			'chainName': 'Goerli Testnet',
			'rpcUrls': ['https://goerli.infura.io/v3/'],
			'nativeCurrency': {
				'name': 'gEthereum',
				'symbol': 'gETH',
				'decimals': 18
			}
		}
	},
	10: {
		'chainID': '10',
		'name': 'Optimism',
		'displayName': 'Optimism',
		'coin': 'oETH',
		'block_explorer': 'https://optimistic.etherscan.io',
		'chain_swap': {
			'chainId': '0xA',
			'blockExplorerUrls': ['https://optimistic.etherscan.io'],
			'chainName': 'Optimism',
			'rpcUrls': ['https://mainnet.optimism.io/', 'https://optimism-mainnet.public.blastapi.io', 'https://rpc.ankr.com/optimism'],
			'nativeCurrency': {
				'name': 'oEthereum',
				'symbol': 'ETH',
				'decimals': 18
			}
		}
	},
	56: {
		'chainID': '56',
		'name': 'BSC Mainnet',
		'displayName': 'Binance Smart Chain',
		'coin': 'BNB',
		'block_explorer': 'https://bscscan.com',
		'chain_swap': {
			'chainId': '0x38',
			'blockExplorerUrls': ['https://bscscan.com'],
			'chainName': 'Binance Smart Chain Mainnet',
			'rpcUrls': [
				'https://bsc-dataseed1.binance.org',
				'https://bsc-dataseed2.binance.org',
				'https://bsc-dataseed3.binance.org',
				'https://bsc-dataseed4.binance.org',
				'https://bsc-dataseed1.defibit.io',
				'https://bsc-dataseed2.defibit.io',
				'https://bsc-dataseed3.defibit.io',
				'https://bsc-dataseed4.defibit.io',
				'https://bsc-dataseed1.ninicoin.io',
				'https://bsc-dataseed2.ninicoin.io',
				'https://bsc-dataseed3.ninicoin.io',
				'https://bsc-dataseed4.ninicoin.io',
				'wss://bsc-ws-node.nariox.org'
			],
			'nativeCurrency': {
				'name': 'Binance Chain Native Token',
				'symbol': 'BNB',
				'decimals': 18
			}
		}
	},
	100: {
		'chainID': '100',
		'name': 'Gnosis Chain',
		'displayName': 'Gnosis Chain',
		'coin': 'xDai',
		'block_explorer': 'https://blockscout.com/',
		'chain_swap': {
			'chainId': '0x64',
			'blockExplorerUrls': ['https://blockscout.com/'],
			'chainName': 'Gnosis Chain',
			'rpcUrls': ['https://rpc.gnosischain.com/'],
			'nativeCurrency': {
				'name': 'xDai',
				'symbol': 'XDAI',
				'decimals': 18
			}
		}
	},
	137: {
		'chainID': '137',
		'name': 'Polygon Mainnet',
		'displayName': 'Polygon',
		'coin': 'MATIC',
		'block_explorer': 'https://polygonscan.com',
		'chain_swap': {
			'chainId': '0x89',
			'blockExplorerUrls': ['https://polygonscan.com'],
			'chainName': 'Matic(Polygon) Mainnet',
			'rpcUrls': [
				'https://rpc-mainnet.matic.network',
				'wss://ws-mainnet.matic.network',
				'https://rpc-mainnet.matic.quiknode.pro',
				'https://matic-mainnet.chainstacklabs.com'
			],
			'nativeCurrency': {
				'name': 'Matic',
				'symbol': 'MATIC',
				'decimals': 18
			}
		}
	},
	250: {
		'chainID': '250',
		'name': 'FTM Mainnet',
		'displayName': 'Fantom',
		'coin': 'FTM',
		'block_explorer': 'https://ftmscan.com',
		'chain_swap': {
			'chainId': '0xFA',
			'blockExplorerUrls': ['https://ftmscan.com'],
			'chainName': 'Fantom Opera',
			'rpcUrls': ['https://rpc.ftm.tools'],
			'nativeCurrency': {
				'name': 'Fantom',
				'symbol': 'FTM',
				'decimals': 18
			}
		}
	},
	420: {
		'chainID': '420',
		'name': 'Optimism Goerli Testnet',
		'displayName': 'Goerli Optimism',
		'coin': 'oETH',
		'block_explorer': 'goerli-optimism.etherscan.io',
		'chain_swap': {
			'chainId': '0x1A4',
			'blockExplorerUrls': ['goerli-optimism.etherscan.io'],
			'chainName': 'Goerli Optimism',
			'rpcUrls': ['https://goerli.optimism.io'],
			'nativeCurrency': {
				'name': 'oEthereum',
				'symbol': 'ETH',
				'decimals': 18
			}
		}
	},
	42161: {
		'chainID': '42161',
		'name': 'Arbitrum One',
		'displayName': 'Arbitrum',
		'coin': 'AETH',
		'block_explorer': 'https://arbiscan.io',
		'chain_swap': {
			'chainId': '0xA4B1',
			'blockExplorerUrls': ['https://arbiscan.io'],
			'chainName': 'Arbitrum One',
			'rpcUrls': ['https://arb1.croswap.com/rpc'],
			'nativeCurrency': {
				'name': 'AETH',
				'symbol': 'AETH',
				'decimals': 18
			}
		}
	}
};
export {CHAINS as chains};
export default CHAINS;
