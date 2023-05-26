import {useState} from 'react';
import Link from 'next/link';
import chains from 'utils/chains.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useClientEffect} from '@yearn-finance/web-lib/hooks/useClientEffect';
import {truncateHex} from '@yearn-finance/web-lib/utils/address';

function	Navbar({router}) {
	const	{isActive, address, provider, ens, chainID, onDesactivate, openLoginModal} = useWeb3();
	const	[initialPopup, set_initialPopup] = useState(false);

	useClientEffect(() => {
		const	timeout = setTimeout(() => {
			if (initialPopup) {
				return;
			}

			if (!address) {
				openLoginModal();
			}
			set_initialPopup(true);
		}, 1000);
		return () => clearTimeout(timeout);
	}, [address]);

	const		stringToColour = function(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		let color = '#';
		for (let i = 0; i < 3; i++) {
			let value = (hash >> (i * 8)) & 0xFF;
			color += ('00' + value.toString(16)).substr(-2);
		}
		return color;
	};

	function	onSwitchChain(newChainID) {
		if (newChainID === chainID) {
			return;
		}
		if (!provider || !isActive) {
			console.error('Not initialized');
			return;
		}
		if (Number(newChainID) === 1) {
			provider.send('wallet_switchEthereumChain', [{chainId: '0x1'}]).catch((error) => console.error(error));
		} else if (Number(newChainID) === 4) {
			provider.send('wallet_switchEthereumChain', [{chainId: '0x4'}]).catch((error) => console.error(error));
		} else {
			provider.send('wallet_addEthereumChain', [chains[newChainID].chain_swap, address]).catch((error) => console.error(error));
		}
	}

	function	renderWalletButton() {
		if (!isActive) {
			return (
				<button
					onClick={openLoginModal}
					className={'inline-flex cursor-pointer items-center whitespace-nowrap border border-solid border-neutral-400 bg-neutral-0 px-3 py-2 font-mono text-xs font-semibold leading-4 text-neutral-700'}>
					<span className={'hidden md:block'}>{'Connect wallet'}</span>
					<span className={'block md:hidden'}>{'+'}</span>
				</button>
			);
		}
		return (
			<p
				onClick={onDesactivate}
				suppressHydrationWarning
				className={'inline-flex cursor-pointer items-center whitespace-nowrap border border-solid border-neutral-400 bg-neutral-0 px-3 py-2 font-mono text-xs font-semibold leading-4 text-neutral-700'}>
				<svg
					className={'mr-0 md:mr-2'}
					width={'16'}
					height={'16'}
					viewBox={'0 0 16 16'}
					fill={'none'}
					xmlns={'http://www.w3.org/2000/svg'}>
					<path d={'M12.6667 0H3.33333C1.46667 0 0 1.46667 0 3.33333V12.6667C0 14.5333 1.46667 16 3.33333 16H12.6667C14.5333 16 16 14.5333 16 12.6667V3.33333C16 1.46667 14.5333 0 12.6667 0ZM4.66667 5C5.2 5 5.66667 5.46667 5.66667 6C5.66667 6.53333 5.2 7 4.66667 7C4.13333 7 3.66667 6.53333 3.66667 6C3.66667 5.46667 4.13333 5 4.66667 5ZM12.0667 10.4C10.9333 11.4667 9.46667 12.0667 8 12.0667C6.53333 12.0667 5 11.4667 3.93333 10.4C3.8 10.2667 3.73333 10.1333 3.73333 9.93333C3.73333 9.53333 4 9.26667 4.4 9.26667C4.6 9.26667 4.73333 9.33333 4.86667 9.46667C5.73333 10.3333 6.86667 10.8 8 10.8C9.13333 10.8 10.2667 10.3333 11.1333 9.46667C11.2667 9.33333 11.4 9.26667 11.6 9.26667C12 9.26667 12.2667 9.53333 12.2667 9.93333C12.2667 10.1333 12.2 10.2667 12.0667 10.4ZM11.3333 7C10.8 7 10.3333 6.53333 10.3333 6C10.3333 5.46667 10.8 5 11.3333 5C11.8667 5 12.3333 5.46667 12.3333 6C12.3333 6.53333 11.8667 7 11.3333 7Z'} fill={stringToColour(ens || `${truncateHex(address, 5)}`)}/>
				</svg>
				<span className={'hidden md:block'}>{ens || `${truncateHex(address, 5)}`}</span>
			</p>
		);
	}
	return (
		<nav className={'flex h-12 w-full flex-row justify-center'}>
			<div className={'flex w-full flex-row items-center justify-between'}>
				<div>
					{router.route !== '/' ? (
						<Link href={'/'}>
							<p className={'dashed-underline-gray cursor-pointer font-mono text-xs font-semibold text-neutral-700 transition-all'}>
								{'<< Back home'}
							</p>
						</Link>
					) : null}
				</div>
				<div className={'flex flex-row items-center justify-end'}>
					{router.route === '/' ? 
						<select
							value={chainID}
							className={'m-0 mr-2 hidden cursor-pointer items-center whitespace-nowrap border border-solid border-neutral-400 bg-neutral-0 px-3 py-2 pr-7 font-mono text-xs font-semibold leading-4 text-neutral-700 md:flex'}
							onChange={e => onSwitchChain(e.target.value)}>
							{Object.values(chains).map((chain, index) => (
								<option key={index} value={chain.chainID}>{chain.name}</option>
							))}
						</select> : null}
					{renderWalletButton()}
				</div>
			</div>
		</nav>
	);
}

export default Navbar;
