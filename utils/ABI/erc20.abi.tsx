const ERC20_ABI = [
	{
		'name': 'Transfer',
		'inputs': [
			{
				'type': 'address',
				'name': '_from',
				'indexed': true
			}, {
				'type': 'address',
				'name': '_to',
				'indexed': true
			}, {
				'type': 'uint256',
				'name': '_value',
				'indexed': false
			}
		],
		'anonymous': false,
		'type': 'event'
	}, {
		'name': 'Approval',
		'inputs': [
			{
				'type': 'address',
				'name': '_owner',
				'indexed': true
			}, {
				'type': 'address',
				'name': '_spender',
				'indexed': true
			}, {
				'type': 'uint256',
				'name': '_value',
				'indexed': false
			}
		],
		'anonymous': false,
		'type': 'event'
	}, {
		'name': 'UpdateMiningParameters',
		'inputs': [
			{
				'type': 'uint256',
				'name': 'time',
				'indexed': false
			}, {
				'type': 'uint256',
				'name': 'rate',
				'indexed': false
			}, {
				'type': 'uint256',
				'name': 'supply',
				'indexed': false
			}
		],
		'anonymous': false,
		'type': 'event'
	}, {
		'name': 'SetMinter',
		'inputs': [
			{
				'type': 'address',
				'name': 'minter',
				'indexed': false
			}
		],
		'anonymous': false,
		'type': 'event'
	}, {
		'name': 'SetAdmin',
		'inputs': [
			{
				'type': 'address',
				'name': 'admin',
				'indexed': false
			}
		],
		'anonymous': false,
		'type': 'event'
	}, {
		'outputs': [],
		'inputs': [
			{
				'type': 'string',
				'name': '_name'
			}, {
				'type': 'string',
				'name': '_symbol'
			}, {
				'type': 'uint256',
				'name': '_decimals'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'constructor'
	}, {
		'name': 'update_mining_parameters',
		'outputs': [],
		'inputs': [],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'start_epoch_time_write',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'future_epoch_time_write',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'available_supply',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'mintable_in_timeframe',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'uint256',
				'name': 'start'
			}, {
				'type': 'uint256',
				'name': 'end'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'set_minter',
		'outputs': [],
		'inputs': [
			{
				'type': 'address',
				'name': '_minter'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'set_admin',
		'outputs': [],
		'inputs': [
			{
				'type': 'address',
				'name': '_admin'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'totalSupply',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'allowance',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': '_owner'
			}, {
				'type': 'address',
				'name': '_spender'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'transfer',
		'outputs': [
			{
				'type': 'bool',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': '_to'
			}, {
				'type': 'uint256',
				'name': '_value'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'transferFrom',
		'outputs': [
			{
				'type': 'bool',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': '_from'
			}, {
				'type': 'address',
				'name': '_to'
			}, {
				'type': 'uint256',
				'name': '_value'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'approve',
		'outputs': [
			{
				'type': 'bool',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': '_spender'
			}, {
				'type': 'uint256',
				'name': '_value'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'mint',
		'outputs': [
			{
				'type': 'bool',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': '_to'
			}, {
				'type': 'uint256',
				'name': '_value'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'burn',
		'outputs': [
			{
				'type': 'bool',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'uint256',
				'name': '_value'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'set_name',
		'outputs': [],
		'inputs': [
			{
				'type': 'string',
				'name': '_name'
			}, {
				'type': 'string',
				'name': '_symbol'
			}
		],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}, {
		'name': 'name',
		'outputs': [
			{
				'type': 'string',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'symbol',
		'outputs': [
			{
				'type': 'string',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'decimals',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'balanceOf',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [
			{
				'type': 'address',
				'name': 'arg0'
			}
		],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'minter',
		'outputs': [
			{
				'type': 'address',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'admin',
		'outputs': [
			{
				'type': 'address',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'mining_epoch',
		'outputs': [
			{
				'type': 'int128',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'start_epoch_time',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
		'stateMutability': 'view',
		'type': 'function'
	}, {
		'name': 'rate',
		'outputs': [
			{
				'type': 'uint256',
				'name': ''
			}
		],
		'inputs': [],
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
			}, {
				'internalType': 'uint256',
				'name': 'value',
				'type': 'uint256'
			}, {
				'internalType': 'uint256',
				'name': 'deadline',
				'type': 'uint256'
			}, {
				'internalType': 'uint8',
				'name': 'v',
				'type': 'uint8'
			}, {
				'internalType': 'bytes32',
				'name': 'r',
				'type': 'bytes32'
			}, {
				'internalType': 'bytes32',
				'name': 's',
				'type': 'bytes32'
			}
		],
		'name': 'permit',
		'outputs': [],
		'stateMutability': 'nonpayable',
		'type': 'function'
	}
];

export default ERC20_ABI;
