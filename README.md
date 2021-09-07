# Ape Tax 🦍🧮

If you want to run the UI yourself, check the following steps:

## Project setup

```bash
yarn
```

### Compiles and hot-reloads for development

```bash
yarn run dev
```

### Compiles and minifies for production

```bash
yarn build
```

### Lints and fixes files

```bash
yarn lint
```

## Add an experimental experiment

#### With prompt
To add a new vault to the list, you need to run the following command : `node scripts/newVault.js --fast`.  
This will prompt you with several information:  
- What's the name of your vault ? (*ex: Hardrock Farmer*)
- What's the logo for your vault ? (*ex: 🎸👨‍🌾*)
- Which chain ? (*oneOf: Mainnet (1), BSC (56), Polygon (137), Fantom Opera (250)*)
- What's the address of your vault ? (*ex: 0x33bd0f9618cf38fea8f7f01e1514ab63b9bde64b*)
- Who is the dev of this vault ? (*ex: emilianobonassi*)

<img width="482" alt="Capture d’écran 2021-08-04 à 00 26 37" src="https://user-images.githubusercontent.com/9974362/128094349-de173732-ec31-4314-9d34-b73221a9099f.png">

#### With arguments
You can add some arguments to the script in order to specify some elements. The missing arguments will be prompted as above.  
Here are the arguments :  
- `name` for the name of your vault (*ex: `node scripts/newVault.js --name="Hardrock Farmer"`*)
- `logo` for the logo of your vault (*ex: `node scripts/newVault.js --logo=🎸👨‍🌾`*)
- `chain` for the chain of your vault. Valid options are 1, 56, 137 or 250. (*ex: `node scripts/newVault.js --chain=1`*)
- `address` for the address of your vault (*ex: `node scripts/newVault.js --address=0x33bd0f9618cf38fea8f7f01e1514ab63b9bde64b`*)
- `dev` for the name of the dev of your vault (*ex: `node scripts/newVault.js --dev=emilianobonassi`*)
- `abi` for the ABI to use for your vault. Valid options are yVaultV2 or LidoVault. (*ex: `node scripts/newVault.js --abi=yVaultV2`*)
- `type` for the type of vault. Valid options are experimental or weird. (*ex: `node scripts/newVault.js --type=experimental`*)
- `status` for the status of this vault. Valid options are new, active, withdraw, stealth or endorsed. (*ex: `node scripts/newVault.js --status=active`*)
- `coingecko` to specify the coingeckoID to use for this want token. (*ex: `node scripts/newVault.js --coingecko=true-usd`*)

All in one :
```
node scripts/newVault.js --name="Hardrock Farmer" --logo=🌾🌾 --chain=1 --address=0xFD0877d9095789cAF24c98F7CCe092fa8E120775 --dev=emilianobonassi --abi=yVaultV2 --type=experimental --status=active --coingecko=true-usd
```

## Use the API 🤖
The API helps third parties interact with the experimental vaults we are building. This API is subject to change as for the vault we are building.  
For now, you can use the following route to retrieve the list of experimental vaults:  
```
https://ape.tax/api/vaults
```

The following options are available:
- *network*
	- `?network=1` for Mainnet (default)
	- `?network=56` for BSC
	- `?network=137` for Polygon
	- `?network=250` for Fantom Opera
- *rpc*
	- `?rpc=YOU_CUSTOM_RPC` to use a specific RPC for this request


The returned data is cached for 10 minutes.
This route returns a JSON object with the following structure:
```json
{
  "success": true,
  "generatedTimeMs": 1630861673753,
  "data": {
    "0": {
      "title": "Fantom's Fury",
      "logo":"👻⚡",
      "displayName":"👻⚡ Fantom's Fury",
      "src":"https://ape.tax/fantomsfury",
      "status":"active",
      "type":"experimental",
      "address":"0x36e7aF39b921235c4b01508BE38F27A535851a5c",
      "network":250,
      "data": {
        "apiVersion":"0.3.2",
        "depositLimit":"5000000.0",
        "totalAssets":"716771.395316817876930412",
        "availableDepositLimit":"4283228.604683182123069588",
        "pricePerShare":"1.133355773675367656",
        "decimals":18
      },
      "want": {
        "address":"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
        "symbol":"WFTM",
        "cgID":"fantom"
      }
    }
  }
}	
```

