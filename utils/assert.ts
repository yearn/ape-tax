import actualAssert from 'assert';

export function assert(expression: unknown, message?: string | Error): asserts expression {
	try {
		actualAssert(expression, message);
	} catch (error) {
		if (process.env.NODE_ENV === 'production') {
			console.error(error);
		}
		throw error;
	}
}

