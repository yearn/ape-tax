/******************************************************************************
**	@Author:				The Ape Community
**	@Twitter:				@ape_tax
**	@Date:					Wednesday October 20th 2021
**	@Filename:				useUI.js
******************************************************************************/

import	React, {useEffect, useContext, createContext}	from	'react';
import	useLocalStorage									from	'hook/useLocalStorage';

const	UI = createContext();
export const UIContextApp = ({children}) => {
	const	[theme, set_theme] = useLocalStorage('theme', 'light-initial');

	useEffect(() => {
		if (theme !== 'light-initial') {
			const lightModeMediaQuery = window.matchMedia('(prefers-color-scheme: light)');
			if (lightModeMediaQuery.matches)
				set_theme('light');
		}
		set_theme('dark');
	}, []);

	useEffect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
			document.documentElement.classList.remove('light-initial');
		} else if (theme === 'light' || theme === 'light-initial') {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
		}
	}, [theme]);

	return (
		<UI.Provider
			value={{
				theme,
				switchTheme: () => set_theme(t => t === 'dark' ? 'light' : 'dark'),
			}}>
			{children}
		</UI.Provider>
	);
};

export const useUI = () => useContext(UI);
export default useUI;
