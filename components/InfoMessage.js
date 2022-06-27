import	React	from	'react';

function	InfoMessage({status}) {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-white bg-accent-500'}>
				{'🚀 '}<strong>{'YEARN WEBSITE'}</strong> {"this vault is in Yearn Finance website. You don't need to move your funds."}
			</div>
		);
	}
	if (status === 'withdraw') {
		return (
			<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-white bg-red-900'}>
				{'🛑 '}<strong>{'WITHDRAW YOUR FUNDS'}</strong> {'this experiment is disabled and it will not generate more yield. Please remove your funds.'}
			</div>
		);
	}
	return (
		<div className={'max-w-5xl p-4 my-4 font-mono text-sm font-normal text-[#485570] bg-yellow-900'}>
			{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. It's extremely risky and will probably be discarded when the test is over. Proceed with extreme caution."}
		</div>
	);
}

export default InfoMessage;