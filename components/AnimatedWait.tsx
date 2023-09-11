import {type ReactElement, useEffect, useState} from 'react';

function	AnimatedWait(): ReactElement {
	const frames = ['[-----]', '[=----]', '[-=---]', '[--=--]', '[---=-]', '[----=]'];
	const [index, set_index] = useState(0);

	useEffect((): VoidFunction => {
		const timer = setInterval((): void => {
			set_index((index): number => (index + 1) % frames.length);
		}, 100);
		return (): void => clearTimeout(timer);
	}, [frames.length]);

	return <span>{frames[index]}</span>;
}

export default AnimatedWait;
