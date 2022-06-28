import	React, {Fragment, useState}							from	'react';
import	{ethers}											from	'ethers';
import	{Contract}											from	'ethcall';
import	{Combobox, Transition}								from	'@headlessui/react';
import	{useWeb3}											from	'@yearn-finance/web-lib/contexts';
import	{toAddress, performBatchedUpdates, providers,
	isZeroAddress, defaultTxStatus}							from	'@yearn-finance/web-lib/utils';
import	{AddressWithActions}								from	'@yearn-finance/web-lib';
import	useFactory											from	'contexts/useFactory';
import	useBalancerGauge									from	'contexts/useBalancerGauges';
import	{createNewVaultsAndStrategies}						from	'utils/actions';

function ComboBox({selectedGauge, set_selectedGauge}) {
	const	{balancerGauges} = useBalancerGauge();
	const	[query, setQuery] = useState('');

	const filteredGauges =
		query === ''
			? (balancerGauges || []).filter((gauge) => !gauge.exists && gauge.isAuraOK)
			: (balancerGauges || []).filter((gauge) => (
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
						className={'py-1.5 text-neutral-500 border-neutral-400 font-mono bg-opacity-0 w-full px-2 bg-white/0 active:ring-0 focus:ring-0 focus:border-neutral-700'}
						displayValue={(gauge) => gauge?.address}
						onChange={(event) => setQuery(event.target.value)}
					/>
					<Combobox.Button className={'absolute inset-y-0 right-0 flex items-center pr-2'}>
						<svg xmlns={'http://www.w3.org/2000/svg'} viewBox={'0 0 20 20'} fill={'currentColor'} aria-hidden={'true'} className={'h-5 w-5 text-neutral-500'}><path fillRule={'evenodd'} d={'M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'} clipRule={'evenodd'}></path></svg>
					</Combobox.Button>
				</div>
				<Transition
					as={Fragment}
					leave={'transition ease-in duration-100'}
					leaveFrom={'opacity-100'}
					leaveTo={'opacity-0'}
					afterLeave={() => setQuery('')}
				>
					<Combobox.Options className={'absolute mt-1 max-h-60 w-full overflow-auto bg-neutral-0 py-1 text-base focus:outline-none border border-neutral-400'}>
						{!filteredGauges || (filteredGauges || [])?.length === 0 && query !== '' ? (
							<div className={'relative cursor-default select-none py-2 px-4 text-neutral-500'}>
								{'Nothing found.'}
							</div>
						) : (
							(filteredGauges || []).map((gauge) => (
								<Combobox.Option
									key={gauge.address}
									className={({active}) => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-500'}`}
									value={gauge}>
									{({selected}) => (
										<>
											<div className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
												<p className={'text-base text-neutral-700 tabular-nums'}>{gauge.address}</p>
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


function	Index() {
	const	{getCommunityVaults} = useFactory();
	const	{provider, isActive} = useWeb3();
	const	[selectedGauge, set_selectedGauge] = React.useState();
	const	[gaugeInfo, set_gaugeInfo] = React.useState({exists: false, name: '', symbol: '', deployed: false, vaultAddress: ''});
	const	[error, set_error] = React.useState(undefined);
	const	[txStatusCreateVault, set_txStatusCreateVault] = React.useState(defaultTxStatus);
	
	/* 🔵 - Yearn Finance ******************************************************
	** The checkGauge callback will, for a given gauge address, check if the
	** factory already knows this vault and retrieve the name and symbol for
	** the gauge. If the gauge has already been deployed as a vault, an error
	** will be thrown indicating that the vault already exists.
	**************************************************************************/
	const	checkGauge = React.useCallback(async () => {
		const	ethcallProvider = await providers.newEthCallProvider(provider);
		const	balancerGlobalContract = new Contract(process.env.YEARN_BALANCER_FACTORY_ADDRESS, [{'stateMutability':'view','type':'function','name':'alreadyExistsFromGauge','inputs':[{'name':'address','type':'address'}],'outputs':[{'name':'','type':'address'}]}]);
		const	gaugeContract = new Contract(selectedGauge?.address, [{'stateMutability':'view','type':'function','name':'name','inputs':[],'outputs':[{'name':'','type':'string'}]},{'stateMutability':'view','type':'function','name':'symbol','inputs':[],'outputs':[{'name':'','type':'string'}]}]);

		const	callResult = await ethcallProvider.tryAll([
			balancerGlobalContract.alreadyExistsFromGauge(selectedGauge?.address),
			gaugeContract.name(),
			gaugeContract.symbol()
		]);
		const	[existingAddress, name, symbol] = callResult;
		if (toAddress(existingAddress) !== ethers.constants.AddressZero) {
			performBatchedUpdates(() => {
				set_error('A Vault already exists for this Gauge address.');
				set_gaugeInfo({exists: true, name: name, symbol: symbol.replace('-gauge', ''), vaultAddress: toAddress(existingAddress), deployed: true});
			});
		} else {
			performBatchedUpdates(() => {
				set_error(undefined);
				set_gaugeInfo({exists: true, name: name, symbol: symbol.replace('-gauge', ''), vaultAddress: '', deployed: false});
			});
		}
	}, [provider, selectedGauge?.address]);
	React.useEffect(() => {
		if (!isZeroAddress(selectedGauge?.address)) {
			checkGauge();
		} else {
			performBatchedUpdates(() => {
				set_error(undefined);
				set_gaugeInfo({exists: false, name: '', symbol: '', deployed: false, vaultAddress: ''});
			});
		}
	}, [selectedGauge, checkGauge]);

	/* 🔵 - Yearn Finance ******************************************************
	** If all the conditions are met, the createVault callback will submit a
	** transaction to create a new vault for the given gauge address.
	**************************************************************************/
	async function	onCreateVault() {
		if (txStatusCreateVault.pending)
			return;
		set_txStatusCreateVault({...txStatusCreateVault, pending: true});
		createNewVaultsAndStrategies({provider, gauge: selectedGauge.address}, ({error, data}) => {
			if (error) {
				console.error(error);
				set_txStatusCreateVault({...txStatusCreateVault, error: true});
				setTimeout(() => set_txStatusCreateVault(defaultTxStatus), 3000);
				return;
			}
			console.log(`YOU VAULT IS READY HERE: ${data}`);
			performBatchedUpdates(async () => {
				await getCommunityVaults();
				set_gaugeInfo({...gaugeInfo, vaultAddress: data, deployed: true});
				set_txStatusCreateVault({...txStatusCreateVault, success: true});
			});
			setTimeout(() => set_txStatusCreateVault(defaultTxStatus), 3000);
		});
	}

	/* 🔵 - Yearn Finance ******************************************************
	** While the user's wallet is not connected, hide the page content.
	**************************************************************************/
	if (!isActive) {
		return (
			<section>
				<h1 className={'text-sm font-mono font-semibold text-neutral-700'}>{'Loading Ex'}<sup>{'2'}</sup>{' 🧪...'}</h1>
			</section>
		);
	}

	return (
		<main className={'max-w-5xl mt-8'}>
			<div>
				<div className={'hidden md:block'}>
					<h1 className={'text-3xl font-mono font-semibold text-neutral-700 leading-9 mb-6'}>{'Experimental Experiments Registry'}</h1>
				</div>
				<div className={'flex md:hidden'}>
					<h1 className={'text-xl font-mono font-semibold text-neutral-700 leading-9'}>{'Ex'}<sup className={'mt-4 mr-2'}>{'2'}</sup>{' Registry'}</h1>
				</div>
			</div>
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-[#485570] bg-yellow-900'}>
				{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution."}
			</div>

			<section aria-label={'New Vault'} className={'grid grid-cols-1 my-8'}>
				<div className={'w-full border p-4 border-dashed border-neutral-500 mx-auto'}>
					<div>
						<p className={'text-3xl font-semibold text-neutral-700 font-mono'}>
							{'Add new Vault'}
						</p>
					</div>

					<div className={'text-xs my-6'}>
						<div className={'text-neutral-700 font-mono text-base space-y-4'}>
							<p>{'Deploy a new vault and start autocompounding the yield from your Balancer deposits'}</p>
							<p>{'Remember, this is an experimental experiment'}</p>
						</div>
					</div>

					<div>
						<div className={'flex flex-col space-y-2 mt-12 mb-6'}>
							<label className={'text-neutral-700/60 text-xs font-semibold -mb-1'}>{'Gauge Address'}</label>
							<ComboBox selectedGauge={selectedGauge} set_selectedGauge={set_selectedGauge} />
						</div>
						<div className={'flex flex-col space-y-3 mb-12'}>
							<div>
								<label className={'text-neutral-700/60 text-xs font-semibold'}>{'Vault Name'}</label>
								<p className={'text-neutral-500 font-mono'}>
									{gaugeInfo.exists ? `Balancer ${gaugeInfo.symbol} Auto-Compounding yVault` : '-'}
								</p>
							</div>
							<div>
								<label className={'text-neutral-700/60 text-xs font-semibold'}>{'Vault Symbol'}</label>
								<p className={'text-neutral-500 font-mono'}>
									{gaugeInfo.exists ? `yvBlp${gaugeInfo.symbol}` : '-'}
								</p>
							</div>
							<div>
								<label className={'text-neutral-700/60 text-xs font-semibold'}>{'Vault Address'}</label>
								{gaugeInfo.deployed ? <AddressWithActions
									explorer={'https://etherscan.io'}
									className={'text-neutral-500 font-mono font-normal'}
									address={gaugeInfo.vaultAddress}
									truncate={0} /> : <p className={'text-neutral-500 font-mono h-8'}>{'-'}</p>
								}
							</div>
						</div>
						<button
							onClick={onCreateVault}
							disabled={!selectedGauge || isZeroAddress(selectedGauge.address) || error || txStatusCreateVault.pending}
							className={`${!selectedGauge || isZeroAddress(selectedGauge.address) || error ? 'bg-neutral-50 opacity-30 cursor-not-allowed' : 'bg-neutral-50 hover:bg-neutral-100'} transition-colors font-mono border border-solid border-neutral-500 text-sm px-1.5 py-1.5 font-semibold mr-2 mb-2 text-neutral-900 w-full`}>
							{error ? '❌ A vault already exists for this gauge' : '🤯 Create your own Vault'}
						</button>
					</div>
				</div>
			</section>

		</main>
	);
}

export default Index;
