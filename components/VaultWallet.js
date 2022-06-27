import	React								from	'react';
import	{useWeb3}							from	'@yearn-finance/web-lib/contexts';
import	{truncateHex}						from	'@yearn-finance/web-lib/utils';
import	{formatAmount}						from	'utils';
import	chains								from	'utils/chains.json';

function	VaultWallet({vault, vaultData}) {
	const	{address, ens} = useWeb3();
	const	chainCoin = chains[vault?.CHAIN_ID]?.coin || 'ETH';

	return (
		<section aria-label={'WALLET'} className={'mt-8'}>
			<h1 className={'text-2xl font-mono font-semibold text-neutral-700 mb-6'}>{'Wallet'}</h1>
			<div className={'font-mono text-neutral-500 font-medium text-sm mb-4'}>
				<div>
					<p className={'inline text-neutral-700'}>{'Your Account: '}</p>
					<p className={'inline text-neutral-500 font-bold'}>{ens || `${truncateHex(address)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Your vault shares: '}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.balanceOf || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Your shares value: '}</p>
					<p className={'inline text-neutral-500'}>{`${vaultData.balanceOfValue === 'NaN' ? '-' : formatAmount(vaultData?.balanceOfValue || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.wantBalance || 0, 2)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.coinBalance || 0, 2)}`}</p>
				</div>
			</div>
		</section>
	);
}

export default VaultWallet;