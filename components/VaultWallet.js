import React from 'react';
import {formatAmount} from 'utils';
import chains from 'utils/chains.json';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {truncateHex} from '@yearn-finance/web-lib/utils/address';

function VaultWallet({vault, vaultData}) {
	const	{address, ens} = useWeb3();
	const	chainCoin = chains[vault?.CHAIN_ID]?.coin || 'ETH';

	return (
		<section aria-label={'WALLET'} className={'mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-900'}>{'Wallet'}</h1>
			<div className={'mb-4 font-mono text-sm font-medium text-neutral-700'}>
				<div>
					<p className={'inline text-neutral-900'}>{'Your Account: '}</p>
					<p className={'inline font-bold text-neutral-700'}>{ens || `${truncateHex(address, 5)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Your vault shares: '}</p>
					<p className={'inline text-neutral-700'}>{`${formatAmount(vaultData?.balanceOf || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{'Your shares value: '}</p>
					<p className={'inline text-neutral-700'}>{`${vaultData.balanceOfValue === 'NaN' ? '-' : formatAmount(vaultData?.balanceOfValue || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'inline text-neutral-700'}>{`${formatAmount(vaultData?.wantBalance || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-900'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'inline text-neutral-700'}>{`${formatAmount(vaultData?.coinBalance || 0, 2)}`}</p>
				</div>
			</div>
		</section>
	);
}

export default VaultWallet;
