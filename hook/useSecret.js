/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				useSecret.js
******************************************************************************/

import {useEffect, useState} from 'react';
import {useInputEvent} from 'hook/useInputEvent';

const useSecretCode = (secretCode) => {
	const [count, setCount] = useState(0);
	const [success, setSuccess] = useState(false);
	const key = useInputEvent();

	useEffect(() => {
		if (key == null) return;
		if (key !== secretCode[count]) {
			setCount(0);
			return;
		}
    
		setCount((state) => state + 1);
		if (count + 1 === secretCode.length) {
			setSuccess(s => !s);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
  
	return success;
};

export default useSecretCode;