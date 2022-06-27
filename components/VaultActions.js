import	React, {useState}														from	'react';
import	{ethers}																from	'ethers';
import	{useWeb3}																from	'@yearn-finance/web-lib/contexts';
import	{providers}																from	'@yearn-finance/web-lib/utils';
import	chains																	from	'utils/chains.json';
import	{approveToken, depositToken, withdrawToken, apeInVault, apeOutVault}	from	'utils/actions';

function	VaultAction({vault, vaultData, onUpdateVaultData}) {
	const	{provider, address, chainID} = useWeb3();
	const	chainCoin = chains[vault?.CHAIN_ID]?.coin || 'ETH';
	const	[amount, set_amount] = useState(0);
	const	[zapAmount, set_zapAmount] = useState(0);
	const	[isApproving, set_isApproving] = useState(false);
	const	[isZapOutApproving, set_isZapOutApproving] = useState(false);
	const	[isDepositing, set_isDepositing] = useState(false);
	const	[isWithdrawing, set_isWithdrawing] = useState(false);

	/**************************************************************************
	** We need to update the status when some events occurs
	**************************************************************************/
	async function	fetchApproval() {
		if (!vault || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.VAULT_ADDR);
		onUpdateVaultData(v => ({...v, allowance: Number(ethers.utils.formatUnits(allowance, v.decimals))}));
	}
	async function	fetchZapOutApproval() {
		if (!vault || !provider || !address) {
			return;
		}
		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, ['function allowance(address, address) public view returns (uint256)'], provider
		);
		const	allowance = await wantContract.allowance(address, vault.ZAP_ADDR);
		onUpdateVaultData(v => ({...v, allowanceZapOut: Number(ethers.utils.formatUnits(allowance, v.decimals))}));
	}
	async function	fetchPostDepositOrWithdraw() {
		if (!vault || !provider || !address) {
			return;
		}
		let		providerToUse = provider;
		if (vault.CHAIN_ID === 250 && chainID !== 1337) {
			providerToUse = providers.getProvider(250);
		}
		if (vault.CHAIN_ID === 4 && chainID !== 1337) {
			providerToUse = providers.getProvider(4);
		}
		if (vault.CHAIN_ID === 137 && chainID !== 1337) {
			providerToUse = providers.getProvider(137);
		}
		if (vault.CHAIN_ID === 42161 && chainID !== 1337) {
			providerToUse = providers.getProvider(42161);
		}
		if (vault.CHAIN_ID === 100 && chainID !== 100) {
			providerToUse = providers.getProvider(100);
		}

		const	wantContract = new ethers.Contract(
			vault.WANT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)'
			], providerToUse
		);
		const	vaultContract = new ethers.Contract(
			vault.VAULT_ADDR, [
				'function balanceOf(address) public view returns (uint256)',
				'function allowance(address, address) public view returns (uint256)',
				'function depositLimit() public view returns (uint256)',
				'function totalAssets() public view returns (uint256)',
				'function availableDepositLimit() public view returns (uint256)',
				'function pricePerShare() public view returns (uint256)',
			], providerToUse);
		
		const	[wantAllowance, wantBalance, vaultBalance, coinBalance, depositLimit, totalAssets, availableDepositLimit, pricePerShare] = await Promise.all([
			wantContract.allowance(address, vault.VAULT_ADDR),
			wantContract.balanceOf(address),
			vaultContract.balanceOf(address),
			providerToUse.getBalance(address),
			vaultContract.depositLimit(),
			vaultContract.totalAssets(),
			vaultContract.availableDepositLimit(),
			vaultContract.pricePerShare(),
		]);
		onUpdateVaultData(v => ({
			...v,
			allowance: Number(ethers.utils.formatUnits(wantAllowance, v.decimals)),
			wantBalance: Number(ethers.utils.formatUnits(wantBalance, v.decimals)).toFixed(2),
			wantBalanceRaw: wantBalance,
			balanceOf: Number(ethers.utils.formatUnits(vaultBalance, v.decimals)).toFixed(2),
			balanceOfRaw: vaultBalance,
			balanceOfValue: (Number(ethers.utils.formatUnits(vaultBalance, v.decimals)) * v.pricePerShare * v.wantPrice).toFixed(2),
			coinBalance: Number(ethers.utils.formatEther(coinBalance)).toFixed(2),
			depositLimit: Number(ethers.utils.formatUnits(depositLimit, v.decimals)).toFixed(2),
			totalAssets: Number(ethers.utils.formatUnits(totalAssets, v.decimals)).toFixed(2),
			availableDepositLimit: Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals)).toFixed(2),
			pricePerShare: Number(ethers.utils.formatUnits(pricePerShare, v.decimals)).toFixed(4),
			totalAUM: (Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice).toFixed(2),
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals)),
		}));

		if (vault.ZAP_ADDR) {
			const	allowantZapOut = await vaultContract.allowance(address, vault.ZAP_ADDR);
			onUpdateVaultData((v) => ({...v, allowanceZapOut: Number(ethers.utils.formatUnits(allowantZapOut, v.decimals))}));
		}
	}

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	function	onZapIn() {
		if (isDepositing || Number(zapAmount) === 0)
			return;
		set_isDepositing(true);
		apeInVault({provider, contractAddress: vault.ZAP_ADDR, amount: ethers.utils.parseUnits(zapAmount, vaultData.decimals)}, ({error}) => {
			set_isDepositing(false);
			if (error)
				return;
			fetchPostDepositOrWithdraw();
		});
	}
	function	onZapOutAllowance() {
		if (isZapOutApproving)
			return;
		set_isZapOutApproving(true);
		approveToken({provider, contractAddress: vault.VAULT_ADDR, amount: ethers.constants.MaxUint256, from: vault.ZAP_ADDR}, ({error}) => {
			set_isZapOutApproving(false);
			if (error)
				return;
			fetchZapOutApproval();
		});
	}
	function	onZapOut() {
		if (isWithdrawing || Number(vaultData.balanceOf) === 0 || vaultData.allowanceZapOut === 0)
			return;
		set_isWithdrawing(true);
		apeOutVault({
			provider,
			contractAddress: vault.ZAP_ADDR,
			amount: zapAmount ? ethers.utils.parseUnits(zapAmount, vaultData.decimals) : (vaultData.balanceOfRaw).toString(),
		}, ({error}) => {
			set_isWithdrawing(false);
			if (error)
				return;
			fetchPostDepositOrWithdraw();
		});
	}
	function	onApprove() {
		if (isApproving)
			return;
		set_isApproving(true);
		approveToken({provider, contractAddress: vault.WANT_ADDR, amount: ethers.constants.MaxUint256, from: vault.VAULT_ADDR}, ({error}) => {
			set_isApproving(false);
			if (error)
				return;
			fetchApproval();
		});
	}
	function	onDeposit() {
		if (isDepositing || (vaultData.allowance < Number(amount) || Number(amount) === 0) || isDepositing)
			return;
		set_isDepositing(true);
		depositToken({provider, contractAddress: vault.VAULT_ADDR, amount: ethers.utils.parseUnits(amount, vaultData.decimals)}, ({error}) => {
			set_isDepositing(false);
			if (error)
				return;
			fetchPostDepositOrWithdraw();
		});
	}
	function	onDepositAll() {
		if (isDepositing || (vaultData.allowance < Number(amount)) || isDepositing || vaultData.wantBalanceRaw.isZero())
			return;
		set_isDepositing(true);
		depositToken({provider, contractAddress: vault.VAULT_ADDR, amount: vaultData.wantBalanceRaw}, ({error}) => {
			set_isDepositing(false);
			if (error)
				return;
			fetchPostDepositOrWithdraw();
		});
	}
	function	onWithdraw() {
		if (isWithdrawing || Number(vaultData.balanceOf) === 0)
			return;
		set_isWithdrawing(true);
		withdrawToken({
			provider,
			contractAddress: vault.VAULT_ADDR,
			amount: ethers.utils.parseUnits(amount, vaultData.decimals),
		}, ({error}) => {
			set_isWithdrawing(false);
			if (error)
				return;
			fetchPostDepositOrWithdraw();
		});
	}
	function	onWithdrawAll() {
		if (isWithdrawing || Number(vaultData.balanceOf) === 0)
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
	}

	return (
		<section aria-label={'ACTIONS'} className={'mt-8 my-4'}>
			<h1 className={'text-2xl font-mono font-semibold text-neutral-700 mb-6'}>{'APE-IN/OUT'}</h1>
			<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
				<p className={'font-mono font-medium text-neutral-500 text-sm'}>{'Deposit closed.'}</p>
			</div>

			{vault.ZAP_ADDR ?
				<div className={'flex flex-col mb-6'}>
					<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
						<div className={'flex flex-row items-center mb-2 mr-2'} style={{height: '33px'}}>
							<input
								className={'text-xs px-2 py-1.5 text-neutral-500 border-neutral-400 font-mono bg-neutral-0/0'}
								style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
								type={'number'}
								min={'0'}
								value={zapAmount}
								onChange={(e) => set_zapAmount(e.target.value)} />
							<div className={'bg-neutral-50 text-xs font-mono px-2 py-1.5 border border-neutral-400 border-solid border-l-0 text-neutral-400'} style={{height: '33px'}}>
								{chainCoin}&nbsp;
							</div>
						</div>
					</div>
					<div>
						{
							vaultData.depositLimit !== 0 && vault.VAULT_STATUS !== 'withdraw' ?
								<>
									<button
										onClick={onZapIn}
										disabled={isDepositing || Number(zapAmount) === 0}
										className={`${isDepositing || Number(zapAmount) === 0 ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mb-2 mr-8`}>
										{'💰 Zap in'}
									</button>
								</>
								: null
						}
						<button
							onClick={onZapOutAllowance}
							disabled={vaultData.allowanceZapOut > 0 || isZapOutApproving}
							className={`${vaultData.allowanceZapOut > 0 || isZapOutApproving ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
							{vaultData.allowanceZapOut > 0 ? '✅ Approved' : '🚀 Approve Zap Out'}
						</button>
						<button
							onClick={onZapOut}
							disabled={Number(vaultData.balanceOf) === 0 || vaultData?.allowanceZapOut === 0}
							className={`${Number(vaultData.balanceOf) === 0 || vaultData?.allowanceZapOut === 0 ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
							{'💸 Zap out'}
						</button>
					</div>
				</div>
				:
				null
			}


			<div className={'flex flex-col'}>
				<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
					<div className={'flex flex-row items-center mb-2 mr-2'} style={{height: '33px'}}>
						<input
							className={'text-xs px-2 py-1.5 text-neutral-500 border-neutral-400 font-mono bg-neutral-0/0'}
							style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
							type={'number'}
							min={'0'}
							value={amount}
							onChange={(e) => set_amount(e.target.value)} />
						<div className={'bg-neutral-50 text-xs font-mono px-2 py-1.5 border border-neutral-400 border-solid border-l-0 text-neutral-400'} style={{height: '33px'}}>
							{vault.WANT_SYMBOL}
						</div>
					</div>
				</div>
				<div>
					{
						vaultData.depositLimit !== 0 && vault.VAULT_STATUS !== 'withdraw' ?
							<>
								<button
									onClick={onApprove}
									className={`${vaultData.allowance > 0 || isApproving ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
									{vaultData.allowance > 0 ? '✅ Approved' : '🚀 Approve Vault'}
								</button>
								<button
									onClick={onDeposit}
									disabled={vaultData.allowance === 0 || (Number(amount) === 0) || isDepositing}
									className={`${vaultData.allowance === 0 || (Number(amount) === 0) || isDepositing ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
									{'💰 Deposit'}
								</button>
								<button
									onClick={onDepositAll}
									disabled={vaultData.allowance === 0 || isDepositing || vaultData?.wantBalanceRaw?.isZero()}
									className={`${vaultData.allowance === 0 || isDepositing || vaultData?.wantBalanceRaw?.isZero() ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
									{'💰 Deposit All'}
								</button>
							</>
							: null
					}
					<button
						onClick={onWithdraw}
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2`}>
						{'💸 Withdraw'}
					</button>
					<button
						onClick={onWithdrawAll}
						disabled={Number(vaultData.balanceOf) === 0}
						className={`${Number(vaultData.balanceOf) === 0 ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold`}>
						{'💸 Withdraw All'}
					</button>
				</div>
			</div>
		</section>
	);
}

export default VaultAction;