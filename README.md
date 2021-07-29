# Ape Tax 🦍🧮

If you want to run the UI yourself, check the following steps:

## Project setup

```bash
npm install
```

### Compiles and hot-reloads for development

```bash
npm run serve
```

### Compiles and minifies for production

```bash
npm run build
```

### Lints and fixes files

```bash
npm run lint
```

## Add an experimental experiment

Add a new element to the vaults.json array, at the end:

```javascript
'path': { // URL path
  "TITLE": "Hardrock Farmer", // Title of the vault, let you imagination fly
  "LOGO": "🎸👨‍🌾", // Emojis to show on top, make it fun please
  "VAULT_ABI": "yVaultV2", // Usually that one, unless doing a custom one
  "VAULT_TYPE": 'weird', // 'weird', 'experimental' to select in which column it should show
  "VAULT_ADDR": "0x33bd0f9618cf38fea8f7f01e1514ab63b9bde64b", // Vault address
  "WANT_ADDR": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Token address
  "WANT_SYMBOL": "USDC", // want symbol to show in UI
  "COINGECKO_SYMBOL": "usd-coin", // Coingecko symbol, check it on their page
  "VAULT_DEV": "emilianobonassi", // Developer of the vault
  "BLOCK_ACTIVATED": 1606599919, // When the vault was activated (not implemented yet)
  "VAULT_STATUS": "active", // 'active' is the default, 'withdraw' is for vault closed to new deposits, 'stealth' for hidden vaults and 'endorsed' for vaults used on Yearn Finance. Not active vaults have a label to show status.
  "CHAIN_ID": 1, // 1: Ethereum mainnet, 250: Fantom network, 56: BSC, 137: Polygon network
}
```
