import type {TAddress} from '@yearn-finance/web-lib/types';
import type {TNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type Maybe<T> = T | null | undefined;
// eslint-disable-next-line @typescript-eslint/naming-convention
export type Err = {error: never}

export type TCallbackFunction = (arg: {error: unknown; data: any}) => void;

export type TVault = {
	TITLE: string;
	LOGO: string;
	VAULT_ABI: string;
	VAULT_TYPE: string;
	VAULT_ADDR: string;
	WANT_ADDR: string;
	WANT_SYMBOL: string;
	COINGECKO_SYMBOL: string;
	VAULT_STATUS: string;
	CHAIN_ID: number;

	//Computed
	LOGO_ARR?: string[];
	VAULT_SLUG?: string;
	PRICE_SOURCE?: string;
	ORDER?: number;
	SYMBOL?: string;
	ZAP_ADDR?: string;
}

export type TAPIVault = {
	title: string;
	logo: string;
	displayName: string;
	src: string;
	status: string;
	type: string;
	address: string;
	network: number;
	APY?: {
		week: string;
		month: string;
		inception: string;
	}
	data: {
		apiVersion: string;
		depositLimit: string;
		totalAssets: string;
		availableDepositLimit: string;
		pricePerShare: string;
		decimals: number;
		activation: number;
	};
	want: {
		address: string;
		symbol: string;
		cgID: string;
	};
}

export type TSpecificAPIResult = {
	week: string;
	month: string;
	inception: string;
	extra: {
		pricePerShare: number;
		decimals: number;
	};
}

type TUsdValue = number;

export type TVaultData = {
	loaded: boolean;
	depositLimit: TNormalizedBN;
	totalAssets: TNormalizedBN;
	availableDepositLimit: TNormalizedBN;
	coinBalance: TNormalizedBN;
	balanceOf: TNormalizedBN;
	wantBalance: TNormalizedBN;
	allowance: TNormalizedBN;
	pricePerShare: TNormalizedBN;
	apiVersion: string;
	decimals: number;
	totalAUM: TUsdValue;
	balanceOfValue: TUsdValue;
	wantPrice: TUsdValue;
	progress: number;

	wantPriceError?: boolean;
	allowanceZapOut?: TNormalizedBN;
}

export type TStrategyData = {
	address: TAddress;
	name: string;
	description: string;
	creditAvailable: TNormalizedBN;
}

export type TTVL = {
	tvlEndorsed: number;
	tvlExperimental: number;
	tvlDeprecated: number;
	tvl: number;
}

export type TGauge = {
	address: TAddress,
	name: string,
	symbol: string,
	exists: boolean,
	isAuraOK: boolean,
}

export type TNetwork = {
	value: number,
	label: string,
	currencySymbol: string,
	blockExplorer: string
}
