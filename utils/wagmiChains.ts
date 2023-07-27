import {optimism, polygon} from 'viem/chains';

import type {Chain} from 'wagmi';

export const localhost = {
	id: 1_337,
	name: 'Localhost',
	network: 'localhost',
	nativeCurrency: {
		decimals: 18,
		name: 'Ether',
		symbol: 'ETH'
	},
	rpcUrls: {
		default: {http: ['http://0.0.0.0:8545', 'http://127.0.0.1:8545', 'http://localhost:8545']},
		public: {http: ['http://0.0.0.0:8545', 'http://127.0.0.1:8545', 'http://localhost:8545']}
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

export const polygonOverride = {
	...polygon,
	rpcUrls: {
		default: {
			http: [
				...polygon.rpcUrls.default.http,
				'https://polygon.llamarpc.com',
				process.env.RPC_URL_POLYGON_TENDERLY || 'https://1rpc.io/matic'
			]
		},
		public: {
			http: [
				...polygon.rpcUrls.default.http,
				'https://polygon.llamarpc.com',
				process.env.RPC_URL_POLYGON_TENDERLY || 'https://1rpc.io/matic'
			]
		}
	}

} as const satisfies Chain;

export const optimismOverride = {
	...optimism,
	rpcUrls: {
		default: {
			http: [
				...optimism.rpcUrls.default.http,
				(process.env.RPC_URL_OPTIMISM_YEARN_2 || 'https://1rpc.io/op') as string,
				(process.env.RPC_URL_OPTIMISM_YEARN || 'https://1rpc.io/op') as string,
				'https://opt-mainnet.g.alchemy.com/v2/demo',
				'https://endpoints.omniatech.io/v1/op/mainnet/public',
				'https://optimism-mainnet.public.blastapi.io',
				'https://optimism.blockpi.network/v1/rpc/public',
				'https://rpc.ankr.com/optimism',
				'https://1rpc.io/op',
				'https://optimism.api.onfinality.io/public',
				'https://rpc.optimism.gateway.fm'

			]
		},
		public: {
			http: [
				...optimism.rpcUrls.default.http,
				(process.env.RPC_URL_OPTIMISM_YEARN_2 || 'https://1rpc.io/op') as string,
				(process.env.RPC_URL_OPTIMISM_YEARN || 'https://1rpc.io/op') as string,
				'https://opt-mainnet.g.alchemy.com/v2/demo',
				'https://endpoints.omniatech.io/v1/op/mainnet/public',
				'https://optimism-mainnet.public.blastapi.io',
				'https://optimism.blockpi.network/v1/rpc/public',
				'https://rpc.ankr.com/optimism',
				'https://1rpc.io/op',
				'https://optimism.api.onfinality.io/public',
				'https://rpc.optimism.gateway.fm'
			]
		}
	}

} as const satisfies Chain;
