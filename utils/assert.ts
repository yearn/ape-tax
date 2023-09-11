import actualAssert from 'assert';
import {captureException} from '@sentry/nextjs';

export function assert(expression: unknown, message?: string | Error): asserts expression {
	try {
		actualAssert(expression, message);
	} catch (error) {
		if (process.env.NODE_ENV === 'production') {
			captureException(error);
		}
		throw error;
	}
}

