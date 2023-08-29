const FACTORY_KEEPER_ABI = [
	{
		'inputs':[
			{
				'internalType':'address',
				'name':'_strategy',
				'type':'address'
			}
		],
		'name':'harvestStrategy',
		'outputs':[],
		'stateMutability':'nonpayable',
		'type':'function'
	}
] as const;

export default FACTORY_KEEPER_ABI;
