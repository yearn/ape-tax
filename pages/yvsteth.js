/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Saturday August 21st 2021
**	@Filename:				yvsteth.js
******************************************************************************/

import	React, {useState, useEffect}					from	'react';
import	{ethers}										from	'ethers';
import	useWeb3											from	'contexts/useWeb3';
import	vaults											from	'utils/vaults.json';
import	chains											from	'utils/chains.json';
import	{fetchCryptoPrice}								from	'utils/API';
import	{bigNumber, formatAmount}						from	'utils';
import	{approveToken, depositToken, withdrawToken}		from	'utils/actions';

function	InfoMessage() {
	return (
		<>
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-ygray-700 bg-tag-warning'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. It's extremely risky and will probably be discarded when the test is over. Proceed with extreme caution."}
			</div>
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-ygray-700 bg-tag-warning'}>
				{'📣 '}<strong>{'DISCLAIMER'}</strong> {'When you transfer and deposit, your ETH will be converted into stETH 1:1 and deposit in the vault. You will not be able to redeem stETH for ETH until txs are enables in ETH2.0.'}
			</div>
		</>
	);
}

function	Index() {
	const	{provider, active, address, ens} = useWeb3();
	const	vault = vaults['yvsteth'];
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	chainCoin = chains[vault?.CHAIN_ID]?.coin || 'ETH';
	const	[amount, set_amount] = useState(0);
	const	[vaultData, set_vaultData] = useState({
		totalSupply: 0,
		pricePerShare: 1,
		decimals: 18,
		coinBalance: 0,
		balanceOf: 0,
		balanceOfValue: 0,
		wantBalance: 0,
		wantPrice: 0,
		totalAUM: 0,
		allowance: 0,
		version: '-',
		wantBalanceRaw: bigNumber.from(0),
	});
	const	[isApproving, set_isApproving] = useState(false);
	const	[isDepositing, set_isDepositing] = useState(false);
	const	[isWithdrawing, set_isWithdrawing] = useState(false);
	
	/**************************************************************************
	** Retrieve the details of the vault and compute some of the elements for
	** the UI.
	**************************************************************************/
	useEffect(() => {
		if (!vault || !active || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], provider
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function version() public view returns (string)',
				'function totalSupply() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
				'function decimals() public view returns (uint256)',
				'function balanceOf(address) public view returns (uint256)',
			],
			provider
		);

		Promise.all([
			vaultContract.version(),
			vaultContract.totalSupply(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.balanceOf(address),
			fetchCryptoPrice((vault.COINGECKO_SYMBOL.toLowerCase())),
			provider.getBalance(address),
			wantContract.balanceOf(address),
			wantContract.allowance(address, vault.VAULT_ADDR),
		]).then(async ([version, totalSupply , pricePerShare, decimals, balanceOf, wantPrice, coinBalance, wantBalance, wantAllowance]) => {
			const	price = wantPrice[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;

			set_vaultData({
				version: version,
				totalSupply: Number(ethers.utils.formatUnits(totalSupply, decimals)).toFixed(2),
				pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, decimals)).toFixed(4),
				decimals,
				coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
				balanceOf: Number(ethers.utils.formatUnits(balanceOf, decimals)).toFixed(2),
				balanceOfValue: (Number(ethers.utils.formatUnits(balanceOf, decimals)) * Number(ethers.utils.formatUnits(pricePerShare, decimals)) * price).toFixed(2),
				wantBalance: Number(ethers.utils.formatUnits(wantBalance, decimals)).toFixed(2),
				wantBalanceRaw: wantBalance,
				wantPrice: price,
				totalAUM: (Number(ethers.utils.formatUnits(totalSupply, decimals)) * price).toFixed(2),
				allowance: Number(ethers.utils.formatUnits(wantAllowance, decimals))
			});
		});
	}, [vault, active, provider, address]);

	/**************************************************************************
	** We need to update the status when some events occurs
	**************************************************************************/
	async function	fetchApproval() {
		if (!vault || !active || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.VAULT_ADDR);
		set_vaultData(v => ({...v, allowance: Number(ethers.utils.formatUnits(allowance, v.decimals))}));
	}
	async function	fetchPostDepositOrWithdraw() {
		if (!vault || !active || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], provider
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function totalSupply() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
			], provider);
		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, totalSupply, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			provider.getBalance(address),
			vaultContract.totalSupply(),
			vaultContract.pricePerShare(),
		]);
		set_vaultData(v => ({
			...v,
			allowance: Number(ethers.utils.formatUnits(wantAllowance, v.decimals)),
			wantBalance: Number(ethers.utils.formatUnits(wantBalance, v.decimals)).toFixed(2),
			wantBalanceRaw: wantBalance,
			balanceOf: Number(ethers.utils.formatUnits(vaultBalance, v.decimals)).toFixed(2),
			balanceOfValue: (Number(ethers.utils.formatUnits(vaultBalance, v.decimals)) * v.pricePerShare * v.wantPrice).toFixed(2),
			coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
			totalSupply: Number(ethers.utils.formatUnits(totalSupply, v.decimals)).toFixed(2),
			pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, v.decimals)).toFixed(4),
			totalAUM: (Number(ethers.utils.formatUnits(totalSupply, v.decimals)) * v.wantPrice).toFixed(2)

		}));
	}

	if (!vault) {
		return null;
	}

	return (
		<section className={'mt-8 text-ygray-700 dark:text-dark-50'}>
			<div>
				<h1 className={'text-7xl font-mono font-semibold text-ygray-900 dark:text-white leading-120px'}>{vault.LOGO}</h1>
				<h1 className={'text-3xl font-mono font-semibold text-ygray-900 dark:text-white'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage />
			<section aria-label={'DETAILS'}>
				<div className={'font-mono text-ygray-700 dark:text-dark-50 font-medium text-sm mb-4'}>
					<div>
						<p className={'inline'}>{'Vault: '}</p>
						<a
							className={'dashed-underline-gray'}
							href={`${chainExplorer}/address/${vault.VAULT_ADDR}#code`} target={'_blank'} rel={'noreferrer'}>
							{'📃 Contract'}
						</a>
					</div>
					<div>
						<p className={'inline'}>{'Version: '}</p>
						<p className={'inline'}>{vaultData.version}</p>
					</div>
					<div>
						<p className={'inline'}>{`${vault.WANT_SYMBOL} price (CoinGecko 🦎): `}</p>
						<p className={'inline'}>{`$${vaultData.wantPrice ? formatAmount(vaultData?.wantPrice || 0, vaultData.wantPrice < 10 ? 4 : 2) : '-'}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Deposit Limit: '}</p>
						<p className={'inline'}>{`∞ ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total Assets: '}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.totalSupply || 0, 2)} ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total AUM: '}</p>
						<p className={'inline'}>{`$${vaultData.totalAUM === 'NaN' ? '-' : formatAmount(vaultData?.totalAUM || 0, 2)}`}</p>
					</div>
				</div>
				<div className={'font-mono text-ygray-700 dark:text-dark-50 font-medium text-sm mb-4'}>
					<div>
						<p className={'inline'}>{'Price Per Share: '}</p>
						<p className={'inline'}>{`${vaultData.pricePerShare}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Available limit: '}</p>
						<p className={'inline'}>{`∞ ${vault.WANT_SYMBOL}`}</p>
					</div>
				</div>
			</section>

			<section aria-label={'WALLET'} className={'mt-8'}>
				<h1 className={'text-2xl font-mono font-semibold text-ygray-900 dark:text-white mb-6'}>{'Wallet'}</h1>
				<div className={'font-mono text-ygray-700 dark:text-dark-50 font-medium text-sm mb-4'}>
					<div>
						<p className={'inline'}>{'Your Account: '}</p>
						<p className={'inline font-bold'}>{ens || `${address.slice(0, 4)}...${address.slice(-4)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your vault shares: '}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.balanceOf || 0, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your shares value: '}</p>
						<p className={'inline'}>{`${vaultData.balanceOfValue === 'NaN' ? '-' : formatAmount(vaultData?.balanceOfValue || 0, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.wantBalance || 0, 2)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${chainCoin} Balance: `}</p>
						<p className={'inline'}>{`${formatAmount(vaultData?.coinBalance || 0, 2)}`}</p>
					</div>
				</div>
			</section>
			<section aria-label={'ACTIONS'} className={'my-4'}>
				<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
					<label className={'font-mono font-semibold text-sm mb-1.5 text-ygray-900 dark:text-white'}>{'Amount'}</label>
					<div className={'flex flex-row items-center'}>
						<input
							className={'text-xs px-2 py-1.5 text-ygray-700 dark:text-dark-50 border-ygray-200 dark:border-dark-200 font-mono bg-white dark:bg-dark-600 bg-opacity-0 dark:bg-opacity-0'}
							style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
							type={'number'}
							min={'0'}
							value={amount}
							onChange={(e) => set_amount(e.target.value)} />
						<div className={'bg-ygray-50 dark:bg-dark-400 text-xs font-mono px-2 py-1.5 border border-ygray-200 dark:border-dark-200 border-solid border-l-0 text-ygray-400 dark:text-white'} style={{height: '33px'}}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
					<p className={'font-mono font-medium text-ygray-700 dark:text-dark-50 text-sm'}>{'Deposit closed.'}</p>
				</div>
				<div className={'mt-10'}>
					<button
						onClick={() => {
							if (isApproving)
								return;
							set_isApproving(true);
							approveToken({
								provider,
								contractAddress: vault.WANT_ADDR,
								amount: amount === 0 ? ethers.constants.MaxUint256 : ethers.utils.parseUnits(amount, vaultData.decimals),
								from: vault.VAULT_ADDR
							}, ({error}) => {
								set_isApproving(false);
								if (error)
									return;
								fetchApproval();
							});
						}}
						disabled={vaultData.allowance > 0 || isApproving}
						className={`${vaultData.allowance > 0 || isApproving ? 'bg-ygray-50 dark:bg-dark-400 opacity-30 cursor-not-allowed' : 'bg-ygray-50 dark:bg-dark-400 hover:bg-ygray-100 dark:hover:bg-dark-300'} transition-colors font-mono border border-solid border-ygray-600 dark:border-dark-200 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
						{vaultData.allowance > 0 ? '✅ Approved' : '🚀 Approve Vault'}
					</button>
					<button
						onClick={() => {
							if (isDepositing)
								return;
							set_isDepositing(true);
							depositToken({
								provider,
								contractAddress: vault.VAULT_ADDR,
								amount: ethers.utils.parseUnits(amount, vaultData.decimals),
							}, ({error}) => {
								set_isDepositing(false);
								if (error)
									return;
								fetchPostDepositOrWithdraw();
							});
						}}
						disabled={vaultData.allowance === 0 || (Number(amount) === 0) || isDepositing}
						className={`${vaultData.allowance === 0 || (Number(amount) === 0) || isDepositing ? 'bg-ygray-50 dark:bg-dark-400 opacity-30 cursor-not-allowed' : 'bg-ygray-50 dark:bg-dark-400 hover:bg-ygray-100 dark:hover:bg-dark-300'} transition-colors font-mono border border-solid border-ygray-600 dark:border-dark-200 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
						{'🏦 Deposit'}
					</button>
					<button
						onClick={() => {
							if (isDepositing)
								return;
							set_isDepositing(true);
							depositToken({
								provider,
								contractAddress: vault.VAULT_ADDR,
								amount: vaultData.wantBalanceRaw,
							}, ({error}) => {
								set_isDepositing(false);
								if (error)
									return;
								fetchPostDepositOrWithdraw();
							});
						}}
						disabled={vaultData.allowance === 0 || isDepositing || vaultData?.wantBalanceRaw?.isZero()}
						className={`${vaultData.allowance === 0 || isDepositing || vaultData?.wantBalanceRaw?.isZero() ? 'bg-ygray-50 dark:bg-dark-400 opacity-30 cursor-not-allowed' : 'bg-ygray-50 dark:bg-dark-400 hover:bg-ygray-100 dark:hover:bg-dark-300'} transition-colors font-mono border border-solid border-ygray-600 dark:border-dark-200 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
						{'🏦 Deposit All'}
					</button>
					<button
						onClick={() => {
							if (isWithdrawing)
								return;
							set_isWithdrawing(true);
							withdrawToken({
								provider,
								contractAddress: vault.VAULT_ADDR,
								amount: ethers.constants.MaxUint256,
							}, ({error}) => {
								set_isWithdrawing(false);
								if (error)
									return;
								fetchPostDepositOrWithdraw();
							});
						}}
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-ygray-50 dark:bg-dark-400 opacity-30 cursor-not-allowed' : 'bg-ygray-50 dark:bg-dark-400 hover:bg-ygray-100 dark:hover:bg-dark-300'} transition-colors font-mono border border-solid border-ygray-600 dark:border-dark-200 text-sm px-1.5 py-1.5 font-semibold`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</section>
		</section>
	);
}

export default Index;
