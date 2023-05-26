import React, {Fragment, useEffect, useState} from 'react';
import Link from 'next/link';
import {useFactory} from 'contexts/useFactory';
import {ethers} from 'ethers';
import GraphemeSplitter from 'grapheme-splitter';
import vaults from 'utils/vaults.json';
import useSWR from 'swr';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';
import {formatAmount} from '@yearn-finance/web-lib/utils/format.number';
import CHAINS from '@yearn-finance/web-lib/utils/web3/chains';

import type {ReactElement} from 'react';
import type {Maybe, TTVL, TVault} from 'utils/types';
import type {TDict} from '@yearn-finance/web-lib/types';

const	splitter = new GraphemeSplitter();

function sortBy<T>(arr: T[], k: keyof T): T[] {
	return arr.concat().sort((a, b): number => (a[k] > b[k]) ? 1 : ((a[k] < b[k]) ? -1 : 0));
}

function Tag({status}: {status: string}): ReactElement {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<>
				<span className={'ml-2 hidden rounded-md bg-[#0657f9] px-2 py-1 font-mono text-xxs text-white lg:inline'}>
					<a
						href={'https://yearn.finance/vaults'}
						target={'_blank'}
						rel={'noopener noreferrer'}>
						{'Use Production'}
					</a>
				</span>
				<span className={'ml-2 inline rounded-md bg-[#0657f9] px-2 py-1 font-mono text-xxs text-white lg:hidden'}>
					<a
						href={'https://yearn.finance/vaults'}
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
			<span className={'ml-2 rounded-md bg-yellow-900 px-2 py-1 font-mono text-xxs text-white'}>
				{'Disabled'}
			</span>
		);
	}
	if (status === 'withdraw') {
		return (
			<span className={'ml-2 rounded-md bg-red-900 px-2 py-1 font-mono text-xxs text-white'}>
				{'Withdraw'}
			</span>
		);
	}
	if (status === 'new') {
		return (
			<span className={'ml-2 rounded-md bg-[#10B981] px-2 py-1 font-mono text-xxs text-white'}>
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
		<div className={'my-4 max-w-5xl bg-red-900 p-4 pb-2 font-mono text-sm font-normal text-[#485570]'}>
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
									<span className={'dashed-underline-white ml-4 cursor-pointer font-mono text-base font-normal text-[#485570]'}>
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
	const	{provider, isActive, address} = useWeb3();
	const	{safeChainID} = useChainID();
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

	useEffect((): void => {
		if (isActive) {
			Promise.all(vaultsInactive.map(async ({VAULT_ADDR}): Promise<Maybe<string>> => {
				const	vaultContract = new ethers.Contract(VAULT_ADDR, ['function balanceOf(address) view returns (uint256)'], provider);
				const	balance = await vaultContract.balanceOf(address);
				return balance.isZero() ? null : VAULT_ADDR;
			})).then((promises): void => {
				const needToWidthdraw = promises.filter(Boolean);
				set_vaultsInactiveForUser(vaultsInactive.filter((v): boolean => needToWidthdraw.includes(v.VAULT_ADDR)));
			}).catch((e): void => {
				console.error(e);
			});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vaultsInactive, isActive]);

	if (!isActive) {
		return (
			<section>
				<h1 className={'font-mono text-sm font-semibold text-neutral-700'}>{'Not connected to Ex'}<sup>{'2'}</sup>{' 🧪'}</h1>
			</section>
		);
	}

	return (
		<main className={'max-w-5xl'}>
			<div>
				<div className={'hidden md:block'}>
					<h1 className={'mb-6 font-mono text-3xl font-semibold leading-9 text-neutral-900'}>{'Experimental Experiments Registry'}</h1>
				</div>
				<div className={'flex md:hidden'}>
					<h1 className={'font-mono text-xl font-semibold leading-9 text-neutral-900'}>{'Ex'}<sup className={'mr-2 mt-4'}>{'2'}</sup>{' Registry'}</h1>
				</div>
			</div>
			<div className={'my-4 max-w-5xl bg-yellow-900 p-4 font-mono text-sm font-normal text-[#485570]'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution."}
			</div>
			<DisabledVaults vaultsInactive={vaultsInactiveForUser} />

			<section aria-label={'TVL & new Vault'} className={'my-8 grid grid-cols-2'}>
				<div>
					<div>
						<span className={'font-mono text-base font-semibold text-neutral-900'}>
							{`${CHAINS[safeChainID]?.displayName || 'Chain'} TVL:`}
						</span>
						<span className={'font-mono text-base font-normal text-neutral-700'}>
							{` $${formatAmount(tvl?.tvl, 2)}`}
						</span>
					</div>

					<div className={'text-xs opacity-60'}>
						<div>
							<span className={'font-mono font-semibold text-neutral-700'}>
								{'Endorsed:'}
							</span>
							<span className={'font-mono font-normal text-neutral-700'}>
								{` $${formatAmount(tvl?.tvlEndorsed, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-mono font-semibold text-neutral-700'}>
								{'Experimental:'}
							</span>
							<span className={'font-mono font-normal text-neutral-700'}>
								{` $${formatAmount(tvl?.tvlExperimental, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-mono font-semibold text-neutral-700'}>
								{'Deprecated:'}
							</span>
							<span className={'font-mono font-normal text-neutral-700'}>
								{` $${formatAmount(tvl?.tvlDeprecated, 2)}`}
							</span>
						</div>
					</div>
				</div>
				<div className={'flex items-center'}>
					<Link href={'/newVault'}>
						<span className={'cursor-pointer border border-dashed border-neutral-500 bg-neutral-200 px-4 py-2 font-mono text-sm text-neutral-700 transition-colors hover:bg-neutral-0'}>
							{'🏦 Deploy your own vault'}
						</span>
					</Link>
				</div>
			</section>

			<div className={'grid max-w-5xl grid-cols-2 gap-2'}>
				<div className={'col-span-2 mb-4 w-full md:col-span-1'}>
					<h2 className={'mb-4 font-mono text-2xl font-semibold text-neutral-900'}>{'🚀 Experimental'}</h2>
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
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
									</div>
								</Link>
								<Tag status={vault.VAULT_STATUS} />
							</li>
						))}
					</ul>
				</div>

				<div className={'col-span-2 mb-4 w-full md:col-span-1'}>
					<h2 className={'mb-4 font-mono text-2xl font-semibold text-neutral-900'}>{'🧠 Weird'}</h2>
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
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
									</div>
								</Link>
								<Tag status={vault.VAULT_STATUS} />
							</li>
						))}
					</ul>

					<h2 className={'mb-4 mt-12 font-mono text-2xl font-semibold text-neutral-900'}>{'🦍 Community'}</h2>
					<ul>
						{(communityVaults || [])?.map((vault: TVault): ReactElement => (
							<li key={vault.VAULT_ADDR} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_ADDR}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{'🦍🦍'}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
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
