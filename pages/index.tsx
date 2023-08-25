import {Fragment, useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useFactory} from 'contexts/useFactory';
import GraphemeSplitter from 'grapheme-splitter';
import vaults from 'utils/vaults.json';
import useSWR from 'swr';
import {erc20ABI, multicall} from '@wagmi/core';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {decodeAsBigInt} from '@yearn-finance/web-lib/utils/decoder';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import {isZero} from '@yearn-finance/web-lib/utils/isZero';
import {getNetwork} from '@yearn-finance/web-lib/utils/wagmi/utils';

import type {ReactElement} from 'react';
import type {TTVL, TVault} from 'utils/types';
import type {ContractFunctionConfig} from 'viem';
import type {TDict} from '@yearn-finance/web-lib/types';

const	splitter = new GraphemeSplitter();

function sortBy<T>(arr: T[], k: keyof T): T[] {
	return arr.concat().sort((a, b): number => (a[k] > b[k]) ? 1 : ((a[k] < b[k]) ? -1 : 0));
}

function Tag({status}: {status: string}): ReactElement {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<>
				<span className={'ml-2 hidden rounded-md bg-[#0657f9] px-2 py-1 text-xxs text-white lg:inline'}>
					<a
						href={'https://yearn.fi/vaults'}
						target={'_blank'}
						rel={'noopener noreferrer'}>
						{'Use Production'}
					</a>
				</span>
				<span className={'ml-2 inline rounded-md bg-[#0657f9] px-2 py-1 text-xxs text-white lg:hidden'}>
					<a
						href={'https://yearn.fi/vaults'}
						target={'_blank'}
						rel={'noopener noreferrer'}>
						{'Prod'}
					</a>
				</span>
			</>
		);
	}
	if (status === 'disabled') {
		return (
			<span className={'ml-2 rounded-md bg-yellow-900 px-2 py-1 text-xxs text-[#9da0a5]'}>
				{'Disabled'}
			</span>
		);
	}
	if (status === 'withdraw') {
		return (
			<span className={'ml-2 rounded-md bg-red-900 px-2 py-1 text-xxs text-white'}>
				{'Withdraw'}
			</span>
		);
	}
	if (status === 'new') {
		return (
			<span className={'ml-2 rounded-md bg-[#10B981] px-2 py-1 text-xxs text-white'}>
				{'New'}
			</span>
		);
	}
	return <Fragment />;
}

