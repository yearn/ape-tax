/* eslint-disable @typescript-eslint/no-explicit-any */
import Cors from 'cors';
import memoize from 'memoizee';

function initMiddleware(middleware: any): any {
	return async (req: any, res: any): Promise<any> =>
		new Promise((resolve, reject): any => {
			middleware(req, res, (result: any): any => {
				if (result instanceof Error) {
					return reject(result);
				}
				return resolve(result);
			});
		});
}

const cors = initMiddleware(
	Cors({methods: ['GET', 'POST', 'OPTIONS']})
);

const formatJsonSuccess = (data: any): any => ({
	success: true,
	generatedTimeMs: +Date.now(),
	data
});

const formatJsonError = (err: Error): any => ({
	success: false,
	err: err.toString ? err.toString() : err
});

const fn = (cb: any, options = {}): any => {
	const {maxAge: maxAgeSec = null} = options as any;

	const callback = maxAgeSec !== null ?
		memoize(async (query: any): Promise<any> => cb(query), {
			promise: true,
			maxAge: maxAgeSec * 1000,
			normalizer: ([query]: any[]): any => JSON.stringify(query) // Separate cache entries for each route & query params,
		}) :
		async (query: any): Promise<any> => cb(query);

	return async (req: any, res: any): Promise<any> => {
		await cors(req, res);
		return Promise.resolve(callback(req.query))
			.then((data): any => res.status(200).json(formatJsonSuccess(data)))
			.catch((err): any => res.status(500).json(formatJsonError(err)));
	};
};

export {
	fn,
	formatJsonError
};
