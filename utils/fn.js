/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Sunday September 5th 2021
**	@Filename:				fn.js
******************************************************************************/

import memoize from 'memoizee';

const formatJsonSuccess = (data) => ({
	success: true,
	data,
});

const formatJsonError = (err) => ({
	success: false,
	err: err.toString ? err.toString() : err,
});

const addGeneratedTime = async (res) => ({
	...await res,
	generatedTimeMs: +Date.now(),
});

const fn = (cb, options = {}) => {
	const {
		maxAge: maxAgeSec = null, // Caching duration, in seconds
	} = options;

	const callback = maxAgeSec !== null ?
		memoize(async (query) => addGeneratedTime(cb(query)), {
			promise: true,
			maxAge: maxAgeSec * 1000,
			normalizer: ([query]) => JSON.stringify(query), // Separate cache entries for each route & query params,
		}) :
		async (query) => addGeneratedTime(cb(query));

	return async (req, res) => (
		Promise.resolve(callback(req.query))
			.then((data) => res.status(200).json(formatJsonSuccess(data)))
			.catch((err) => res.status(500).json(formatJsonError(err)))
	);
};

export {
	fn,
	formatJsonError,
};
