import actualAssert from 'assert';
// TODO: import {captureException} from '@sentry/nextjs';


export function assert(expression: unknown, message?: string | Error): asserts expression {
	try {
		actualAssert(expression, message);
	} catch (error) {
		console.error(error);
		// if (process.env.NODE_ENV === 'production') {
		// 	// TODO: captureException(error);
		// }
		throw error;
	}
}

