/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Sunday July 4th 2021
**	@Filename:				index.js
******************************************************************************/

import	React, {useState, useEffect, useCallback}					from	'react';
import	{ethers}													from	'ethers';
import	useWeb3														from	'contexts/useWeb3';
import	vaults														from	'utils/vaults.json';
import	chains														from	'utils/chains.json';
import	{fetchCryptoPrice, fetchYearnVaults, fetchBlockTimestamp}	from	'utils/API';
import	{ADDRESS_ZERO, asyncForEach, bigNumber}						from	'utils';
import	{approveToken, depositToken, withdrawToken}					from	'utils/actions';

function	InfoMessage({status}) {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-white bg-tag-info'}>
				{'🚀 '}<strong>{'YEARN WEBSITE'}</strong> {"this vault is in Yearn Finance website. You don't need to move your funds."}
			</div>
		);
	}
	if (status === 'withdraw') {
		return (
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-white bg-tag-withdraw'}>
				{'🛑 '}<strong>{'WITHDRAW YOUR FUNDS'}</strong> {'this experiment is disabled and it will not generate more yield. Please remove your funds.'}
			</div>
		);
	}
	return (
		<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-ygray-700 bg-tag-warning'}>
			{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. It's extremely risky and will probably be discarded when the test is over. Proceed with extreme caution."}
		</div>
	);
}


function	ProgressChart({progress, width}) {
	const	part_char = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
	const	whole_char = '█';
	const	whole_width = Math.floor(progress * width);
	const	remainder_width = (progress * width) % 1;
	const	part_width = Math.floor(remainder_width * 9);
	let		white_width = width - whole_width - 1;

	if (progress == 1)
		white_width = 0;
	
	return '' + whole_char.repeat(whole_width) + part_char[part_width] + ' '.repeat(white_width) + '';
}

function	Strategies({vault}) {
	const	{provider, active, address} = useWeb3();
	const	[strategiesData, set_strategiesData] = useState([]);
	const	[, set_nonce] = useState(0);
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';

	/**************************************************************************
	** Retrieve the details of the attached strategies and compute some of the
	** elements for the UI.
	**************************************************************************/
	const prepreStrategiesData = useCallback(async () => {
		const	vaultContract = new ethers.Contract(vault.VAULT_ADDR, ['function withdrawalQueue(uint256 arg0) view returns (address)'], provider);
		const	strategiesIndex = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
		let		shouldBreak = false;
		asyncForEach(strategiesIndex, async (index) => {
			if (shouldBreak) {
				return;
			}

			/**************************************************************************
			** The fun part to get all the strategies addresses is that we need to
			** retrieve the address of the strategy from withdrawQueue, looping
			** through the max number of strategies until we hit 0
			**************************************************************************/
			const	strategyAddress = await vaultContract.withdrawalQueue(index);
			if (strategyAddress === ADDRESS_ZERO) {
				shouldBreak = true;
				return;
			}
			const	strategyContract = new ethers.Contract(strategyAddress, ['function name() view returns (string)'], provider);
			const	name = await strategyContract.name();
			set_strategiesData((s) => {
				s[index] = {address: strategyAddress, name};
				return (s);
			});
			set_nonce(n => n + 1);
		});
	}, [provider, vault?.VAULT_ADDR]);

	useEffect(() => {
		if (!vault || !active || !provider || !address) {
			return;
		}
		prepreStrategiesData();
	}, [vault, active, provider, address, prepreStrategiesData]);

	return (
		<section aria-label={'STRATEGIES'} className={'mt-8'}>
			<h1 className={'text-2xl font-mono font-semibold text-ygray-900 mb-6'}>{'Strategies'}</h1>
			{
				strategiesData.map((strategy, index) => (

					<div key={index} className={'font-mono text-ygray-700 text-sm'}>
						<div>
							<p className={'inline font-bold'}>{`Strat. ${index}: `}</p>
							<p className={'inline'}>{strategy.name}</p>
						</div>
						<div>
							<p className={'inline'}>{'Address: '}</p>
							<a
								className={'dashed-underline-gray'}
								href={`${chainExplorer}/address/${strategy.address}#code`} target={'_blank'} rel={'noreferrer'}>
								{'📃 Contract'}
							</a>
						</div>
					</div>
				))
			}
		</section>
	);
}

