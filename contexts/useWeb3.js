/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				useWeb3.js
******************************************************************************/

import	React, {useContext, createContext}	from	'react';
import	{ethers}							from	'ethers';
import	QRCodeModal							from	'@walletconnect/qrcode-modal';
import	{useWeb3React}						from	'@web3-react-fork/core';
import	{InjectedConnector}					from	'@web3-react-fork/injected-connector';
import	{WalletConnectConnector}			from	'@web3-react-fork/walletconnect-connector';
import	useLocalStorage						from	'hook/useLocalStorage';
import	useWindowInFocus					from	'hook/useWindowInFocus';
import	useDebounce							from	'hook/useDebounce';
import	useClientEffect						from	'hook/useClientEffect';
import	{toAddress}							from	'utils';
import	performBatchedUpdates				from	'utils/performBatchedUpdates';

const walletType = {NONE: -1, METAMASK: 0, WALLET_CONNECT: 1};
const Web3Context = createContext();

function getProvider(chain = 'ethereum') {
	if (chain === 'ethereum') {
		if (process.env.ALCHEMY_KEY) {
			return new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY);
		} else {
			return new ethers.providers.InfuraProvider('homestead', '9aa3d95b3bc440fa88ea12eaa4456161');
		}
	} else if (chain === 'rinkeby') {
		return new ethers.providers.JsonRpcProvider(`https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`);
	} else if (chain === 'polygon') {
		if (process.env.ALCHEMY_KEY_POLYGON) {
			return new ethers.providers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_POLYGON}`);
		}
		return new ethers.providers.JsonRpcProvider('https://rpc-mainnet.matic.network');
	} else if (chain === 'fantom') {
		return new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
	} else if (chain === 'bsc') {
		return new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');
	} else if (chain === 'major') {
		return new ethers.providers.JsonRpcProvider('http://localhost:8545');
	} else if (chain === 'arbitrum') {
		return new ethers.providers.JsonRpcProvider('https://arbitrum.public-rpc.com');
	} else if (chain === 'xdai') {
		return new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com/');
	}

	return (new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_KEY));
}

export const Web3ContextApp = ({children, router}) => {
	const	web3 = useWeb3React();
	const   {activate, active, library, account, chainId, deactivate} = web3;
	const	windowInFocus = useWindowInFocus();
	const	[ens, set_ens] = useLocalStorage('ens', '');
	const	[lastWallet, set_lastWallet] = useLocalStorage('lastWallet', walletType.NONE);
	const   [disconnected, set_disconnected] = React.useState(false);
	const	[disableAutoChainChange, set_disableAutoChainChange] = React.useState(false);
	const	debouncedChainID = useDebounce(chainId, 500);

	const onSwitchChain = React.useCallback((force) => {
		if (!force && (!active || disableAutoChainChange)) {
			return;
		}
		const	isCompatibleChain = [1, 4, 56, 100, 137, 250, 1337, 31337, 42161].includes(Number(chainId || 0));
		if (isCompatibleChain) {
			return;
		}
		if (!library || !active) {
			console.error('Not initialized');
			return;
		}
		library
			.send('wallet_switchEthereumChain', [{chainId: '0x1'}])
			.catch(() => set_disableAutoChainChange(true));
	}, [active, disableAutoChainChange, debouncedChainID, library]);

	React.useEffect(() => {
		if (router.pathname !== '/[slug]')
			onSwitchChain();
	}, [windowInFocus, onSwitchChain, router]);

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
	const connect = React.useCallback(async (_providerType) => {
		if (_providerType === walletType.METAMASK) {
			if (active) {
				deactivate();
			}
			const	injected = new InjectedConnector();
			activate(injected, undefined, true);
			set_lastWallet(walletType.METAMASK);
		} else if (_providerType === walletType.WALLET_CONNECT) {
			if (active) {
				deactivate();
			}
			const walletconnect = new WalletConnectConnector({
				rpc: {
					1: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
					4: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
					56: 'https://bsc-dataseed.binance.org/',
					137: 'https://rpc-mainnet.matic.network',
					250: 'https://rpc.ftm.tools',
					1337: 'http://localhost:8545',
					42161: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ARBITRUM_KEY}/arbitrum/mainnet`,
					100: 'https://rpc.gnosischain.com/',
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
	}, [activate, active, deactivate]);

	useClientEffect(() => {
		if (!active && lastWallet !== walletType.NONE) {
			connect(lastWallet);
		}
	}, [active]);

	useClientEffect(() => {
		if (account) {
			getProvider()
				.lookupAddress(toAddress(account))
				.then((_ens) => set_ens(_ens || ''));
		}
	}, [account]);

	return (
		<Web3Context.Provider
			value={{
				address: account,
				ens,
				connect,
				deactivate,
				walletType,
				chainID: Number(chainId || 0),
				active: active && [1, 4, 56, 100, 137, 250, 1337, 31337, 42161].includes(Number(chainId || 0)),
				provider: library,
				getProvider,
				disconnected,
				onDesactivate: () => {
					performBatchedUpdates(() => {
						set_lastWallet(walletType.NONE);
						set_disconnected(true);
					});
					setTimeout(() => set_disconnected(false), 100);
				}
			}}>
			{children}
		</Web3Context.Provider>
	);
};

export const useWeb3 = () => useContext(Web3Context);
export default useWeb3;
