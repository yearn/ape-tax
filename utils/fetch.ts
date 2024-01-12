import axios, {type AxiosRequestConfig} from 'axios';
import {serialize} from '@wagmi/core';

import type {z} from 'zod';

type TFetchProps = {
	endpoint: string | null;
	schema: z.ZodSchema;
	config?: AxiosRequestConfig<unknown>;
}

export type TFetchReturn<T> = Promise<{data: T | null, error?: Error}>

export async function fetch<T>({endpoint, schema, config}: TFetchProps): TFetchReturn<T> {
	if (!endpoint) {
		return {data: null, error: new Error('No endpoint provided')};
	}

	try {
		const {data} = await axios.get<T>(endpoint, config);

		if (!data) {
			return {data: null, error: new Error('No data')};
		}

		const parsedData = schema.safeParse(data);

		if (!parsedData.success) {
			console.error(endpoint, parsedData.error);
			return {data, error: parsedData.error};
		}

		return {...data, data: parsedData.data};
	} catch (error) {
		console.error(endpoint, error);
		if (error instanceof Error) {
			return {data: null, error};
		}
		return {data: null, error: new Error(serialize(error))};
	}
}
