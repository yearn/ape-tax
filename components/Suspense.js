import	AnimatedWait			from	'components/AnimatedWait';

function	Suspense({wait, children}) {
	if (wait) {
		return <AnimatedWait />;
	}
	return <span>{children}</span>;
}

export default Suspense;
