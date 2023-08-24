import AnimatedWait from 'components/AnimatedWait';

import type {ReactElement, ReactNode} from 'react';

function	Suspense({wait, children}: {wait: boolean, children: ReactNode}): ReactElement {
	if (wait) {
		return <AnimatedWait />;
	}
	return <span>{children}</span>;
}

export default Suspense;
