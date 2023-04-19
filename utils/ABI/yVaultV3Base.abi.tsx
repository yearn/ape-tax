const YVAULT_V3_BASE_ABI = [
	{
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'owner',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'spender',
				'type': 'address'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'value',
				'type': 'uint256'
			}
		],
		'name': 'Approval',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'clone',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'original',
				'type': 'address'
			}
		],
		'name': 'Cloned',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'caller',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'owner',
				'type': 'address'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'assets',
				'type': 'uint256'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'shares',
				'type': 'uint256'
			}
		],
		'name': 'Deposit',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'components': [
					{
						'internalType': 'address',
						'name': 'facetAddress',
						'type': 'address'
					}, {
						'internalType': 'enum IDiamond.FacetCutAction',
						'name': 'action',
						'type': 'uint8'
					}, {
						'internalType': 'bytes4[]',
						'name': 'functionSelectors',
						'type': 'bytes4[]'
					}
				],
				'indexed': false,
				'internalType': 'struct IDiamond.FacetCut[]',
				'name': '_diamondCut',
				'type': 'tuple[]'
			}, {
				'indexed': false,
				'internalType': 'address',
				'name': '_init',
				'type': 'address'
			}, {
				'indexed': false,
				'internalType': 'bytes',
				'name': '_calldata',
				'type': 'bytes'
			}
		],
		'name': 'DiamondCut',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': false,
				'internalType': 'uint256',
				'name': 'profit',
				'type': 'uint256'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'loss',
				'type': 'uint256'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'performanceFees',
				'type': 'uint256'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'protocolFees',
				'type': 'uint256'
			}
		],
		'name': 'Reported',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [],
		'name': 'StrategyShutdown',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'from',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'to',
				'type': 'address'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'value',
				'type': 'uint256'
			}
		],
		'name': 'Transfer',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'newKeeper',
				'type': 'address'
			}
		],
		'name': 'UpdateKeeper',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'newManagement',
				'type': 'address'
			}
		],
		'name': 'UpdateManagement',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': false,
				'internalType': 'uint16',
				'name': 'newPerformanceFee',
				'type': 'uint16'
			}
		],
		'name': 'UpdatePerformanceFee',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'newPerformanceFeeRecipient',
				'type': 'address'
			}
		],
		'name': 'UpdatePerformanceFeeRecipient',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': false,
				'internalType': 'uint256',
				'name': 'newProfitMaxUnlockTime',
				'type': 'uint256'
			}
		],
		'name': 'UpdateProfitMaxUnlockTime',
		'type': 'event'
	}, {
		'anonymous': false,
		'inputs': [
			{
				'indexed': true,
				'internalType': 'address',
				'name': 'caller',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'receiver',
				'type': 'address'
			}, {
				'indexed': true,
				'internalType': 'address',
				'name': 'owner',
				'type': 'address'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'assets',
				'type': 'uint256'
			}, {
				'indexed': false,
				'internalType': 'uint256',
				'name': 'shares',
				'type': 'uint256'
			}
		],
		'name': 'Withdraw',
		'type': 'event'
	}, {
		'inputs': [],
		'name': 'DOMAIN_SEPARATOR',
		'outputs': [
			{
				'internalType': 'bytes32',
				'name': '',
				'type': 'bytes32'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': 'owner',
				'type': 'address'
			}, {
				'internalType': 'address',
				'name': 'spender',
				'type': 'address'
			}
		],
		'name': 'allowance',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'apiVersion',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'pure',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'version',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'pure',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'EIP712_VERSION',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'pure',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'DOMAIN_TYPEHASH',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'pure',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': 'account',
				'type': 'address'
			}
		],
		'name': 'balanceOf',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'shares',
				'type': 'uint256'
			}
		],
		'name': 'convertToAssets',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'assets',
				'type': 'uint256'
			}
		],
		'name': 'convertToShares',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'decimals',
		'outputs': [
			{
				'internalType': 'uint8',
				'name': '',
				'type': 'uint8'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'bytes4',
				'name': '_functionSelector',
				'type': 'bytes4'
			}
		],
		'name': 'facetAddress',
		'outputs': [
			{
				'internalType': 'address',
				'name': '',
				'type': 'address'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'facetAddresses',
		'outputs': [
			{
				'internalType': 'address[]',
				'name': '',
				'type': 'address[]'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_facet',
				'type': 'address'
			}
		],
		'name': 'facetFunctionSelectors',
		'outputs': [
			{
				'internalType': 'bytes4[]',
				'name': '',
				'type': 'bytes4[]'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'facets',
		'outputs': [
			{
				'components': [
					{
						'internalType': 'address',
						'name': 'facetAddress',
						'type': 'address'
					}, {
						'internalType': 'bytes4[]',
						'name': 'functionSelectors',
						'type': 'bytes4[]'
					}
				],
				'internalType': 'struct IDiamondLoupe.Facet[]',
				'name': '',
				'type': 'tuple[]'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'fullProfitUnlockDate',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_sender',
				'type': 'address'
			}
		],
		'name': 'isKeeperOrManagement',
		'outputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_sender',
				'type': 'address'
			}
		],
		'name': 'isManagement',
		'outputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'isShutdown',
		'outputs': [
			{
				'internalType': 'bool',
				'name': '',
				'type': 'bool'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'keeper',
		'outputs': [
			{
				'internalType': 'address',
				'name': '',
				'type': 'address'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'lastReport',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'management',
		'outputs': [
			{
				'internalType': 'address',
				'name': '',
				'type': 'address'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_owner',
				'type': 'address'
			}
		],
		'name': 'maxDeposit',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_owner',
				'type': 'address'
			}
		],
		'name': 'maxMint',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '_maxMint',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_owner',
				'type': 'address'
			}
		],
		'name': 'maxRedeem',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '_maxRedeem',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_owner',
				'type': 'address'
			}
		],
		'name': 'maxWithdraw',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '_maxWithdraw',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'name',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'address',
				'name': '_owner',
				'type': 'address'
			}
		],
		'name': 'nonces',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'performanceFee',
		'outputs': [
			{
				'internalType': 'uint16',
				'name': '',
				'type': 'uint16'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'performanceFeeRecipient',
		'outputs': [
			{
				'internalType': 'address',
				'name': '',
				'type': 'address'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'assets',
				'type': 'uint256'
			}
		],
		'name': 'previewDeposit',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'shares',
				'type': 'uint256'
			}
		],
		'name': 'previewMint',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'shares',
				'type': 'uint256'
			}
		],
		'name': 'previewRedeem',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [
			{
				'internalType': 'uint256',
				'name': 'assets',
				'type': 'uint256'
			}
		],
		'name': 'previewWithdraw',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'pricePerShare',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'profitMaxUnlockTime',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'profitUnlockingRate',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'symbol',
		'outputs': [
			{
				'internalType': 'string',
				'name': '',
				'type': 'string'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'totalAssets',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'totalDebt',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'totalIdle',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'inputs': [],
		'name': 'totalSupply',
		'outputs': [
			{
				'internalType': 'uint256',
				'name': '',
				'type': 'uint256'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'availableDepositLimit',
		'inputs': [
			{
				'type': 'address',
				'name': 'owner'
			}
		],
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}
];

export default YVAULT_V3_BASE_ABI;
