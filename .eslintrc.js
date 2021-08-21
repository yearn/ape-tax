module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": [
		'eslint:recommended',
        "plugin:vue/essential"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        'ecmaFeatures': {
			'jsx': true
		},
		"ecmaVersion": 2020,
        "sourceType": "module"
    },
    "plugins": [
        "vue"
    ],
    "rules": {
		'indent': [2, 'tab'],
		'no-mixed-spaces-and-tabs': 1,
		'no-async-promise-executor': 0,
		'quotes': [2, 'single', {'avoidEscape': true}],
		'object-curly-spacing': [2, 'never'],
		'array-bracket-spacing': [2, 'never'],
		'semi': 'error',
    }
};