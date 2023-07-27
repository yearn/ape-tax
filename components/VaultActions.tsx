import {Fragment, useCallback, useState} from 'react';
import {apeInVault, apeOutVault, approveERC20, depositERC20, withdrawWithPermitERC20} from 'utils/actions';
import {erc20ABI, fetchBalance, multicall, readContract} from '@wagmi/core';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import VAULT_ABI from '@yearn-finance/web-lib/utils/abi/vault.abi';
import {isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import {MAX_UINT_256} from '@yearn-finance/web-lib/utils/constants';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {formatToNormalizedValue, toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {handleInputChangeEventValue} from '@yearn-finance/web-lib/utils/handlers/handleInputChangeEventValue';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';

import type {ChangeEvent, ReactElement} from 'react';
import type {TVault, TVaultData} from 'utils/types';
import type {TNDict} from '@yearn-finance/web-lib/types';
import type {TransactionReceipt} from '@ethersproject/providers';
import YVAULT_V3_BASE_ABI from 'utils/ABI/yVaultV3Base.abi';
import {useNetwork} from 'wagmi';
import { ethers } from 'ethers';
import { defaultTxStatus } from '@yearn-finance/web-lib/utils/web3/transaction';


type TVaultActionInner = {
	vault: TVault,
	vaultData: TVaultData,
	onUpdateVaultData: (fn: (v: TVaultData) => TVaultData) => void
	onProceed: (receipt?: TransactionReceipt | undefined) => Promise<void>
}

function	VaultActionZaps({vault, vaultData, onUpdateVaultData, onProceed}: TVaultActionInner): ReactElement {
	const	{provider, address} = useWeb3();
	const	{chain} = useNetwork();
	const	chainCoin = chain?.nativeCurrency.symbol || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[zapAmount, set_zapAmount] = useState(toNormalizedBN(0));
	const	[isZapIn, set_isZapIn] = useState(false);
	const	[isZapOut, set_isZapOut] = useState(false);
	const	[txStatusZapApproval, set_txStatusZapApproval] = useState(defaultTxStatus);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchZapOutApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !vault.ZAP_ADDR) {
			return;
		}

		const allowance = await readContract({
			abi: erc20ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vault.ZAP_ADDR)]
		});

		onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, vault.ZAP_ADDR]);


	const onZapIn = useCallback(async (): Promise<void> => {
		if (isZapIn || isZero(zapAmount.raw)) {
			return;
		}

		set_isZapIn(true);
		const result = await apeInVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: zapAmount.raw
		})
		set_isZapIn(false);
		
		if(result.isSuccessful){
			onProceed();
		}
	}, []);


	async function	onZapOutAllowance(): Promise<void> {
		const result = await approveERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR), //token
			spenderAddress: toAddress(vault.ZAP_ADDR), //spender
			amount: MAX_UINT_256,
			statusHandler: set_txStatusZapApproval
		});

		if(result.isSuccessful){
			fetchZapOutApproval()
		}
	}
	async function	onZapOut(): Promise<void> {
		if (isZapOut || isZero(vaultData.balanceOf.raw) || isZero(vaultData.allowanceZapOut?.raw)) {
			return;
		}

		set_isZapOut(true);
		const result = await apeOutVault({
			connector: provider,
			contractAddress: toAddress(vault.ZAP_ADDR),
			amount: !isZero(zapAmount.raw) ? zapAmount.raw : vaultData.balanceOf.raw
		})
		set_isZapOut(false);
		
		if(result.isSuccessful){
			onProceed();
		}
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
					vaultData.depositLimit.raw > 0n && vault.VAULT_STATUS !== 'withdraw' ?
						<>
							<button
								onClick={onZapIn}
								disabled={isZapIn || isZero(zapAmount.raw)}
								className={`${isZapIn || isZero(zapAmount.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-8 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
								{'💰 Zap in'}
							</button>
						</> : <Fragment />
				}
				<Button
					variant={'outlined'}
					className={'bg-neutral-50 mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors hover:bg-neutral-100'}
					isBusy={txStatusZapApproval.pending}
					isDisabled={txStatusZapApproval.error || txStatusZapApproval.pending || (vaultData.allowanceZapOut && vaultData?.allowanceZapOut?.raw > 0n)}
					onClick={onZapOutAllowance}>
					{(vaultData.allowanceZapOut && vaultData?.allowanceZapOut?.raw > 0n) ? '✅ Approved' : '🚀 Approve Zap Out'}
				</Button>
				<button
					onClick={onZapOut}
					disabled={isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw)}
					className={`${isZero(vaultData.balanceOf.raw) || isZero(vaultData?.allowanceZapOut?.raw) ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold transition-colors`}>
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
	const	{chain} = useNetwork();
	const	chainCoin = chain?.nativeCurrency.symbol || 'ETH';

	/**************************************************************************
	** State management for our actions
	**************************************************************************/
	const	[amount, set_amount] = useState(toNormalizedBN(0));
	const	[txStatusApproval, set_txStatusApproval] = useState(defaultTxStatus);
	const	[txStatusDeposit, set_txStatusDeposit] = useState(defaultTxStatus);

	/**************************************************************************
	** Callback to handle the approvals updates
	**************************************************************************/
	const	fetchApproval = useCallback(async (): Promise<void> => {
		if (!address || isZeroAddress(address) || !vault || !vaultSpender) {
			return;
		}

		const allowance = await readContract({
			abi: VAULT_ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vaultSpender)]
		});

		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}, [address, vault, vaultSpender, onUpdateVaultData]);

	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	const onApprove = useCallback(async (): Promise<void> => {
		const result = await approveERC20({
			connector: provider,
			contractAddress: toAddress(vault.WANT_ADDR),
			spenderAddress: toAddress(vaultSpender),
			amount: MAX_UINT_256,
			statusHandler: set_txStatusApproval
		});

		if(result.isSuccessful){
			fetchApproval();
		}

	}, [fetchApproval, provider, vaultSpender, vault.WANT_ADDR]);



	async function	onDeposit(): Promise<void> {
		const result = await depositERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			spenderAddress: toAddress(vaultSpender),
			amount: amount.raw,
			isLegacy: vault.VAULT_ABI !== 'v3',
			statusHandler: set_txStatusDeposit
		});

		if(result.isSuccessful){
			onProceed();
		}
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
					isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw > 0n}
					onClick={onApprove}>
					{vaultData.allowance.raw > 0n ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
				</Button>
			</div>

			{/* <Button
				variant={'outlined'}
				isBusy={txStatusApproval.pending}
				isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowance.raw > 0n}
				onClick={onApprove}>
				{vaultData.allowance.raw > 0n ? `✅ ${vault.WANT_SYMBOL} approved` : `🚀 Approve ${vault.WANT_SYMBOL}`}
			</Button> */}
			<Button
				variant={'outlined'}
				isBusy={txStatusDeposit.pending}
				isDisabled={txStatusDeposit.error || txStatusDeposit.pending || isZero(vaultData.allowance.raw) || isZero(amount.raw)}
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
	const	shouldUseApproval = vaultSpender === yearnRouterForChain;

	/**************************************************************************
	** We need to update the status when some events occurs
	**************************************************************************/
	const fetchApproval = useCallback(async (): Promise<void> => {
		if (!vault || isZeroAddress(address) || !address) {
			return;
		}
		const allowance = await readContract({
			abi: VAULT_ABI,
			address: toAddress(vault.WANT_ADDR),
			functionName: 'allowance',
			args: [address, toAddress(vaultSpender)]
		});
		onUpdateVaultData((v): TVaultData => ({...v, allowance: toNormalizedBN(allowance, v.decimals)}));
	}, [address, onUpdateVaultData, vault, vaultSpender]);


	/**************************************************************************
	** We need to perform some specific actions
	**************************************************************************/
	const onApprove = useCallback(async (): Promise<void> => {
		const result = await approveERC20({
			connector: provider,
			contractAddress: toAddress(vault.WANT_ADDR),
			spenderAddress: toAddress(vaultSpender),
			amount: MAX_UINT_256,
			statusHandler: set_txStatusApproval
		});

		if(result.isSuccessful){
			fetchApproval();
		}

	}, [fetchApproval, provider, vaultSpender, vault.WANT_ADDR]);
		

	async function	onWithdraw(): Promise<void> {
		if(!provider){
			return;
		}

		const result = await withdrawWithPermitERC20({
			connector: provider,
			contractAddress: toAddress(vault.VAULT_ADDR),
			routerAddress: toAddress(vaultSpender),
			amount: amount.raw,
			isLegacy: vault.VAULT_ABI !== 'v3',
			shouldRedeem: false ,
			statusHandler: set_txStatusWithdraw
		});

		if(result.isSuccessful){
			onProceed();
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
						isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowanceYRouter.raw > 0n}
						onClick={onApprove}>
						{vaultData.allowanceYRouter.raw > 0n ? '✅ Vault approved' : '🚀 Approve vault'}
					</Button>
				) : <Fragment />}
			</div>

			{/* {shouldUseApproval ? (
				<Button
					variant={'outlined'}
					isBusy={txStatusApproval.pending}
					isDisabled={txStatusApproval.error || txStatusApproval.pending || vaultData.allowanceYRouter.raw > 0n}
					onClick={onApprove}>
					{vaultData.allowanceYRouter.raw > 0n ? '✅ Vault approved' : '🚀 Approve vault'}
				</Button>
			) : <Fragment />} */}
			<Button
				variant={'outlined'}
				isBusy={txStatusWithdraw.pending}
				isDisabled={txStatusWithdraw.error || txStatusWithdraw.pending || isZero(vaultData.balanceOf.raw) || isZero(amount.raw) || (shouldUseApproval ? isZero(vaultData.allowanceYRouter.raw) : false)}
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
}
function	VaultAction({vault, vaultData, onUpdateVaultData}: TVaultAction): ReactElement {
	const	{provider, address} = useWeb3();
	const {chain} = useNetwork();
	const chainId = chain?.id;

	/**************************************************************************
	** fetchPostDepositOrWithdraw will
	**************************************************************************/
	async function	fetchPostDepositOrWithdraw(): Promise<void> {
		if (!vault || !provider || !address) {
			return;
		}

		const calls = [];
		const wantContractMultiCall = {address: toAddress(vault.WANT_ADDR), abi: erc20ABI};
		const vaultV2ContractMultiCall = {address: toAddress(vault.VAULT_ADDR), abi: VAULT_ABI};
		const vaultV3ContractMultiCall = {address: toAddress(vault.VAULT_ADDR), abi: YVAULT_V3_BASE_ABI};
		const	yearnRouterForChain = (process.env.YEARN_ROUTER as TNDict<string>)[vault.CHAIN_ID];
		const	allowanceSpender = vault.VAULT_ABI === 'v3' ? yearnRouterForChain : vault.VAULT_ADDR;

		calls.push({...wantContractMultiCall, functionName: 'allowance', args: [address, allowanceSpender]});
		calls.push({...wantContractMultiCall, functionName: 'balanceOf', args: [address]});
		calls.push({...vaultV2ContractMultiCall, functionName: 'balanceOf', args: [address]});
		calls.push({...vaultV2ContractMultiCall, functionName: 'totalAssets'});
		calls.push({...vaultV2ContractMultiCall, functionName: 'pricePerShare'});
		
		if (vault.VAULT_ABI === 'v3') {
			calls.push({...vaultV3ContractMultiCall, functionName: 'depositLimit', args: [address]});
			calls.push({...vaultV3ContractMultiCall, functionName: 'availableDepositLimit', args: [address]});
		} else {
			calls.push({...vaultV2ContractMultiCall, functionName: 'depositLimit'});
			calls.push({...vaultV2ContractMultiCall, functionName: 'availableDepositLimit'});
		}
		 
		const callResult = await multicall({contracts: calls as never[], chainId: chainId});
		const wantAllowance = decodeAsBigInt(callResult[0]);
		const wantBalance = decodeAsBigInt(callResult[1]);
		const vaultBalance = decodeAsBigInt(callResult[2]);
		const totalAssets = decodeAsBigInt(callResult[3]);
		const pricePerShare = decodeAsBigInt(callResult[4]);
		const depositLimit = decodeAsBigInt(callResult[5]);
		const availableDepositLimit = decodeAsBigInt(callResult[6]);

		const coinBalance = await fetchBalance({
			address: address
		});

		onUpdateVaultData((v): TVaultData => ({
			...v,
			allowance: toNormalizedBN(wantAllowance, v.decimals),
			wantBalance: toNormalizedBN(wantBalance, v.decimals),
			balanceOf: toNormalizedBN(vaultBalance, v.decimals),
			balanceOfValue: formatToNormalizedValue(vaultBalance, v.decimals) * Number(v.pricePerShare.normalized) * v.wantPrice,
			coinBalance: toNormalizedBN(coinBalance.value, 18),
			depositLimit: toNormalizedBN(depositLimit, v.decimals),
			totalAssets: toNormalizedBN(totalAssets, v.decimals),
			availableDepositLimit: toNormalizedBN(availableDepositLimit, v.decimals),
			pricePerShare: toNormalizedBN(pricePerShare, v.decimals),
			totalAUM: formatToNormalizedValue(totalAssets, v.decimals) * v.wantPrice,
			progress: isZero(depositLimit) ? 1 : (Number(ethers.utils.formatUnits(depositLimit, v.decimals)) - Number(ethers.utils.formatUnits(availableDepositLimit, v.decimals))) / Number(ethers.utils.formatUnits(depositLimit, v.decimals)),
		}));

		if (vault.ZAP_ADDR) {
			const allowanceZapOut = await readContract({
				abi: VAULT_ABI,
				address: toAddress(vault.WANT_ADDR),
				functionName: 'allowance',
				args: [address, toAddress(vault.ZAP_ADDR)]
			});

			onUpdateVaultData((v): TVaultData => ({...v, allowanceZapOut: toNormalizedBN(allowanceZapOut, v.decimals)}));
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
				{vaultData.depositLimit.raw === 0n && vault.VAULT_STATUS !== 'withdraw' ? (
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
