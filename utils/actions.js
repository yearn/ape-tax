/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				actions.js
******************************************************************************/

import	{ethers}			from	'ethers';
import	toast				from	'react-hot-toast';

export async function	approveToken({provider, contractAddress, amount, from}, callback) {
	const	_toast = toast.loading('Approving token...');
	const	signer = provider.getSigner();
	const	erc20 = new ethers.Contract(
		contractAddress,
		['function approve(address spender, uint256 amount) public returns (bool)'],
		signer
	);

	/**********************************************************************
	**	In order to avoid dumb error, let's first check if the TX would
	**	be successful with a static call
	**********************************************************************/
	try {
		await erc20.callStatic.approve(from, amount);
	} catch (error) {
		callback({error: true, data: undefined});
		toast.dismiss(_toast);
		toast.error('Impossible to approve token');
		return;
	}

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await erc20.approve(from, amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: amount});
		} else {
			toast.dismiss(_toast);
			toast.error('Approve failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Approve failed');
		callback({error: true, data: undefined});
	}
}

export async function	depositToken({provider, contractAddress, amount}, callback) {
	const	_toast = toast.loading('Deposit token...');
	const	abi = ['function deposit(uint256 amount)'];
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(contractAddress, abi, signer);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await contract.deposit(amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		console.error(error);
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error: true, data: undefined});
	}
}

export async function	withdrawToken({provider, contractAddress, amount}, callback) {
	const	_toast = toast.loading('Withdraw token...');
	const	abi = ['function withdraw(uint256 amount)'];
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(contractAddress, abi, signer);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await contract.withdraw(amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		console.error(error);
		callback({error: true, data: undefined});
	}
}

export async function	apeInVault({provider, contractAddress, amount}, callback) {
	const	_toast = toast.loading('APE in vault...');
	const	signer = provider.getSigner();
	const	zap = new ethers.Contract(
		contractAddress,
		['function deposit() public payable'],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await zap.deposit({value: amount});
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}

export async function	apeOutVault({provider, contractAddress, amount}, callback) {
	const	_toast = toast.loading('APE out vault...');
	const	signer = provider.getSigner();
	const	zap = new ethers.Contract(
		contractAddress,
		['function withdraw(uint256 amount) public'],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		const	transaction = await zap.withdraw(amount);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			callback({error: false, data: undefined});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}

export async function	createNewVaultsAndStrategies({provider, gauge}, callback) {
	const	_toast = toast.loading('Creating new Vault...');
	const	signer = provider.getSigner();
	const	contract = new ethers.Contract(
		process.env.BALANCER_GLOBAL_ADDRESS,
		[
			'function createNewVaultsAndStrategies(address _gauge) external returns (address vault, address auraStrategy)',
			'function alreadyExistsFromGauge(address) public view returns (address)'
		],
		signer
	);

	/**********************************************************************
	**	If the call is successful, try to perform the actual TX
	**********************************************************************/
	try {
		console.log(`Creating vault for gauge ${gauge} ...`);
		const	transaction = await contract.createNewVaultsAndStrategies(gauge);
		const	transactionResult = await transaction.wait();
		if (transactionResult.status === 1) {
			toast.dismiss(_toast);
			toast.success('Transaction successful');
			const	newVaultAddress = await contract.alreadyExistsFromGauge(gauge);
			callback({error: false, data: newVaultAddress});
		} else {
			toast.dismiss(_toast);
			toast.error('Transaction failed');
			callback({error: true, data: undefined});
		}
	} catch (error) {
		toast.dismiss(_toast);
		toast.error('Transaction failed');
		callback({error, data: undefined});
	}
}
