import {z} from 'zod';
import {addressSchema} from '@yearn-finance/web-lib/utils/schemas/addressSchema';

export const yDaemonPriceSchema = z.string();
export const yDaemonPricesSchema = z.record(addressSchema, yDaemonPriceSchema);
export const yDaemonPricesChainSchema = z.record(z.string(), yDaemonPricesSchema);

export type TYDaemonPrice = z.infer<typeof yDaemonPriceSchema>;
export type TYDaemonPrices = z.infer<typeof yDaemonPricesSchema>;
export type TYDaemonPricesChain = z.infer<typeof yDaemonPricesChainSchema>;