function	Index(props) {
	const	{provider, active, address, ens} = useWeb3();
	const	vault = vaults[props?.router?.query?.slug];
	const	chainExplorer = chains[vault?.CHAIN_ID]?.block_explorer || 'https://etherscan.io';
	const	chainCoin = chains[vault?.CHAIN_ID]?.coin || 'ETH';
	const	[amount, set_amount] = useState(0);
	const	[vaultData, set_vaultData] = useState({
		depositLimit: 0,
		totalAssets: 0,
		availableDepositLimit: 0,
		pricePerShare: 1,
		decimals: 18,
		coinBalance: 0,
		balanceOf: 0,
		balanceOfValue: 0,
		wantBalance: 0,
		wantPrice: 0,
		totalAUM: 0,
		progress:  0,
		allowance: 0,
		apiVersion: '-',
		grossAPRWeek: '-',
		grossAPRMonth: '-',
		grossAPRInception: '-',
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
				'function apiVersion() public view returns (string)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
				'function decimals() public view returns (uint256)',
				'function balanceOf(address) public view returns (uint256)',
				'function activation() public view returns(uint256)',
			],
			provider
		);

		Promise.all([
			vaultContract.apiVersion(),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare(),
			vaultContract.decimals(),
			vaultContract.balanceOf(address),
			vaultContract.activation(),
			fetchCryptoPrice((vault.COINGECKO_SYMBOL.toLowerCase())),
			fetchYearnVaults(),
			provider.getBlockNumber(),
			provider.getBalance(address),
			wantContract.balanceOf(address),
			wantContract.allowance(address, vault.VAULT_ADDR),
		]).then(async ([apiVersion, depositLimit, totalAssets, availableDepositLimit, pricePerShare, decimals, balanceOf, activation, wantPrice, yearnVaults, block, coinBalance, wantBalance, wantAllowance]) => {
			const	price = wantPrice[vault.COINGECKO_SYMBOL.toLowerCase()]?.usd;
			const	grossFromYearn = yearnVaults.find((item) => item.address === vault.VAULT_ADDR)?.apy?.gross_apr;
			let		_grossAPRWeek = '-';
			let		_grossAPRMonth = '-';
			let		_grossAPRInception = '-';

			if (vault.VAULT_STATUS !== 'endorsed' && !grossFromYearn) {
				const	activationTimestamp = Number(activation);
				const	blockActivated = Number(await fetchBlockTimestamp(activationTimestamp) || 0);
				const	averageBlockPerWeek = 269 * 24 * 7;
				const	averageBlockPerMonth = 269 * 24 * 30;
				const	blockLastWeekRef = (block - averageBlockPerWeek) < blockActivated ? blockActivated : (block - averageBlockPerWeek);
				const	blockLastMonthRef = (block - averageBlockPerMonth) < blockActivated ? blockActivated : (block - averageBlockPerMonth);
	
				const [_pastPricePerShareWeek, _pastPricePerShareMonth] = await Promise.all([
					vaultContract.pricePerShare({blockTag: blockLastWeekRef}),
					vaultContract.pricePerShare({blockTag: blockLastMonthRef}),
				]);
				const	currentPrice = ethers.utils.formatUnits(pricePerShare, decimals.toNumber());
				const	pastPriceWeek = ethers.utils.formatUnits(_pastPricePerShareWeek, decimals.toNumber());
				const	pastPriceMonth = ethers.utils.formatUnits(_pastPricePerShareMonth, decimals.toNumber());
				const	weekRoi = (currentPrice / pastPriceWeek - 1);
				const	monthRoi = (currentPrice / pastPriceMonth - 1);
				const	inceptionROI = (currentPrice - 1);
	
				_grossAPRWeek = (weekRoi ? `${(weekRoi * 100).toFixed(2)}%` : '-');
				_grossAPRMonth = (monthRoi ? `${(monthRoi * 100).toFixed(2)}%` : '-');
				_grossAPRInception = (inceptionROI ? `${(inceptionROI * 100).toFixed(4)}%` : '-');
			} else if (vault.CHAIN_ID === 1) {
				_grossAPRWeek = (grossFromYearn ? `${(grossFromYearn * 100).toFixed(4)}%` : '-');
			}

			set_vaultData({
				apiVersion: apiVersion,
				depositLimit: Number(ethers.utils.formatUnits(depositLimit, decimals)).toFixed(2),
				totalAssets: Number(ethers.utils.formatUnits(totalAssets, decimals)).toFixed(2),
				availableDepositLimit: Number(ethers.utils.formatUnits(availableDepositLimit, decimals)).toFixed(2),
				pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, decimals)).toFixed(4),
				decimals,
				coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
				balanceOf: Number(ethers.utils.formatUnits(balanceOf, decimals)).toFixed(2),
				balanceOfValue: (Number(ethers.utils.formatUnits(balanceOf, decimals)) * Number(ethers.utils.formatUnits(pricePerShare, decimals)) * price).toFixed(2),
				wantBalance: Number(ethers.utils.formatUnits(wantBalance, decimals)).toFixed(2),
				wantBalanceRaw: wantBalance,
				wantPrice: price,
				totalAUM: (Number(ethers.utils.formatUnits(totalAssets, decimals)) * price).toFixed(2),
				progress: (Number(ethers.utils.formatUnits(depositLimit, decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, decimals))) / Number(ethers.utils.formatUnits(depositLimit, decimals)),
				grossAPRWeek: _grossAPRWeek,
				grossAPRMonth: _grossAPRMonth,
				grossAPRInception: _grossAPRInception,
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
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
			], provider);
		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, depositLimit, totalAssets, availableDepositLimit, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			provider.getBalance(address),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
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
			depositLimit: Number(ethers.utils.formatUnits(depositLimit, v.decimals)).toFixed(2),
			totalAssets: Number(ethers.utils.formatUnits(totalAssets, v.decimals)).toFixed(2),
			availableDepositLimit: Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals)).toFixed(2),
			pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, v.decimals)).toFixed(4),
			totalAUM: (Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice).toFixed(2),
			progress: (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals)),

		}));
	}

	if (!vault) {
		return null;
	}

	return (
		<main className={'mt-8 text-ygray-700'}>
			<div>
				<h1 className={'text-7xl font-mono font-semibold text-ygray-900 leading-120px'}>{vault.LOGO}</h1>
				<h1 className={'text-3xl font-mono font-semibold text-ygray-900'}>{vault.TITLE}</h1>
			</div>
			<InfoMessage status={vault.VAULT_STATUS} />
			<section aria-label={'DETAILS'}>
				<div className={'font-mono text-ygray-700 font-medium text-sm mb-4'}>
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
						<p className={'inline'}>{vaultData.apiVersion}</p>
					</div>
					<div>
						<p className={'inline'}>{`${vault.WANT_SYMBOL} price (CoinGecko 🦎): `}</p>
						<p className={'inline'}>{`$${vaultData.wantPrice || '-'}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Deposit Limit: '}</p>
						<p className={'inline'}>{`${vaultData.depositLimit} ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total Assets: '}</p>
						<p className={'inline'}>{`${vaultData.totalAssets} ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Total AUM: '}</p>
						<p className={'inline'}>{`$${vaultData.totalAUM === 'NaN' ? '-' : vaultData.totalAUM}`}</p>
					</div>
				</div>
				<div className={`font-mono text-ygray-700 font-medium text-sm mb-4 ${vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}`}>
					<div>
						<p className={'inline'}>{'Gross APR (last week): '}</p>
						<p className={'inline'}>{`${vaultData.grossAPRWeek}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Gross APR (last month): '}</p>
						<p className={'inline'}>{`${vaultData.grossAPRMonth}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Gross APR (inception): '}</p>
						<p className={'inline'}>{`${vaultData.grossAPRInception}`}</p>
					</div>
				</div>
				<div className={'font-mono text-ygray-700 font-medium text-sm mb-4'}>
					<div>
						<p className={'inline'}>{'Price Per Share: '}</p>
						<p className={'inline'}>{`${vaultData.pricePerShare}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Available limit: '}</p>
						<p className={'inline'}>{`${vaultData.availableDepositLimit} ${vault.WANT_SYMBOL}`}</p>
					</div>
					<div className={'progress-bar'}>
						<span className={'progress-body mr-2 hidden md:inline'}>
							&nbsp;{'['}&nbsp;
							<ProgressChart progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress} width={50} />
							&nbsp;{']'}&nbsp;
						</span>
						<span className={'progress-body mr-2 inline md:hidden'}>
							&nbsp;{'['}&nbsp;
							<ProgressChart progress={vault.VAULT_STATUS === 'withdraw' ? 1 : vaultData.progress} width={30} />
							&nbsp;{']'}&nbsp;
						</span>
						{`${vault.VAULT_STATUS === 'withdraw' ? '100' : (vaultData.progress * 100).toFixed(2)}%`}
					</div>
				</div>
			</section>
			<Strategies vault={vault} />
			<section aria-label={'WALLET'} className={'mt-8'}>
				<h1 className={'text-2xl font-mono font-semibold text-ygray-900 mb-6'}>{'Wallet'}</h1>
				<div className={'font-mono text-ygray-700 font-medium text-sm mb-4'}>
					<div>
						<p className={'inline'}>{'Your Account: '}</p>
						<p className={'inline font-bold'}>{ens || `${address.slice(0, 4)}...${address.slice(-4)}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your vault shares: '}</p>
						<p className={'inline'}>{`${vaultData.balanceOf}`}</p>
					</div>
					<div>
						<p className={'inline'}>{'Your shares value: '}</p>
						<p className={'inline'}>{`${vaultData.balanceOfValue === 'NaN' ? '-' : vaultData.balanceOfValue}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
						<p className={'inline'}>{`${vaultData.wantBalance}`}</p>
					</div>
					<div>
						<p className={'inline'}>{`Your ${chainCoin} Balance: `}</p>
						<p className={'inline'}>{`${vaultData.coinBalance}`}</p>
					</div>
				</div>
			</section>
			<section aria-label={'ACTIONS'} className={'my-4'}>
				<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
					<label className={'font-mono font-semibold text-sm mb-1.5 text-ygray-900'}>{'Amount'}</label>
					<div className={'flex flex-row items-center'}>
						<input
							className={'text-xs px-2 py-1.5 text-ygray-700 border-ygray-200 font-mono'}
							type={'number'}
							min={'0'}
							value={amount}
							onChange={(e) => set_amount(e.target.value)} />
						<div className={'bg-ygray-50 text-xs font-mono px-2 py-1.5 border border-ygray-200 border-solid border-l-0 text-ygray-400'}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
					<p className={'font-mono font-medium text-ygray-700 text-sm'}>{'Deposit closed.'}</p>
				</div>
				<div className={'mt-10'}>
					{
						vaultData.depositLimit > 0 && vault.VAULT_STATUS !== 'withdraw' ?
							<>
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
									disabled={(vaultData.allowance >= Number(amount) && Number(amount) > 0) || isApproving}
									className={`${(vaultData.allowance >= Number(amount) && Number(amount) > 0) || isApproving ? 'bg-ygray-50 opacity-30 cursor-not-allowed' : 'bg-ygray-50 hover:bg-ygray-100'} transition-colors font-mono border border-solid border-ygray-600 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
									{(vaultData.allowance >= Number(amount) && Number(amount) > 0) ? '✅ Approved' : '🚀 Approve Vault'}
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
									disabled={(vaultData.allowance < Number(amount) || Number(amount) === 0) || isDepositing}
									className={`${(vaultData.allowance < Number(amount) || Number(amount) === 0) || isDepositing ? 'bg-ygray-50 opacity-30 cursor-not-allowed' : 'bg-ygray-50 hover:bg-ygray-100'} transition-colors font-mono border border-solid border-ygray-600 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
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
									disabled={(vaultData.allowance < Number(amount) || Number(amount) === 0) || isDepositing}
									className={`${(vaultData.allowance < Number(amount) || Number(amount) === 0) || isDepositing ? 'bg-ygray-50 opacity-30 cursor-not-allowed' : 'bg-ygray-50 hover:bg-ygray-100'} transition-colors font-mono border border-solid border-ygray-600 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
									{'🏦 Deposit All'}
								</button>
							</>
							: null
					}
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
						disabled={vaultData.balanceOf <= 0}
						className={`${vaultData.balanceOf <= 0 ? 'bg-ygray-50 opacity-30 cursor-not-allowed' : 'bg-ygray-50 hover:bg-ygray-100'} transition-colors font-mono border border-solid border-ygray-600 text-sm px-1.5 py-1.5 font-semibold`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</section>
		</main>
	);
}

export default Index;
