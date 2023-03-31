/** @type {import('tailwindcss').Config} \*/
const {join} = require('path');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
	presets: [require('@yearn-finance/web-lib/tailwind.config.cjs')],
	content: [
		'./app/**/*.{js,ts,jsx,tsx}',
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./apps/**/*.{js,ts,jsx,tsx}',
		join(__dirname, 'node_modules', '@yearn-finance', 'web-lib', 'components', '**', '*.{js,ts,jsx,tsx}'),
		join(__dirname, 'node_modules', '@yearn-finance', 'web-lib', 'contexts', '**', '*.{js,ts,jsx,tsx}'),
		join(__dirname, 'node_modules', '@yearn-finance', 'web-lib', 'icons', '**', '*.{js,ts,jsx,tsx}'),
		join(__dirname, 'node_modules', '@yearn-finance', 'web-lib', 'utils', '**', '*.{js,ts,jsx,tsx}')
	],
	theme: {
		extend: {
			fontFamily: {
				aeonik: ['var(--font-aeonik)', 'Aeonik', ...defaultTheme.fontFamily.sans],
				mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono]
			},
			width: {
				'22': '5.5rem',
				'42': '10.5rem',
				'50': '12.5rem',
				'54': '13.5rem'
			},
			minWidth: {
				'42': '10.5rem'
			},
			maxWidth: {
				'50': '12.5rem',
				'54': '13.5rem'
			},
			height: {
				'inherit': 'inherit'
			},
			screens: {
				'lg': '1200px'
			},
			gridTemplateColumns: {
				'13': 'repeat(13, minmax(0, 1fr))',
				'14': 'repeat(14, minmax(0, 1fr))'
			},
			lineHeight: {
				11: '3.25rem',
				'120px': '120px'
			},
			fontSize: {
				'xxs': ['10px', '16px'],
				'2xl': ['24px', '32px'],
				'3xl': ['32px', '40px'],
				'7xl': ['64px', '72px'],
				'8xl': ['88px', '104px']
			}
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('@tailwindcss/forms')
	]
};
