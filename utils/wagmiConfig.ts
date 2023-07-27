import {arbitrum, fantom} from 'viem/chains';
import {configureChains, createConfig, mainnet} from 'wagmi';
import {CoinbaseWalletConnector} from 'wagmi/connectors/coinbaseWallet';
import {LedgerConnector} from 'wagmi/connectors/ledger';
import {MetaMaskConnector} from 'wagmi/connectors/metaMask';
import {WalletConnectConnector} from 'wagmi/connectors/walletConnect';
import {alchemyProvider} from 'wagmi/providers/alchemy';
import {publicProvider} from 'wagmi/providers/public';
import {InjectedConnector} from '@yearn-finance/web-lib/utils/web3/injectedConnector';
import {getRPC} from '@yearn-finance/web-lib/utils/web3/providers';

import {localhost, optimismOverride, polygonOverride} from './wagmiChains';

const {chains, publicClient, webSocketPublicClient} = configureChains(
	[
		mainnet,
		optimismOverride,
		polygonOverride,
		fantom,
		arbitrum,
		localhost
	],
	[
		alchemyProvider({apiKey: process.env.ALCHEMY_KEY || ''}),
		publicProvider()
	]
);

const config = createConfig({
	autoConnect: true,
	publicClient,
	webSocketPublicClient,
	connectors: [
		new InjectedConnector({chains}),
		new MetaMaskConnector({chains}),
		new LedgerConnector({chains, options: {}}),
		new WalletConnectConnector({
			chains,
			options: {projectId: process.env.WALLETCONNECT_PROJECT_ID as string}
		}),
		new CoinbaseWalletConnector({
			chains,
			options: {
				jsonRpcUrl: getRPC(1),
				appName: process.env.WEBSITE_TITLE as string
			}
		})
	]
});

export default config;
