import useSWR from 'swr';
// import * as Sentry from '@sentry/nextjs';
import {baseFetcher} from '@yearn-finance/web-lib/utils/fetchers';

import type {SWRResponse} from 'swr';
import type {z} from 'zod';

type TUseZodProps<T> = {
	endpoint: string | null;
	schema: z.ZodSchema;
	config?: Parameters<typeof useSWR<T>>[2];
}

export function useFetch<T>({endpoint, schema, config}: TUseZodProps<T>): SWRResponse<T> & {isSuccess: boolean} {
	const result = useSWR<T>(endpoint, baseFetcher, {revalidateOnFocus: false, ...config});

	if (!result.data || result.isLoading || result.isValidating) {
		return {...result, isSuccess: false};
	}

	if (result.error) {
		console.error(endpoint, result.error);
		// Sentry.captureException(result.error, {tags: {endpoint}});
		return {...result, isSuccess: false};
	}


	const parsedData = schema.safeParse(result.data);

	if (!parsedData.success) {
		console.error(endpoint, parsedData.error);
		return {...result, isSuccess: false};
	}

	return {...result, data: parsedData.data, isSuccess: true};
}
