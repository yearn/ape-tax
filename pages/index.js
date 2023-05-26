import {useEffect, useState} from 'react';
import Link from 'next/link';
import useFactory from 'contexts/useFactory';
import {ethers} from 'ethers';
import GraphemeSplitter from 'grapheme-splitter';
import {formatAmount} from 'utils';
import chains from 'utils/chains.json';
import vaults from 'utils/vaults.json';
import axios from 'axios';
import useSWR from 'swr';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';

const	splitter = new GraphemeSplitter();
const	sortBy = (arr, k) => arr.concat().sort((a, b) => (a[k] > b[k]) ? 1 : ((a[k] < b[k]) ? -1 : 0));

function	Tag({status}) {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<>
				<span className={'ml-2 hidden rounded-md bg-yearn-blue px-2 py-1 font-mono text-xxs text-white lg:inline'}>
					<a
						href={'https://yearn.finance/vaults'}
						target={'_blank'}
						rel={'noopener noreferrer'}>
						{'Use Production'}
					</a>
				</span>
				<span className={'ml-2 inline rounded-md bg-yearn-blue px-2 py-1 font-mono text-xxs text-white lg:hidden'}>
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
	return null;
}

function	DisabledVaults({vaultsInactive}) {
	if (vaultsInactive.length === 0) {
		return null;
	}
	return (
		<div className={'my-4 max-w-5xl bg-red-900 p-4 pb-2 font-mono text-sm font-normal text-[#485570]'}>
			{'⚠️ '}<strong>{'WARNING'}</strong>{' 🚨 '}<strong>{'YOU ARE USING DEPRECATED VAULTS'}</strong> {'You have funds in deprecated vaults. Theses vaults are no longer generating any profit and are now an image from the past. Please remove your funds from these vaults.'}
			<div className={'mt-4'}>
				<ul className={'grid grid-cols-2 gap-2'}>
					{vaultsInactive?.map((vault) => (
						<li key={vault.VAULT_SLUG} className={'col-span-2 mb-1 w-full cursor-pointer md:col-span-1'}>
							<Link legacyBehavior href={`/${vault.VAULT_SLUG}`}>
								<div className={'flex flex-row items-center'}>
									<span className={'flex flex-row items-center'}>
										{
											vault.LOGO_ARR.map((letter, index) => (
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

const		fetcher = url => axios.get(url).then(res => res.data);
function	Index() {
	const	{provider, isActive, address, chainID} = useWeb3();
	const	{communityVaults} = useFactory();
	const	[, set_nonce] = useState(0);
	const	[vaultsActiveExperimental, set_vaultsActiveExperimental] = useState([]);
	const	[vaultsActiveWeird, set_vaultsActiveWeird] = useState([]);
	const	[vaultsInactive, set_vaultsInactive] = useState([]);
	const	[vaultsInactiveForUser, set_vaultsInactiveForUser] = useState([]);
	const	{data: tvl} = useSWR(`api/tvl?network=${chainID}`, fetcher);

	useEffect(() => {
		if (!isActive) {
			return;
		}
		const	_vaultsActiveExperimental = [];
		const	_vaultsActiveWeird = [];
		const	_vaultsInactive = [];
		Object.entries(vaults).reverse().map(([key, vault]) => {
			if (vault.CHAIN_ID !== chainID && !(vault.CHAIN_ID === 1 && chainID === 1337)) {
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
		set_nonce(n => n + 1);
	}, [chainID, isActive]);

	useEffect(() => {
		if (isActive) {
			Promise.all(vaultsInactive.map(async ({VAULT_ADDR}) => {
				const	vaultContract = new ethers.Contract(VAULT_ADDR, ['function balanceOf(address) view returns (uint256)'], provider);
				const	balance = await vaultContract.balanceOf(address);
				return balance.isZero() ? null : VAULT_ADDR;
			})).then((promises) => {
				const needToWidthdraw = promises.filter(Boolean);
				set_vaultsInactiveForUser(vaultsInactive.filter(v => needToWidthdraw.includes(v.VAULT_ADDR)));
			}).catch((e) => {
				console.error(e);
			});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vaultsInactive, isActive]);

	if (!isActive) {
		return (
			<section>
				<h1 className={'font-mono text-sm font-semibold text-neutral-900'}>{'Loading Ex'}<sup>{'2'}</sup>{' 🧪...'}</h1>
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
							{`${chains[chainID]?.displayName || 'Chain'} TVL:`}
						</span>
						<span className={'font-mono text-base font-normal text-neutral-900'}>
							{` $${formatAmount(tvl?.tvl || 0, 2)}`}
						</span>
					</div>

					<div className={'text-xs opacity-60'}>
						<div>
							<span className={'font-mono font-semibold text-neutral-900'}>
								{'Endorsed:'}
							</span>
							<span className={'font-mono font-normal text-neutral-900'}>
								{` $${formatAmount(tvl?.tvlEndorsed || 0, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-mono font-semibold text-neutral-900'}>
								{'Experimental:'}
							</span>
							<span className={'font-mono font-normal text-neutral-900'}>
								{` $${formatAmount(tvl?.tvlExperimental || 0, 2)}`}
							</span>
						</div>
						<div>
							<span className={'font-mono font-semibold text-neutral-900'}>
								{'Deprecated:'}
							</span>
							<span className={'font-mono font-normal text-neutral-900'}>
								{` $${formatAmount(tvl?.tvlDeprecated || 0, 2)}`}
							</span>
						</div>
					</div>
				</div>
				<div className={'flex items-center'}>
					<Link href={'/newVault'}>
						<span className={'cursor-pointer border border-dashed border-neutral-500 bg-neutral-200 px-4 py-2 font-mono text-sm text-neutral-900 transition-colors hover:bg-neutral-0'}>
							{'🏦 Deploy your own vault'}
						</span>
					</Link>
				</div>
			</section>

			<div className={'grid max-w-5xl grid-cols-2 gap-2'}>
				<div className={'col-span-2 mb-4 w-full md:col-span-1'}>
					<h2 className={'mb-4 font-mono text-2xl font-semibold text-neutral-900'}>{'🚀 Experimental'}</h2>
					<ul>
						{vaultsActiveExperimental?.map((vault) => (
							<li key={vault.VAULT_SLUG} className={'cursor-pointer'}>
								<Link legacyBehavior href={`/${vault.VAULT_SLUG}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												vault.LOGO_ARR.map((letter, index) => (
													<div className={index === 0 ? 'w-5 text-left' : 'w-5 text-right'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
										<Tag status={vault.VAULT_STATUS} />
									</div>
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className={'col-span-2 mb-4 w-full md:col-span-1'}>
					<h2 className={'mb-4 font-mono text-2xl font-semibold text-neutral-900'}>{'🧠 Weird'}</h2>
					<ul>
						{vaultsActiveWeird?.map((vault) => (
							<li key={vault.VAULT_SLUG} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_SLUG}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												vault.LOGO_ARR.map((letter, index) => (
													<div className={index === 0 ? 'w-5 text-left' : 'w-5 text-right'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
											{vault.TITLE}
										</span>
										<Tag status={vault.VAULT_STATUS} />
									</div>
								</Link>
							</li>
						))}
					</ul>

					<h2 className={'mb-4 mt-12 font-mono text-2xl font-semibold text-neutral-900'}>{'🦍 Community'}</h2>
					<ul>
						{(communityVaults || [])?.map((vault) => (
							<li key={vault.VAULT_ADDR} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_ADDR}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{'🦍🦍'}
										</span>
										<span className={'dashed-underline-gray ml-4 cursor-pointer font-mono text-base font-normal text-neutral-700'}>
											{vault.SYMBOL}
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
