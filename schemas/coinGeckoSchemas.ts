import {z} from 'zod';

export const coinGeckoPricesSchema = z.record(z.string(), z.object({usd: z.number()}));

export type TCoinGeckoPrices = z.infer<typeof coinGeckoPricesSchema>;

