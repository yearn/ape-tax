import type {ReactElement} from 'react';

function	InfoMessage({status}: {status: string}): ReactElement {
	if (status === 'use_production' || status === 'endorsed') {
		return (
			<div className={'my-4 max-w-5xl bg-yearn-blue p-4 font-mono text-sm font-normal text-white'}>
				{'🚀 '}<strong>{'YEARN WEBSITE'}</strong> {"this vault is in Yearn Finance website. You don't need to move your funds."}
			</div>
		);
	}
	if (status === 'withdraw') {
		return (
			<div className={'my-4 max-w-5xl bg-red-900 p-4 font-mono text-sm font-normal text-white'}>
				{'🛑 '}<strong>{'WITHDRAW YOUR FUNDS'}</strong> {'this experiment is disabled and it will not generate more yield. Please remove your funds.'}
			</div>
		);
	}
	return (
		<div className={'my-4 max-w-5xl bg-yellow-900 p-4 font-mono text-sm font-normal text-[#485570]'}>
			{'⚠️ '}<strong>{'WARNING'}</strong> {"this experiments are experimental. It's extremely risky and will probably be discarded when the test is over. Proceed with extreme caution."}
		</div>
	);
}

export default InfoMessage;
