/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				index.js
******************************************************************************/

import	React, {useState, useEffect}						from	'react';
import	Link												from	'next/link';
import	useSWR												from	'swr';
import	axios												from	'axios';
import	{ethers}											from	'ethers';
import	useWeb3												from	'contexts/useWeb3';
import	{formatAmount}										from	'utils';
import	vaults												from	'utils/vaults.json';
import	chains												from	'utils/chains.json';
import	GraphemeSplitter									from	'grapheme-splitter';

const	splitter = new GraphemeSplitter();
const	sortBy = (arr, k) => arr.concat().sort((a, b) => (a[k] > b[k]) ? 1 : ((a[k] < b[k]) ? -1 : 0));

function	Tag({status}) {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<>
				<span className={'bg-tag-info text-white font-mono rounded-md px-2 text-xxs py-1 ml-2 hidden lg:inline'}>
					<a href={'https://yearn.finance/vaults'} target={'_blank'} rel={'noopener noreferrer'}>
						{'Use Production'}
					</a>
				</span>
				<span className={'bg-tag-info text-white font-mono rounded-md px-2 text-xxs py-1 ml-2 inline lg:hidden'}>
					<a href={'https://yearn.finance/vaults'} target={'_blank'} rel={'noopener noreferrer'}>
						{'Prod'}
					</a>
				</span>
			</>
		);
	}
	if (status === 'disabled') {
		return (
			<span className={'bg-tag-warning text-white font-mono rounded-md px-2 text-xxs py-1 ml-2'}>
				{'Disabled'}
			</span>
		);
	}
	if (status === 'withdraw') {
		return (
			<span className={'bg-tag-withdraw text-white font-mono rounded-md px-2 text-xxs py-1 ml-2'}>
				{'Withdraw'}
			</span>
		);
	}
	if (status === 'new') {
		return (
			<span className={'bg-tag-new text-white font-mono rounded-md px-2 text-xxs py-1 ml-2'}>
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
		<div className={'max-w-5xl p-4 pb-2 my-4 font-mono text-sm font-normal text-white bg-tag-withdraw'}>
			{'⚠️ '}<strong>{'WARNING'}</strong>{' 🚨 '}<strong>{'YOU ARE USING DEPRECATED VAULTS'}</strong> {'You have funds in deprecated vaults. Theses vaults are no longer generating any profit and are now an image from the past. Please remove your funds from these vaults.'}
			<div className={'mt-4'}>
				<ul className={'grid grid-cols-2 gap-2'}>
					{vaultsInactive?.map((vault) => (
						<li key={vault.VAULT_SLUG} className={'col-span-2 md:col-span-1 w-full mb-1 cursor-pointer'}>
							<Link href={`/${vault.VAULT_SLUG}`}>
								<div className={'flex flex-row items-center'}>
									<span className={'flex flex-row items-center'}>
										{
											vault.LOGO_ARR.map((letter, index) => (
												<div className={index === 0 ? 'text-left w-5' : 'text-right w-5'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
											))
										}
									</span>
									<span className={'ml-4 text-base font-normal text-white font-mono dashed-underline-white cursor-pointer'}>
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
	const	{provider, active, address, chainID} = useWeb3();
	const	[, set_nonce] = useState(0);
	const	[vaultsActiveExperimental, set_vaultsActiveExperimental] = useState([]);
	const	[vaultsActiveWeird, set_vaultsActiveWeird] = useState([]);
	const	[vaultsInactive, set_vaultsInactive] = useState([]);
	const	[vaultsInactiveForUser, set_vaultsInactiveForUser] = useState([]);
	const	{data: tvl} = useSWR(`api/tvl?network=${chainID}`, fetcher);

	useEffect(() => {
		if (!active) {
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
	}, [chainID, active]);

	useEffect(() => {
		if (active) {
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
	}, [vaultsInactive, active]);

	if (!active) {
		return (
			<section>
				<h1 className={'text-sm font-mono font-semibold text-ygray-900 dark:text-white'}>{'Loading Ex'}<sup>{'2'}</sup>{' 🧪...'}</h1>
			</section>
		);
	}

	return (
		<section>
			<div>
				<div className={'hidden md:block'}>
					<h1 className={'text-3xl font-mono font-semibold text-ygray-900 dark:text-white leading-9 mb-6'}>{'Experimental Experiments Registry'}</h1>
				</div>
				<div className={'flex md:hidden'}>
					<h1 className={'text-xl font-mono font-semibold text-ygray-900 dark:text-white leading-9'}>{'Ex'}<sup className={'mt-4 mr-2'}>{'2'}</sup>{' Registry'}</h1>
				</div>
			</div>
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-ygray-700 bg-tag-warning'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution."}
			</div>
			<DisabledVaults vaultsInactive={vaultsInactiveForUser} />
			<div className={'max-w-5xl mt-8'}>
				<span className={'text-base font-semibold text-ygray-900 dark:text-white font-mono'}>
					{`${chains[chainID]?.displayName || 'Chain'} TVL:`}
				</span>
				<span className={'text-base font-normal text-ygray-900 dark:text-white font-mono'}>
					{` $${formatAmount(tvl?.tvl || 0, 2)}`}
				</span>
			</div>

			<div className={'max-w-5xl mb-8 text-xs opacity-60'}>
				<div>
					<span className={'font-semibold text-ygray-900 dark:text-white font-mono'}>
						{'Endorsed:'}
					</span>
					<span className={'font-normal text-ygray-900 dark:text-white font-mono'}>
						{` $${formatAmount(tvl?.tvlEndorsed || 0, 2)}`}
					</span>
				</div>
				<div>
					<span className={'font-semibold text-ygray-900 dark:text-white font-mono'}>
						{'Experimental:'}
					</span>
					<span className={'font-normal text-ygray-900 dark:text-white font-mono'}>
						{` $${formatAmount(tvl?.tvlExperimental || 0, 2)}`}
					</span>
				</div>
				<div>
					<span className={'font-semibold text-ygray-900 dark:text-white font-mono'}>
						{'Deprecated:'}
					</span>
					<span className={'font-normal text-ygray-900 dark:text-white font-mono'}>
						{` $${formatAmount(tvl?.tvlDeprecated || 0, 2)}`}
					</span>
				</div>
			</div>

			<div className={'max-w-5xl grid grid-cols-2 gap-2'}>
				<div className={'col-span-2 md:col-span-1 mb-4 w-full'}>
					<h2 className={'text-2xl text-ygray-900 dark:text-white font-mono font-semibold mb-4'}>{'🚀 Experimental'}</h2>
					<ul>
						{vaultsActiveExperimental?.map((vault) => (
							<li key={vault.VAULT_SLUG} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_SLUG}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												vault.LOGO_ARR.map((letter, index) => (
													<div className={index === 0 ? 'text-left w-5' : 'text-right w-5'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'ml-4 text-base font-normal text-ygray-700 dark:text-dark-50 font-mono dashed-underline-gray cursor-pointer'}>
											{vault.TITLE}
											<Tag status={vault.VAULT_STATUS} />
										</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className={'col-span-2 md:col-span-1 mb-4 w-full'}>
					<h2 className={'text-2xl text-ygray-900 dark:text-white font-mono font-semibold mb-4'}>{'🧠 Weird'}</h2>
					<ul>
						{vaultsActiveWeird?.map((vault) => (
							<li key={vault.VAULT_SLUG} className={'cursor-pointer'}>
								<Link href={`/${vault.VAULT_SLUG}`}>
									<div className={'my-4 flex flex-row items-center'}>
										<span className={'flex flex-row items-center'}>
											{
												vault.LOGO_ARR.map((letter, index) => (
													<div className={index === 0 ? 'text-left w-5' : 'text-right w-5'} key={`${vault.VAULT_SLUG}${index}${letter}`}>{letter}</div>
												))
											}
										</span>
										<span className={'ml-4 text-base font-normal text-ygray-700 dark:text-dark-50 font-mono dashed-underline-gray cursor-pointer'}>
											{vault.TITLE}
										</span>
										<Tag status={vault.VAULT_STATUS} />
									</div>
								</Link>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

export default Index;
