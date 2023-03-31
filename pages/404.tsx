import	React	from	'react';

import type {ReactElement} from 'react';

function Error404(): ReactElement {
	return (
		<section aria-label={'404'}>
			<div className={'mt-8 flex flex-col items-center justify-center'}>
				<p className={'font-mono text-4xl font-medium leading-11'}>{'😵'}</p>
				<p className={'font-mono text-4xl font-medium leading-11 text-neutral-700'}>{'Page Not Found'}</p>
				<p className={'font-mono text-4xl font-medium leading-11 text-neutral-700'}>{'404'}</p>
			</div>
		</section>
	);
}

export default Error404;
