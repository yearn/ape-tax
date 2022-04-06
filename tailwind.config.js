const colors = require('tailwindcss/colors');

module.exports = {
	darkMode: 'class',
	corePlugins: {
		ringColor: false,
	},
	content: [
		'./pages/**/*.js',
		'./components/**/*.js'
	],
	safelist: [
		'dark',
		'dark:',
		'dark:text-dark-50',
		'dark:border-dark-200',
		'dark:bg-dark-600',
		'dark:bg-dark-400',
		'dark:bg-dark-300',
	],
	theme: {
		fontFamily: {
			mono: ['IBM Plex Mono', 'monospace']
		},
		colors: {
			tag: {
				new: '#10B981',
				info: '#167df0',
				warning: '#fff257',
				withdraw: '#EF4444'
			},
			gray: colors.gray,
			red: colors.red,
			white: colors.white,
			black: colors.black,
			sky: colors.sky,
			error: '#FF005E',
			pending: '#FFB800',
			success: '#A5DF00',
			ygray: {
				50: '#F5F5F5',
				100: '#E1E1E1',
				200: '#DBDBDB',
				400: '#7A7A7A',
				600: '#767676',
				700: '#2c3e50',
				900: '#363636',
			},
			dark: {
				900: '#09162E',
				600: 'rgb(19,38,75)',
				400: 'rgb(24,48,95)',
				300: '#2f446f',
				200: '#46597e',
				100: '#5d6e8f',
				50: '#ced3dd',
			},
		},
		extend: {
			lineHeight: {
				11: '3.25rem',
				'120px': '120px'
			},
			fontSize: {
				'xxs': '0.6rem',
				'xs': '0.7rem',
				'3xl': '2rem',
				'7xl': '5rem',
				'sm': '0.8rem',
			}
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('@tailwindcss/forms')
	],
};