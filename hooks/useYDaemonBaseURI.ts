import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';

type TProps = {
	chainID: number | string;
};

export function useYDaemonBaseURI(props?: TProps): {yDaemonBaseUri: string} {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const {settings} = useSettings();

	const yDaemonBaseUri = settings.yDaemonBaseURI || process.env.YDAEMON_BASE_URI;

	if (!yDaemonBaseUri) {
		throw new Error('YDAEMON_BASE_URI is not defined');
	}

	if (!props?.chainID) {
		return {yDaemonBaseUri};
	}

	return {yDaemonBaseUri: `${yDaemonBaseUri}/${props.chainID}`};
}
