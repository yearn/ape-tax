import {Fragment, useCallback, useMemo, useState} from 'react';
import {Contract} from 'ethcall';
import {ethers} from 'ethers';
import YVAULT_V3_BASE_ABI from 'utils/ABI/yVaultV3Base.abi';
import {apeInVault, apeOutVault, approveERC20, depositERC20, withdrawERC20, withdrawWithPermitERC20} from 'utils/actions';
import {getChainIDOrTestProvider} from 'utils/utils';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import ERC20_ABI from '@yearn-finance/web-lib/utils/abi/erc20.abi';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';
import {newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';
import {defaultTxStatus, Transaction} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {BigNumber} from 'ethers';
import type {ChangeEvent, ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';
import type {TransactionReceipt} from '@ethersproject/providers';

type TVaultActionInner = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
	onProceed: (receipt?: TransactionReceipt | undefined) => Promise<void>
}
function	VaultActionZaps({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();
	const	chainCoin = CHAINS[vault?.CHAIN_ID]?.coin || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[zapAmount, set_zapAmount] = useState(toNormalizedBN(0));
	const	[isZapIn, set_isZapIn] = useState(false);
	const	[isZapOut, set_isZapOut] = useState(false);
	const	[txStatusZapApproval, set_txStatusZapApproval] = useState(defaultTxStatus);

	/**************************************************************************
	** Some memoized values to avoid re-rendering or just to make things
	** easier in subsequent functions
	**************************************************************************/
	const	wantContract = useMemo((): ethers.Contract => new ethers.Contract(vault.WANT_ADDR, ERC20_ABI, provider), [vault, provider]);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchZapOutApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !wantContract || !vault.ZAP_ADDR) {
			return;
		}
		const	allowance = await wantContract.allowance(address, vault.ZAP_ADDR);
		onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, vault.ZAP_ADDR, wantContract]);



	async function	onZapIn(): Promise<void> {
		if (isZapIn || zapAmount.raw.isZero()) {
			return;
		}
		set_isZapIn(true);
		apeInVault({
			provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		}, ({error}): void => {
			set_isZapIn(false);
			if (error) {
				return;
			}
			onProceed?.();
		});
	}
	async function	onZapOutAllowance(): Promise<void> {
		new Transaction(provider, approveERC20, set_txStatusZapApproval).populate(
			toAddress(vault.VAULT_ADDR), //token
			toAddress(vault.ZAP_ADDR), //spender
			ethers.constants.MaxUint256 //amount
		).onSuccess(fetchZapOutApproval).perform();
	}
	async function	onZapOut(): Promise<void> {
		if (isZapOut || vaultData.balanceOf.raw.isZero() || vaultData.allowanceZapOut?.raw.isZero()) {
			return;
		}
		set_isZapOut(true);
		apeOutVault({
			provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: !zapAmount.raw.isZero() ? zapAmount.raw : vaultData.balanceOf.raw
		}, ({error}): void => {
			set_isZapOut(false);
			if (error) {
				return;
			}
			onProceed?.();
		});
	}

	return (
		<div className={'mb-6 flex flex-col'}>
			<div className={vault.VAULT_STATUS === 'withdraw' ? 'hidden' : ''}>
				<div className={'mb-2 mr-2 flex flex-row items-center'} style={{height: '33px'}}>
					<input
						className={'border-neutral-500 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-500'}
						style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
						type={'text'}
						value={zapAmount?.normalized}
						onChange={(e: ChangeEvent<HTMLInputElement>): void => set_zapAmount(
							handleInputChangeEventValue(e.target.value, vaultData.decimals)
						)} />
					<div className={'bg-neutral-50 border border-l-0 border-solid border-neutral-500 px-2 py-1.5 font-mono text-xs text-neutral-400'} style={{height: '33px'}}>
						{chainCoin}&nbsp;
					</div>
				</div>
			</div>
			<div>
				{
					vaultData.depositLimit.raw.gt(0) && vault.VAULT_STATUS !== 'withdraw' ?
						<>
							<button
								onClick={onZapIn}
								disabled={isZapIn || zapAmount.raw.isZero()}
								className={`${isZapIn || zapAmount.raw.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{'💰 Zap in'}
							</button>
						</> : <Fragment />
				}
				<Button
					variant={'outlined'}
					className={'bg-neutral-50 mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors hover:bg-neutral-100'}
					isBusy={txStatusZapApproval.pending}
					isDisabled={txStatusZapApproval.error || txStatusZapApproval.pending || vaultData?.allowanceZapOut?.raw.gt(0)}
					onClick={onZapOutAllowance}>
					{vaultData?.allowanceZapOut?.raw.gt(0) ? '✅ Approved' : '🚀 Approve Zap Out'}
				</Button>
				<button
					onClick={onZapOut}
					disabled={vaultData.balanceOf.raw.isZero() || vaultData?.allowanceZapOut?.raw?.isZero()}
					className={`${vaultData.balanceOf.raw.isZero() || vaultData?.allowanceZapOut?.raw?.isZero() ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
					{'💸 Zap out'}
				</button>
			</div>
		</div>
	);
}

function	VaultActionApeIn({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();

	/**************************************************************************
	** Some basic variables around the vault
	**************************************************************************/
	const	yearnRouterForChain = (process?.env?.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID];
	const	vaultSpender = vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR;
	const	chainCoin = CHAINS[vault?.CHAIN_ID]?.coin || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[txStatusApproval, set_txStatusApproval] = useState(defaultTxStatus);
	const	[txStatusDeposit, set_txStatusDeposit] = useState(defaultTxStatus);

	/**************************************************************************
	** Some memoized values to avoid re-rendering or just to make things
	** easier in subsequent functions
	**************************************************************************/
	const	wantContract = useMemo((): ethers.Contract => new ethers.Contract(vault.WANT_ADDR, ERC20_ABI, provider), [vault, provider]);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !wantContract || !vaultSpender) {
			return;
		}
		const	allowance = await wantContract.allowance(address, vaultSpender);
		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}, [address, wantContract, vaultSpender, onUpdateVaultData]);

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	async function	onApprove(): Promise<void> {
		new Transaction(provider, approveERC20, set_txStatusApproval).populate(
			toAddress(vault.WANT_ADDR), //token
			vaultSpender,
			ethers.constants.MaxUint256 //amount
		).onSuccess(fetchApproval).perform();
	}
	async function	onDeposit(): Promise<void> {
		new Transaction(provider, depositERC20, set_txStatusDeposit).populate(
			toAddress(vault.VAULT_ADDR), //vault
			vaultSpender, //spender (vault or router)
			amount.raw, //amount
			vault.VAULT_ABI !== 'v3' //isLegacy
		).onSuccess(onProceed).perform();
	}

	return (
		<div className={'flex w-full flex-col border border-dashed border-neutral-500 p-4'}>
			<div className={'mb-2'}>
				<p className={'font-mono text-xl font-semibold text-neutral-700'}>
					{'Deposit'}
				</p>
			</div>
			<div className={'mb-6 font-mono text-sm font-medium text-neutral-500'}>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${vault.WANT_SYMBOL} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.wantBalance.normalized, 6)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{`Your ${chainCoin} Balance: `}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.coinBalance.normalized, 2)}`}</p>
				</div>
			</div>

			<div className={'mb-2 flex w-full flex-row items-center'} style={{height: '33px'}}>
				<input
					className={'w-full border-neutral-500 bg-neutral-0/0 px-2 py-1.5 font-mono text-xs text-neutral-900'}
					style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
					type={'text'}
					value={amount?.normalized}
					onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
						handleInputChangeEventValue(e.target.value, vaultData.decimals)
					)} />
				<button
					onClick={(): void => set_amount(vaultData.wantBalance)}
					className={'border border-l-0 border-solid border-neutral-500 bg-neutral-100 px-2 py-1.5 font-mono text-xs text-neutral-700 transition-colors hover:bg-neutral-900 hover:text-neutral-0'}
					style={{height: '33px'}}>
					{'max'}
				</button>
				<Button
					variant={'outlined'}
					style={{height: '33px'}}
					className={'!mb-0 !ml-2 whitespace-nowrap'}
					isBusy={txStatusApproval.pending}
					isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw.gt(0)}
					onClick={onApprove}>
					{vaultData.allowance.raw.gt(0) ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
				</Button>
			</div>

			{/* <Button
				variant={'outlined'}
				isBusy={txStatusApproval.pending}
				isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw.gt(0)}
				onClick={onApprove}>
				{vaultData.allowance.raw.gt(0) ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
			</Button> */}
			<Button
				variant={'outlined'}
				isBusy={txStatusDeposit.pending}
				isDisabled={txStatusDeposit.error || txStatusDeposit.pending || vaultData.allowance.raw.isZero() || amount.raw.isZero()}
				onClick={onDeposit}>
				{'💰 Deposit'}
			</Button>

		</div>
	);
}

function	VaultActionApeOut({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();

	/**************************************************************************
	** Some basic variables around the vault
	**************************************************************************/
	const	yearnRouterForChain = (process?.env?.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID];
	const	vaultSpender = vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR;

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[txStatusApproval, set_txStatusApproval] = useState(defaultTxStatus);
	const	[txStatusWithdraw, set_txStatusWithdraw] = useState(defaultTxStatus);
	const	shouldUseApproval = vaultSpender === yearnRouterForChain && !process.env.SHOULD_USE_PERMIT;

	/**************************************************************************
	** Some memoized values to avoid re-rendering or just to make things
	** easier in subsequent functions
	**************************************************************************/
	const	wantContract = useMemo((): ethers.Contract => new ethers.Contract(vault.WANT_ADDR, ERC20_ABI, provider), [vault, provider]);
	const	vaultContract = useMemo((): ethers.Contract => new ethers.Contract(vault.VAULT_ADDR, VAULT_ABI, provider), [vault, provider]);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !wantContract || !vaultSpender) {
			return;
		}
		const	allowance = await vaultContract.allowance(address, yearnRouterForChain);
		onUpdateVaultData((v): TVaultData => ({...v, allowanceYRouter: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, vaultContract, vaultSpender, wantContract, yearnRouterForChain]);

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	async function	onApprove(): Promise<void> {
		new Transaction(provider, approveERC20, set_txStatusApproval).populate(
			toAddress(vault.VAULT_ADDR), //token
			yearnRouterForChain,
			ethers.constants.MaxUint256 //amount
		).onSuccess(fetchApproval).perform();
	}
	async function	onWithdraw(): Promise<void> {
		if (process.env.SHOULD_USE_PERMIT) {
			new Transaction(provider, withdrawWithPermitERC20, set_txStatusWithdraw).populate(
				vault.CHAIN_ID,
				vault.VAULT_ADDR,
				yearnRouterForChain,
				amount.raw
			).onSuccess(onProceed).perform();
		} else {
			new Transaction(provider, withdrawERC20, set_txStatusWithdraw).populate(
				vault.VAULT_ADDR, //vault
				vaultSpender, //spender (vault or router)
				amount.raw, //amount
				vault.VAULT_ABI !== 'v3' //isLegacy
			).onSuccess(onProceed).perform();
		}
	}

	return (
		<div className={'flex w-full flex-col border border-dashed border-neutral-500 p-4'}>
			<div className={'mb-2'}>
				<p className={'font-mono text-xl font-semibold text-neutral-700'}>
					{'Withdraw'}
				</p>
			</div>
			<div className={'mb-6 font-mono text-sm font-medium text-neutral-500'}>
				<div>
					<p className={'inline text-neutral-700'}>{'Your vault shares: '}</p>
					<p className={'inline text-neutral-500'}>{`${formatAmount(vaultData?.balanceOf.normalized, 6)}`}</p>
				</div>
				<div>
					<p className={'inline text-neutral-700'}>{'Your shares value: '}</p>
					<p className={'inline text-neutral-500'}>{`$${vaultData.balanceOfValue === 0 ? '-' : formatAmount(vaultData?.balanceOfValue, 2)}`}</p>
				</div>
			</div>

			<div className={'mb-2 flex w-full flex-row items-center'} style={{height: '33px'}}>
				<input
					className={'w-full border-neutral-500 bg-neutral-0/0 px-2 font-mono text-xs text-neutral-900'}
					disabled={vault.VAULT_STATUS === 'withdraw'}
					style={{height: '33px', backgroundColor: 'rgba(0,0,0,0)'}}
					type={'text'}
					value={amount?.normalized}
					onChange={(e: ChangeEvent<HTMLInputElement>): void => set_amount(
						handleInputChangeEventValue(e.target.value, vaultData.decimals)
					)} />
				<button
					onClick={(): void => set_amount(toNormalizedBN(vaultData.balanceOf.raw, vaultData.decimals))}
					className={'border border-l-0 border-solid border-neutral-500 bg-neutral-100 px-2 py-1.5 font-mono text-xs text-neutral-700 transition-colors hover:bg-neutral-900 hover:text-neutral-0'}
					style={{height: '33px'}}>
					{'max'}
				</button>
				{shouldUseApproval ? (
					<Button
						variant={'outlined'}
						style={{height: '33px'}}
						className={'!mb-0 !ml-2 whitespace-nowrap'}
						isBusy={txStatusApproval.pending}
						isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowanceYRouter.raw.gt(0)}
						onClick={onApprove}>
						{vaultData.allowanceYRouter.raw.gt(0) ? '✅ Vault approved' : '🚀 Approve vault'}
					</Button>
				) : <Fragment />}
			</div>

			{/* {shouldUseApproval ? (
				<Button
					variant={'outlined'}
					isBusy={txStatusApproval.pending}
					isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowanceYRouter.raw.gt(0)}
					onClick={onApprove}>
					{vaultData.allowanceYRouter.raw.gt(0) ? '✅ Vault approved' : '🚀 Approve vault'}
				</Button>
			) : <Fragment />} */}
			<Button
				variant={'outlined'}
				isBusy={txStatusWithdraw.pending}
				// isDisabled={txStatusWithdraw.error || txStatusWithdraw.pending || vaultData.balanceOf.raw.isZero() || amount.raw.isZero() || (shouldUseApproval ? vaultData.allowanceYRouter.raw.isZero() : false)}
				onClick={onWithdraw}>
				{'💸 Withdraw'}
			</Button>
		</div>
	);
}


type TVaultAction = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
	onProceed?: (receipt?: TransactionReceipt | undefined) => Promise<void>
}
function	VaultAction({vault, vaultData, onUpdateVaultData}: TVaultAction): ReactElement {
	const	{provider, address} = useWeb3();

	/**************************************************************************
	** fetchPostDepositOrWithdraw will
	**************************************************************************/
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}
		const	providerToUse = await getChainIDOrTestProvider(provider, vault.CHAIN_ID);
		const	ethcallProvider = await newEthCallProvider(providerToUse);
		const	wantContractMultiCall = new Contract(vault.WANT_ADDR, ERC20_ABI);
		const	vaultV2ContractMultiCall = new Contract(vault.VAULT_ADDR, VAULT_ABI);
		const	vaultV3ContractMultiCall = new Contract(vault.VAULT_ADDR, YVAULT_V3_BASE_ABI);
		const	yearnRouterForChain = (process.env.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID];
		const	allowanceSpender = vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR;
		const	calls = [
			wantContractMultiCall.allowance(address, allowanceSpender),
			wantContractMultiCall.balanceOf(address),
			vaultV2ContractMultiCall.balanceOf(address),
			vaultV2ContractMultiCall.totalAssets(),
			vaultV2ContractMultiCall.pricePerShare()
		];
		if (vault.VAULT_ABI === 'v3') {
			calls.push(vaultV3ContractMultiCall.availableDepositLimit(address));
			calls.push(vaultV3ContractMultiCall.availableDepositLimit(address));
		} else {
			calls.push(vaultV2ContractMultiCall.depositLimit());
			calls.push(vaultV2ContractMultiCall.availableDepositLimit());
		}
		const	canFail = calls.map((): false => false);
		const	[callResult, coinBalance] = await Promise.all([
			ethcallProvider.tryEach(calls, canFail),
			providerToUse.getBalance(address)
		]) as [[BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber], BigNumber];

		const	[wantAllowance, wantBalance, vaultBalance, totalAssets, pricePerShare, depositLimit, availableDepositLimit] = callResult;
		onUpdateVaultData((v): TVaultData => ({
			...v,
			allowance: toNormalizedBN(wantAllowance, v.decimals),
			wantBalance: toNormalizedBN(wantBalance, v.decimals),
			balanceOf: toNormalizedBN(vaultBalance, v.decimals),
			balanceOfValue: formatToNormalizedValue(vaultBalance, v.decimals) * Number(v.pricePerShare.normalized) * v.wantPrice,
			coinBalance: toNormalizedBN(coinBalance, 18),
			depositLimit: toNormalizedBN(depositLimit, v.decimals),
			totalAssets: toNormalizedBN(totalAssets, v.decimals),
			availableDepositLimit: toNormalizedBN(availableDepositLimit, v.decimals),
			pricePerShare: toNormalizedBN(pricePerShare, v.decimals),
			totalAUM: Number((Number(ethers.utils.formatUnits(totalAssets, v.decimals)) * v.wantPrice)),
			progress: depositLimit.isZero() ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals))
		}));

		if (vault.ZAP_ADDR) {
			const	vaultContract = new ethers.Contract(vault.VAULT_ADDR, VAULT_ABI, provider);
			const	allowantZapOut = await vaultContract.allowance(address, vault.ZAP_ADDR);
			onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowantZapOut, v.decimals)}));
		}
	}

	return (
		<section aria-label={'ACTIONS'} className={'my-4 mt-8'}>
			<h1 className={'mb-6 font-mono text-2xl font-semibold text-neutral-900'}>{'APE-IN/OUT'}</h1>
			<div className={vault.VAULT_STATUS === 'withdraw' ? '' : 'hidden'}>
				<p className={'font-mono text-sm font-medium text-neutral-700'}>{'Deposit closed.'}</p>
			</div>

			{vault.ZAP_ADDR ? <VaultActionZaps
				vault={vault}
				vaultData={vaultData}
				onUpdateVaultData={onUpdateVaultData}
				onProceed={fetchPostDepositOrWithdraw}
			/> : (<Fragment />)}

			<div className={'grid w-full max-w-5xl grid-cols-2 gap-8'}>
				{vaultData.depositLimit.raw.gt(0) && vault.VAULT_STATUS !== 'withdraw' ? (
					<VaultActionApeIn
						vault={vault}
						vaultData={vaultData}
						onUpdateVaultData={onUpdateVaultData}
						onProceed={fetchPostDepositOrWithdraw} />
				) : (<Fragment />)}
				<VaultActionApeOut
					vault={vault}
					vaultData={vaultData}
					onUpdateVaultData={onUpdateVaultData}
					onProceed={fetchPostDepositOrWithdraw} />
			</div>
		</section>
	);
}

export default VaultAction;
