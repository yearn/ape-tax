import React from 'react';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {toAddress, truncateHex} from '@yearn-finance/web-lib/utils/address';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';

function	VaultWallet({vault, vaultData}: {vault: TVault, vaultData: TVaultData}): ReactElement {
	const	{address, ens} = useWeb3();
	const	chainCoin = CHAINS[vault?.CHAIN_ID]?.coin || 'ETH';

	return (
		<section aria-label={'WALLET'} className={'mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-700'}>{'Wallet'}</h1>
			<div className={'mb-4 font-mono text-sm font-medium text-neutral-500'}>
				<div>
					<p className={'inline text-neutral-700'}>{'Your Account: '}</p>
					<p className={'inline font-bold text-neutral-500'}>{ens || `${truncateHex(toAddress(address), 5)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Your vault shares: '}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.balanceOf.normalized, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Your shares value: '}</p>
					<p className={'inline text-neutral-500'}>{`${vaultData.balanceOfValue === 0 ? '-' : formatAmount(vaultData?.balanceOfValue, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.wantBalance.normalized, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.coinBalance.normalized, 2)}`}</p>
				</div>
			</div>
		</section>
	);
}

export default VaultWallet;
