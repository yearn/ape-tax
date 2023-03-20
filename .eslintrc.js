module.exports = {
	'env': {
		'node': true,
		'browser': true,
		'es2021': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:import/recommended',
		'plugin:react-hooks/recommended',
		'plugin:tailwindcss/recommended',
		'next/core-web-vitals'
	],
	'plugins': [
		'react',
		'tailwindcss',
		'unused-imports',
		'simple-import-sort',
		'import'
	],
	'settings': {
		'react': {'version': 'detect'}
	},
	'rules': {
		'import/default': 0,
		'no-mixed-spaces-and-tabs': 2,
		'react/prop-types': 0,
		'no-async-promise-executor': 0,
		'import/no-unresolved': 0, //Issue with package exports
		'quotes': [2, 'single', {'avoidEscape': true}],
		'object-curly-spacing': [2, 'never'],
		'array-bracket-spacing': [2, 'never'],
		'semi': 'error',
		'no-else-return': ['error', {'allowElseIf': false}],
		'eol-last': ['error', 'always'],
		'import/no-named-as-default-member': 2,
		'tailwindcss/no-custom-classname': 0,
		'array-bracket-newline': ['error', {'multiline': true}],
		'react/jsx-curly-brace-presence': ['error', {'props': 'always', 'children': 'always'}],
		'react/jsx-first-prop-new-line': ['error', 'multiline'],
		'react/jsx-max-props-per-line': ['error', {'maximum': {'single': 2, 'multi': 1}}],
		'react/jsx-closing-tag-location': 2,
		'unused-imports/no-unused-imports': 'error',
		'unused-imports/no-unused-vars': [
			'warn', {
				'vars': 'all',
				'varsIgnorePattern': '^_',
				'args': 'after-used',
				'argsIgnorePattern': '^_'
			}
		],
		'simple-import-sort/imports': 2,
		'simple-import-sort/exports': 2,
		'import/first': 2,
		'import/newline-after-import': 2,
		'import/no-duplicates': 2,
		'curly': ['error', 'all'],
		'object-curly-newline': [
			'error', {
				'ObjectExpression': {'multiline': true, 'consistent': true},
				'ObjectPattern': {'multiline': true, 'consistent': true},
				'ImportDeclaration': 'never',
				'ExportDeclaration': {'multiline': true, 'minProperties': 3}
			}
		],
		'object-property-newline': ['error', {'allowAllPropertiesOnSameLine': true}],
		'prefer-destructuring': ['error', {'array': true, 'object': true}, {'enforceForRenamedProperties': false}],
		'no-multi-spaces': ['error', {ignoreEOLComments: false}],
		'brace-style': ['error', '1tbs'],
		'comma-dangle': ['error'],
		'comma-spacing': ['error'],
		'dot-notation': ['error'],
		'indent': ['error', 'tab'],
		'import/namespace': 0
	},
	overrides: [
		{
			files: ['*.{ts,tsx,js,jsx}'],
			rules: {
				'simple-import-sort/imports': [
					'error',
					{
						groups: [
							[
								'^react',
								'^next',
								'^(ethers|ethcall)?\\w',
								'^axios', '^swr',
								'^tailwindcss', '^framer-motion', '^nprogress',
								'^@?\\w',
								'^(@yearn-finance/.*)?\\w',
								'^(@common/.*)?\\w',
								'^(@y.*)?\\w'
							],
							// Parent imports.
							['^\\u0000', '^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./?$', '^\\.(?!/?$)', '^\\./(?=.*/)(?!/?$)'],
							//Types imports.
							[
								'^node:.*\\u0000$',
								'^(@yearn-finance)?\\w.*\\u0000$',
								'^(@common)?\\w.*\\u0000$',
								'^(@y.*)?\\w.*\\u0000$',
								'^@?\\w.*\\u0000$',
								'^[^.].*\\u0000$',
								'^\\..*\\u0000$'
							],

							// Style imports.
							['^.+\\.s?css$']
						]
					}
				]
			}
		}
	]
};
