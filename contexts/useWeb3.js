/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				useWeb3.js
******************************************************************************/

import	React, {useState, useEffect, useContext, createContext, useCallback}	from	'react';
import	{ethers}																from	'ethers';
import	QRCodeModal																from	'@walletconnect/qrcode-modal';
import	{useWeb3React}															from	'@web3-react-fork/core';
import	{InjectedConnector}														from	'@web3-react-fork/injected-connector';
import	{ConnectorEvent}														from	'@web3-react-fork/types';
import	{WalletConnectConnector}												from	'@web3-react-fork/walletconnect-connector';
import	useLocalStorage															from	'hook/useLocalStorage';
import	{toAddress}																from	'utils';

const walletType = {NONE: -1, METAMASK: 0, WALLET_CONNECT: 1};
const Web3Context = createContext();

function getProvider(chain = 'ethereum') {
	if (chain === 'ethereum') {
		if (process.env.ALCHEMY_KEY) {
			return new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY);
		} else {
			return new ethers.providers.InfuraProvider('homestead', '9aa3d95b3bc440fa88ea12eaa4456161');
		}
	} else if (chain === 'polygon') {
		return new ethers.providers.JsonRpcProvider('https://rpc-mainnet.matic.network');
	} else if (chain === 'fantom') {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
	} else if (chain === 'bsc') {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');
	} else if (chain === 'major') {
		return new ethers.providers.JsonRpcProvider('http://localhost:8545');
	}
	return (new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY));
}

export const Web3ContextApp = ({children}) => {
	const	web3 = useWeb3React();
	const	[initialized, set_initialized] = useState(false);
	const	[provider, set_provider] = useState(undefined);
	const	[address, set_address] = useLocalStorage('address', '');
	const	[ens, set_ens] = useLocalStorage('ens', '');
	const	[chainID, set_chainID] = useLocalStorage('chainID', -1);
	const	[lastWallet, set_lastWallet] = useLocalStorage('lastWallet', walletType.NONE);
	const	[, set_nonce] = useState(0);
	const	{activate, active, library, connector, account, chainId, deactivate} = web3;

	const onUpdate = useCallback(async (update) => {
		if (update.provider) {
			set_provider(library);
		}
		if (update.chainId) {
			if (update.chainId.startsWith('0x')) {
				set_chainID(parseInt(update.chainId, 16));
			} else {
				set_chainID(Number(update.chainId));
			}
		}
		if (update.account) {
			getProvider().lookupAddress(toAddress(update.account)).then(_ens => set_ens(_ens || ''));
			set_address(toAddress(update.account));
		}
		set_nonce(n => n + 1);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [library]);

	const onDesactivate = useCallback(() => {
		set_chainID(-1);
		set_provider(undefined);
		set_lastWallet(walletType.NONE);
		set_address('');
		set_ens('');
		if (connector !== undefined) {
			connector
				.off(ConnectorEvent.Update, onUpdate)
				.off(ConnectorEvent.Deactivate, onDesactivate);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connector]);

	const onActivate = useCallback(async () => {
		set_provider(library);
		set_address(toAddress(account));
		library.getNetwork().then(e => set_chainID(e.chainId));
		getProvider().lookupAddress(toAddress(account)).then(_ens => set_ens(_ens || ''));

		connector
			.on(ConnectorEvent.Update, onUpdate)
			.on(ConnectorEvent.Deactivate, onDesactivate);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account, chainId, connector, library, onDesactivate, onUpdate]);


	/**************************************************************************
	**	connect
	**	What should we do when the user choose to connect it's wallet ?
	**	Based on the providerType (AKA Metamask or WalletConnect), differents
	**	actions should be done.
	**	Then, depending on the providerType, a similar action, but different
	**	code is executed to set :
	**	- The provider for the web3 actions
	**	- The current address/account
	**	- The current chain
	**	Moreover, we are starting to listen to events (disconnect, changeAccount
	**	or changeChain).
	**************************************************************************/
	const connect = useCallback(async (_providerType) => {
		if (_providerType === walletType.METAMASK) {
			if (active) {
				deactivate();
			}
			const	injected = new InjectedConnector({
				supportedChainIds: [
					1, // ETH MAINNET
					56, // BSC MAINNET
					137, // MATIC MAINNET
					250, // FANTOM MAINNET
					1337, // MAJORNET
				]
			});
			activate(injected, undefined, true);
			set_lastWallet(walletType.METAMASK);
		} else if (_providerType === walletType.WALLET_CONNECT) {
			if (active) {
				deactivate();
			}
			const walletconnect = new WalletConnectConnector({
				rpc: {
					1: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
					56: 'https://bsc-dataseed.binance.org/',
					137: 'https://rpc-mainnet.matic.network',
					250: 'https://rpc.ftm.tools',
					1337: 'http://localhost:8545',
				},
				chainId: 1,
				bridge: 'https://bridge.walletconnect.org',
				pollingInterval: 12000,
				qrcodeModal: QRCodeModal,
				qrcode: true,
			});
			try {
				await activate(walletconnect, undefined, true);
				set_lastWallet(walletType.WALLET_CONNECT);
			} catch (error) {
				console.error(error);
				set_lastWallet(walletType.NONE);
			}
		}
	}, [activate, active, deactivate, set_lastWallet]);

	useEffect(() => {
		if (active) {
			set_initialized(true);
			onActivate();
		}
	}, [active, onActivate]);

	useEffect(() => {
		if (!active && lastWallet !== walletType.NONE) {
			connect(lastWallet);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);

	useEffect(() => {
		setTimeout(() => set_initialized(true), 1500);
	}, []);

	return (
		<Web3Context.Provider
			value={{
				address,
				ens,
				connect,
				deactivate,
				onDesactivate,
				walletType,
				chainID,
				active,
				initialized,

				provider,
				getProvider,
				currentRPCProvider: provider
			}}>
			{children}
		</Web3Context.Provider>
	);
};

export const useWeb3 = () => useContext(Web3Context);
export default useWeb3;
