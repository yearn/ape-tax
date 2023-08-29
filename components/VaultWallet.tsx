import {useNetwork} from 'wagmi';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress, truncateHex} from '@yearn-finance/web-lib/utils/address';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';

import type {ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';

function	VaultWallet({vault, vaultData}: {vault: TVault, vaultData: TVaultData}): ReactElement {
	const	{address, ens} = useWeb3();
	const	{chain} = useNetwork();
	const	chainCoin = chain?.nativeCurrency.symbol || 'ETH';

	return (
		<section aria-label={'WALLET'} className={'mt-8'}>
			<h1 className={'mb-6 text-2xl font-semibold text-neutral-900'}>{'Wallet'}</h1>
			<div className={'mb-4 text-sm font-medium'}>
				<div>
					<p className={'inline text-neutral-900'}>{'Your Account: '}</p>
					<p className={'ml-3 inline'}>{ens || `${truncateHex(toAddress(address), 5)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Your vault shares: '}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.balanceOf.normalized, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Your shares value: '}</p>
					<p className={'ml-3 inline'}>{`${vaultData.balanceOfValue === 0 ? '-' : formatAmount(vaultData?.balanceOfValue, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.wantBalance.normalized, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'ml-3 inline'}>{`${formatAmount(vaultData?.coinBalance.normalized, 2)}`}</p>
				</div>
			</div>
		</section>
	);
}

export default VaultWallet;