function	DisabledVaults({vaultsInactive}: {vaultsInactive: TVault[]}): ReactElement {
	if (vaultsInactive.length === 0) {
		return <Fragment />;
	}
	return (
		<div className={'my-4 max-w-5xl bg-red-900 p-4 pb-2 text-justify text-sm font-normal'}>
			{'⚠️ '}<strong>{'WARNING'}</strong>{' 🚨 '}<strong>{'YOU ARE USING DEPRECATED VAULTS'}</strong> {'You have funds in deprecated vaults. Theses vaults are no longer generating any profit and are now an image from the past. Please remove your funds from these vaults.'}
			<div className={'mt-4'}>
				<ul className={'grid grid-cols-2 gap-2'}>
					{vaultsInactive?.map((vault): ReactElement => (
						<li key={vault.VAULT_SLUG} className={'col-span-2 mb-1 w-full cursor-pointer md:col-span-1'}>
							<Link href={`/${vault.VAULT_SLUG}`}>
								<div className={'flex flex-row items-center'}>
									<span className={'flex flex-row items-center'}>
										{
											(vault?.LOGO_ARR || []).map((letter, index): ReactElement => (
												<div className={index === 0 ? 'w-5 text-left' : 'w-5 text-right'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
											))
										}
									</span>
									<span className={'dashed-underline-white ml-4 cursor-pointer text-base font-normal text-[#485570]'}>
										{vault.TITLE}
									</span>
								</div>
							</Link>
						</li>
					))}
				</ul>

			</div>
		</div>
	);
}

function	Index(): ReactElement {
	const	{isActive, address} = useWeb3();
	const	{safeChainID} = useChainID();
	const	chainName = getNetwork(safeChainID)?.name || 'Chain';
	const	{communityVaults} = useFactory();
	const	[, set_nonce] = useState(0);
	const	[vaultsActiveExperimental, set_vaultsActiveExperimental] = useState<TVault[]>([]);
	const	[vaultsActiveWeird, set_vaultsActiveWeird] = useState<TVault[]>([]);
	const	[vaultsInactive, set_vaultsInactive] = useState<TVault[]>([]);
	const	[vaultsInactiveForUser, set_vaultsInactiveForUser] = useState<TVault[]>([]);
	const	{data: tvl} = useSWR(`api/tvl?network=${safeChainID}`, baseFetcher) as {data: TTVL};

	useEffect((): void => {
		if (!isActive) {
			return;
		}
		const	_vaultsActiveExperimental: TVault[] = [];
		const	_vaultsActiveWeird: TVault[] = [];
		const	_vaultsInactive: TVault[] = [];

		Object.entries((vaults as TDict<TVault>)).reverse().map(([key, vault]): void => {
			if (vault.CHAIN_ID !== safeChainID) {
				return;
			}
			const splitted = splitter.splitGraphemes(vault.LOGO);
			vault.LOGO_ARR = ([splitted[0], `${splitted.slice(1).join('')}`]);
			vault.VAULT_SLUG = key;

			if (vault.VAULT_TYPE === 'experimental') {
				if (vault.VAULT_STATUS === 'new') {
					vault.ORDER = 0;
					_vaultsActiveExperimental.push(vault);
				}
				if (vault.VAULT_STATUS === 'active') {
					vault.ORDER = 1;
					_vaultsActiveExperimental.push(vault);
				}
				if (vault.VAULT_STATUS === 'endorsed') {
					vault.ORDER = 2;
					_vaultsActiveExperimental.push(vault);
				} else if (vault.VAULT_STATUS === 'withdraw') {
					_vaultsInactive.push(vault);
				}
			}
			if (vault.VAULT_TYPE === 'weird') {
				if (vault.VAULT_STATUS === 'new') {
					vault.ORDER = 0;
					_vaultsActiveWeird.push(vault);
				}
				if (vault.VAULT_STATUS === 'active') {
					vault.ORDER = 1;
					_vaultsActiveWeird.push(vault);
				}
				if (vault.VAULT_STATUS === 'endorsed') {
					vault.ORDER = 2;
					_vaultsActiveWeird.push(vault);
				} else if (vault.VAULT_STATUS === 'withdraw') {
					_vaultsInactive.push(vault);
				}
			}
		});
		set_vaultsActiveExperimental(sortBy(_vaultsActiveExperimental, 'ORDER'));
		set_vaultsActiveWeird(_vaultsActiveWeird);
		set_vaultsInactive(_vaultsInactive);
		set_nonce((n): number => n + 1);
	}, [safeChainID, isActive]);


	useCallback(async (): Promise<void> => {
		if (!isActive) {
			return;
		}

		const calls: ContractFunctionConfig[] = [];
		vaultsInactive.forEach(({VAULT_ADDR}): void => {
			const vaultContract = {address: toAddress(VAULT_ADDR), abi: erc20ABI};
			calls.push({...vaultContract, functionName: 'balanceOf', args: [address]});
		});

		const needToWidthdraw: TVault[] = [];
		const userBalances = await multicall({contracts: calls as never[], chainId: safeChainID});

		userBalances.forEach((balance, idx): void => {
			if(!isZero(decodeAsBigInt(balance))){
				needToWidthdraw.push(vaultsInactive[idx]);
			}
		});

		set_vaultsInactiveForUser(needToWidthdraw);

	}, [vaultsInactive, isActive, address, safeChainID]);

	if (!isActive) {
		return (
			<section>
				<h1 className={'text-sm font-semibold text-neutral-700'}>{'Not connected to Ex'}<sup>{'2'}</sup>{' 🧪'}</h1>
			</section>
		);
	}

	return (
		<main className={'max-w-5xl'}>
			<div>
				<div className={'hidden lg:block'}>
					<h1 className={'mb-6 text-3xl font-semibold leading-9 text-neutral-900'}>{'Experimental Experiments Registry'}</h1>
				</div>
				<div className={'flex lg:hidden'}>
					<h1 className={'text-xl font-semibold leading-9 text-neutral-900 md:text-3xl'}>{'Ex'}<sup className={'mr-2 mt-4'}>{'2'}</sup>{' Registry'}</h1>
				</div>
			</div>
			<div className={'my-4 max-w-5xl bg-yellow-900 p-4 text-justify text-sm font-normal text-[#485570]'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"These experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution."}
			</div>
			<DisabledVaults vaultsInactive={vaultsInactiveForUser} />

			<section aria-label={'TVL & new Vault'} className={'my-8 grid grid-cols-2'}>
				<div>
					<div className={'text-base'}>
						<span className={'font-semibold text-neutral-900'}>
							{`${chainName || 'Chain'} TVL:`}
						</span>
						<span className={'font-normal'}>
							{` $${formatAmount(tvl?.tvl, 2)}`}
						</span>
					</div>

					<div className={'text-xs opacity-60'}>
						<div>
							<span className={'font-semibold'}>
								{'Endorsed:'}
							</span>
							<span className={'font-normal'}>
								{` $${formatAmount(tvl?.tvlEndorsed, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-semibold'}>
								{'Experimental:'}
							</span>
							<span className={'font-normal'}>
								{` $${formatAmount(tvl?.tvlExperimental, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-semibold'}>
								{'Deprecated:'}
							</span>
							<span className={'font-normal'}>
								{` $${formatAmount(tvl?.tvlDeprecated, 2)}`}
							</span>
						</div>
					</div>
				</div>
				<div className={'flex items-center justify-center text-sm md:justify-start'}>
					<div className={'cursor-pointer border border-dashed border-neutral-500 bg-neutral-200 px-4 py-2 transition-colors hover:bg-neutral-0'}>
						<span className={'md:hidden'}>
							{'🏦 Deploy vault'}
						</span>
						<span className={'hidden md:block'}>
							{'🏦 Deploy your own vault'}
						</span>
					</div>
				</div>
			</section>

			<div className={'grid grid-cols-2 gap-2'}>
				<div className={'col-span-2 mb-4 md:col-span-1'}>
					<h2 className={'mb-4 text-2xl font-semibold text-neutral-900'}>{'🚀 Experimental'}</h2>
					<ul>
						{vaultsActiveExperimental?.map((vault): ReactElement => (
							<li key={vault.VAULT_SLUG} className={'flex cursor-pointer flex-row items-baseline'}>
								<Link href={`/${vault.VAULT_SLUG}`}>
									<div className={'mb-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												(vault.LOGO_ARR || []).map((letter, index): ReactElement => (
													<div className={index === 0 ? 'w-5 text-left' : 'w-5 text-right'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
									</div>
								</Link>
								<Tag status={vault.VAULT_STATUS} />
							</li>
						))}
					</ul>
				</div>

				<div className={'col-span-2 mb-4 md:col-span-1'}>
					<h2 className={'mb-4 text-2xl font-semibold text-neutral-900'}>{'🧠 Weird'}</h2>
					<ul>
						{vaultsActiveWeird?.map((vault): ReactElement => (
							<li key={vault.VAULT_SLUG} className={'flex cursor-pointer flex-row items-baseline'}>
								<Link href={`/${vault.VAULT_SLUG}`}>
									<div className={'mb-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												(vault.LOGO_ARR || []).map((letter, index): ReactElement => (
													<div className={index === 0 ? 'w-5 text-left' : 'w-5 text-right'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
									</div>
								</Link>
								<Tag status={vault.VAULT_STATUS} />
							</li>
						))}
					</ul>

					<h2 className={'mb-4 mt-12 text-2xl font-semibold text-neutral-900'}>{'🦍 Community'}</h2>
					<ul>
						{(communityVaults || [])?.map((vault: TVault): ReactElement => (
							<li key={vault.VAULT_ADDR} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_ADDR}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{'🦍🦍'}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer text-base font-normal text-neutral-700'}>
											{vault.SYMBOL || ''}
										</span>
									</div>
								</Link>
							</li>
						))}
					</ul>

				</div>
			</div>
		</main>
	);
}

export default Index;
