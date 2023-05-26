import {useEffect, useState} from 'react';
import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import IconCopy from '@yearn-finance/web-lib/icons/IconCopy';
import IconLinkOut from '@yearn-finance/web-lib/icons/IconLinkOut';
import {toENS} from '@yearn-finance/web-lib/utils/address';
import {copyToClipboard} from '@yearn-finance/web-lib/utils/helpers';

function	AddressWithActions(props) {
	const	{address, explorer = '', truncate = 5, wrapperClassName, className = ''} = props;
	const	{networks} = useSettings();
	const	{chainID} = useWeb3();
	const	[explorerURI, set_explorerURI] = useState('');

	useEffect(() => {
		if (explorer !== '') {
			set_explorerURI(explorer);
		} else if (networks[chainID]?.explorerBaseURI) {
			set_explorerURI(networks[chainID].explorerBaseURI);
		}
	}, [chainID, explorer, networks]);

	return (
		<span className={`yearn--elementWithActions-wrapper ${wrapperClassName}`}>
			<p className={`yearn--elementWithActions ${className}`}>{toENS(address, truncate > 0, truncate)}</p>
			<button
				className={'yearn--elementWithActions-copy'}
				onClick={(e) => {
					e.stopPropagation();
					copyToClipboard(address);
				}}>
				<IconCopy className={'yearn--elementWithActions-icon'} />
			</button>
			<button className={'yearn--elementWithActions-linkout'}>
				<a
					onClick={(e) => e.stopPropagation()}
					href={`${explorerURI}/address/${address}`}
					target={'_blank'}
					className={'cursor-alias'}
					rel={'noreferrer'}>
					<span className={'sr-only'}>{'Link to explorer'}</span>
					<IconLinkOut className={'yearn--elementWithActions-icon'} />
				</a>
			</button>
		</span>
	);
}

export {AddressWithActions};
