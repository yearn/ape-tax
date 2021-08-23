/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday August 11th 2021
**	@Filename:				useInputEvent.js
******************************************************************************/

import {useEffect, useState} from 'react';
export const useInputEvent = () => {
	const [key, setKey] = useState(null);
	useEffect(() => {
		const keyDownHandler = ({code}) => setKey(code);
		const keyUpHandler = () => setKey(null);
		global.addEventListener('keydown', keyDownHandler);
		global.addEventListener('keyup', keyUpHandler);
		return () => {
			global.removeEventListener('keydown', keyDownHandler);
			global.removeEventListener('keyup', keyUpHandler);
		};
	}, []);
	return key;
};