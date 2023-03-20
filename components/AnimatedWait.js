
import	React, {useEffect, useState}	from	'react';

function	AnimatedWait() {
	const frames = ['[-----]', '[=----]', '[-=---]', '[--=--]', '[---=-]', '[----=]'];
	const [index, setIndex] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => {
			setIndex((index) => (index + 1) % frames.length);
		}, 100);
		return () => clearTimeout(timer);
	}, [frames.length]);

	return <span>{frames[index]}</span>;
}

export default AnimatedWait;
