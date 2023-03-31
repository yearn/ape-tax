import {Fragment} from 'react';

import type {ReactElement} from 'react';

function ProgressChart({progress = 0, width = 0}): ReactElement {
	const	partChar = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
	const	wholeChar = '█';
	const	wholeWidth = Math.floor(progress * width);
	const	remainderWidth = (progress * width) % 1;
	const	partWidth = Math.floor(remainderWidth * 9);
	let		whiteWidth = width - wholeWidth - 1;

	if (progress == 1) {
		whiteWidth = 0;
	}

	return (
		<Fragment>
			{'' + wholeChar.repeat(wholeWidth) + partChar[partWidth] + ' '.repeat(whiteWidth) + ''}
		</Fragment>
	);
}

export default ProgressChart;
