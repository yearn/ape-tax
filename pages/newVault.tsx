import React, {Fragment, useCallback, useEffect, useState} from 'react';
import {AddressWithActions} from 'components/AddressWithAction';
import {useBalancerGauge} from 'contexts/useBalancerGauges';
import {useFactory} from 'contexts/useFactory';
import {Contract} from 'ethcall';
import {createNewVaultsAndStrategies} from 'utils/actions';
import {Combobox, Transition} from '@headlessui/react';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {addressZero, isZeroAddress, toAddress} from '@yearn-finance/web-lib/utils/address';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';
import {newEthCallProvider} from '@yearn-finance/web-lib/utils/web3/providers';
import {defaultTxStatus} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {ReactElement} from 'react';
import type {Maybe, TGauge} from 'utils/types';

function ComboBox({selectedGauge, set_selectedGauge}: {selectedGauge: Maybe<TGauge>, set_selectedGauge: (gauge: TGauge) => void}): ReactElement {
	const	{balancerGauges} = useBalancerGauge();
	const	[query, set_query] = useState('');

	const filteredGauges =
		query === ''
			? (balancerGauges || []).filter((gauge): boolean => !gauge.exists && gauge.isAuraOK)
			: (balancerGauges || []).filter((gauge): boolean => (
				(!gauge.exists && gauge.isAuraOK)
				&& (
					gauge.address.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
					|| gauge.name.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
					|| gauge.symbol.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
				)
			));

	return (
		<Combobox value={selectedGauge} onChange={set_selectedGauge}>
			<div className={'relative'}>
				<div className={'w-full'}>
					<Combobox.Input
						className={'w-full border-neutral-400 bg-white/0 px-2 py-1.5 font-mono text-neutral-500 focus:border-neutral-700 focus:ring-0 active:ring-0'}
						displayValue={(gauge): any => (gauge as TGauge)?.address}
						onChange={(event): void => set_query(event.target.value)}
					/>
					<Combobox.Button className={'absolute inset-y-0 right-0 flex items-center pr-2'}>
						<svg
							xmlns={'http://www.w3.org/2000/svg'}
							viewBox={'0 0 20 20'}
							fill={'currentColor'}
							aria-hidden={'true'}
							className={'h-5 w-5 text-neutral-500'}>
							<path
								fillRule={'evenodd'}
								d={'M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'}
								clipRule={'evenodd'}>
							</path>
						</svg>
					</Combobox.Button>
				</div>
				<Transition
					as={Fragment}
					leave={'transition ease-in duration-100'}
					leaveFrom={'opacity-100'}
					leaveTo={'opacity-0'}
					afterLeave={(): void => set_query('')}>
					<Combobox.Options className={'absolute mt-1 max-h-60 w-full overflow-auto border border-neutral-400 bg-neutral-0 py-1 text-base focus:outline-none'}>
						{!filteredGauges || (filteredGauges || [])?.length === 0 && query !== '' ? (
							<div className={'relative cursor-default select-none px-4 py-2 text-neutral-500'}>
								{'Nothing found.'}
							</div>
						) : (
							(filteredGauges || []).map((gauge): ReactElement => (
								<Combobox.Option
									key={gauge.address}
									className={({active}): string => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500'}`}
									value={gauge}>
									{({selected}): ReactElement => (
										<>
											<div className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
												<p className={'text-base tabular-nums text-neutral-700'}>{gauge.address}</p>
												<p className={'text-sm text-neutral-500'}>{gauge.name}</p>
											</div>
										</>
									)}
								</Combobox.Option>
							))
						)}
					</Combobox.Options>
				</Transition>
			</div>
		</Combobox>
	);
}


function	Index(): ReactElement {
	const	{getCommunityVaults} = useFactory();
	const	{provider, isActive} = useWeb3();
	const	[selectedGauge, set_selectedGauge] = useState<Maybe<TGauge>>();
	const	[gaugeInfo, set_gaugeInfo] = useState({exists: false, name: '', symbol: '', deployed: false, vaultAddress: ''});
	const	[error, set_error] = useState<Maybe<string>>(undefined);
	const	[txStatusCreateVault, set_txStatusCreateVault] = useState(defaultTxStatus);

	/* 🔵 - Yearn Finance ******************************************************
	** The checkGauge callback will, for a given gauge address, check if the
	** factory already knows this vault and retrieve the name and symbol for
	** the gauge. If the gauge has already been deployed as a vault, an error
	** will be thrown indicating that the vault already exists.
	**************************************************************************/
	const	checkGauge = useCallback(async (): Promise<void> => {
		const	ethcallProvider = await newEthCallProvider(provider);
		const	balancerGlobalContract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS as string, [{'stateMutability':'view', 'type':'function', 'name':'alreadyExistsFromGauge', 'inputs':[{'name':'address', 'type':'address'}], 'outputs':[{'name':'', 'type':'address'}]}]);
		const	gaugeContract = new Contract(toAddress(selectedGauge?.address), [{'stateMutability':'view', 'type':'function', 'name':'name', 'inputs':[], 'outputs':[{'name':'', 'type':'string'}]}, {'stateMutability':'view', 'type':'function', 'name':'symbol', 'inputs':[], 'outputs':[{'name':'', 'type':'string'}]}]);

		const	callResult = await ethcallProvider.tryAll([
			balancerGlobalContract.alreadyExistsFromGauge(selectedGauge?.address),
			gaugeContract.name(),
			gaugeContract.symbol()
		]);
		const	[existingAddress, name, symbol] = callResult as [string, string, string];
		if (toAddress(existingAddress) !== addressZero) {
			performBatchedUpdates((): void => {
				set_error('A Vault already exists for this Gauge address.');
				set_gaugeInfo({exists: true, name: name, symbol: symbol.replace('-gauge', ''), vaultAddress: toAddress(existingAddress), deployed: true});
			});
		} else {
			performBatchedUpdates((): void => {
				set_error(undefined);
				set_gaugeInfo({exists: true, name: name, symbol: symbol.replace('-gauge', ''), vaultAddress: '', deployed: false});
			});
		}
	}, [provider, selectedGauge?.address]);

	useEffect((): void => {
		if (!isZeroAddress(selectedGauge?.address)) {
			checkGauge();
		} else {
			performBatchedUpdates((): void => {
				set_error(undefined);
				set_gaugeInfo({exists: false, name: '', symbol: '', deployed: false, vaultAddress: ''});
			});
		}
	}, [selectedGauge, checkGauge]);

	/* 🔵 - Yearn Finance ******************************************************
	** If all the conditions are met, the createVault callback will submit a
	** transaction to create a new vault for the given gauge address.
	**************************************************************************/
	async function	onCreateVault(): Promise<void> {
		if (txStatusCreateVault.pending) {
			return;
		}
		set_txStatusCreateVault({...txStatusCreateVault, pending: true});
		createNewVaultsAndStrategies({provider, gauge: toAddress(selectedGauge?.address)}, ({error, data}): void => {
			if (error) {
				console.error(error);
				set_txStatusCreateVault({...txStatusCreateVault, error: true});
				setTimeout((): void => set_txStatusCreateVault(defaultTxStatus), 3000);
				return;
			}
			console.log(`YOU VAULT IS READY HERE: ${data}`);
			performBatchedUpdates(async (): Promise<void> => {
				await getCommunityVaults();
				set_gaugeInfo({...gaugeInfo, vaultAddress: data, deployed: true});
				set_txStatusCreateVault({...txStatusCreateVault, success: true});
			});
			setTimeout((): void => set_txStatusCreateVault(defaultTxStatus), 3000);
		});
	}

	/* 🔵 - Yearn Finance ******************************************************
	** While the user's wallet is not connected, hide the page content.
	**************************************************************************/
	if (!isActive) {
		return (
			<section>
				<h1 className={'font-mono text-sm font-semibold text-neutral-700'}>{'Not connected to Ex'}<sup>{'2'}</sup>{' 🧪'}</h1>
			</section>
		);
	}

	return (
		<main className={'mt-8 max-w-5xl'}>
			<div>
				<div className={'hidden md:block'}>
					<h1 className={'mb-6 font-mono text-3xl font-semibold leading-9 text-neutral-700'}>{'Experimental Experiments Registry'}</h1>
				</div>
				<div className={'flex md:hidden'}>
					<h1 className={'font-mono text-xl font-semibold leading-9 text-neutral-700'}>{'Ex'}<sup className={'mr-2 mt-4'}>{'2'}</sup>{' Registry'}</h1>
				</div>
			</div>
			<div className={'my-4 max-w-5xl bg-yellow-900 p-4 font-mono text-sm font-normal text-[#485570]'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution."}
			</div>

			<section aria-label={'New Vault'} className={'my-8 grid grid-cols-1'}>
				<div className={'mx-auto w-full border border-dashed border-neutral-500 p-4'}>
					<div>
						<p className={'font-mono text-3xl font-semibold text-neutral-700'}>
							{'Add New Vault'}
						</p>
					</div>

					<div className={'my-6 text-xs'}>
						<div className={'space-y-4 font-mono text-base text-neutral-700'}>
							<p>{'Deploy a new vault and start autocompounding the yield from your Balancer deposits'}</p>
							<p>{'Remember, this is an experimental experiment'}</p>
						</div>
					</div>

					<div>
						<div className={'mb-6 mt-12 flex flex-col space-y-2'}>
							<label className={'-mb-1 text-xs font-semibold text-neutral-700/60'}>{'Gauge Address'}</label>
							<ComboBox selectedGauge={selectedGauge} set_selectedGauge={set_selectedGauge} />
						</div>
						<div className={'mb-12 flex flex-col space-y-3'}>
							<div>
								<label className={'text-xs font-semibold text-neutral-700/60'}>{'Vault Name'}</label>
								<p className={'font-mono text-neutral-500'}>
									{gaugeInfo.exists ? `Balancer ${gaugeInfo.symbol} Auto-Compounding yVault` : '-'}
								</p>
							</div>
							<div>
								<label className={'text-xs font-semibold text-neutral-700/60'}>{'Vault Symbol'}</label>
								<p className={'font-mono text-neutral-500'}>
									{gaugeInfo.exists ? `yvBlp${gaugeInfo.symbol}` : '-'}
								</p>
							</div>
							<div>
								<label className={'text-xs font-semibold text-neutral-700/60'}>{'Vault Address'}</label>
								{gaugeInfo.deployed ? <AddressWithActions
									explorer={'https://etherscan.io'}
									className={'font-mono font-normal text-neutral-500'}
									address={toAddress(gaugeInfo.vaultAddress)}
									truncate={0} /> : <p className={'h-8 font-mono text-neutral-500'}>{'-'}</p>
								}
							</div>
						</div>
						<button
							onClick={onCreateVault}
							disabled={!selectedGauge || isZeroAddress(selectedGauge.address) || !!error || txStatusCreateVault.pending}
							className={`${!selectedGauge || isZeroAddress(selectedGauge.address) || !!error ? 'bg-neutral-50 cursor-not-allowed opacity-30' : 'bg-neutral-50 hover:bg-neutral-100'} mb-2 mr-2 w-full border border-solid border-neutral-500 p-1.5 font-mono text-sm font-semibold text-neutral-900 transition-colors`}>
							{error ? '❌ A vault already exists for this gauge' : '🤯 Create your own Vault'}
						</button>
					</div>
				</div>
			</section>

		</main>
	);
}

export default Index;
