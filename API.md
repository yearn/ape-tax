# Use the API 🤖
The API helps third parties interact with the experimental vaults we are building. This API is subject to change as for the vault we are building.  

## /api/vaults
This route is accessible to this URI and returns a list of all vaults with their respective details.
```
https://ape.tax/api/vaults
```

The following options are available:
- *network*
	- `?network=1` for Mainnet (default)
	- `?network=56` for BSC
	- `?network=137` for Polygon
	- `?network=250` for Fantom Opera
	- `?network=42161` for Arbitrum One
- *status*
  - `?status=active` to get only active vaults
  - `?status=endorsed` to get only endorsed vaults
  - `?status=withdraw` to get only withdraw vaults
  - `?status=new` to get only new vaults
  - `?status=stealth` to get only stealth vaults
- *rpc*
	- `?rpc=YOU_CUSTOM_RPC` to use a specific RPC for this request
- *apy*
	- `?apy=1` to compute the APY for Week/Month and Inception
- *revalidate*
  - `?revalidate=true` to update the list without the 10mn refresh delay



The returned data is cached for 10 minutes.
This route returns a JSON object with the following structure:
```json
{
	"title": "The Frog Prince 2",
	"logo": "🐸💋",
	"displayName": "🐸💋 The Frog Prince 2",
	"src": "https://ape.tax/frogprince2",
	"status": "endorsed",
	"type": "experimental",
	"address": "0x671a912c10bba0cfa74cfc2d6fba9ba1ed9530b2",
	"network": 1,
	"data": {
		"apiVersion": "0.4.2",
		"depositLimit": "3000000.0",
		"totalAssets": "851655.782895167878223773",
		"availableDepositLimit": "2148344.217104832121776227",
		"pricePerShare": "1.012132673519862183",
		"decimals": 18,
		"activation": 1622471192
	},
	"APY": {
		"week": "1.13%",
		"month": "5.89%",
		"inception": "1.2133%"
	},
	"want": {
		"address": "0x514910771af9ca656af840dff83e8264ecf986ca",
		"symbol": "LINK",
		"cgID": "chainlink"
	}
}
```

## /api/vault
This route is accessible to this URI and gives the details of a specific vault, including APY & strategies.
```
https://ape.tax/api/vault
```

The following options is **mandatory**:
- *address*
  - `?address=0x671a912c10bba0cfa74cfc2d6fba9ba1ed9530b2`

The following options are available:
- *network*
	- `?network=1` for Mainnet (default)
	- `?network=56` for BSC
	- `?network=137` for Polygon
	- `?network=250` for Fantom Opera
	- `?network=42161` for Arbitrum One
- *rpc*
	- `?rpc=YOU_CUSTOM_RPC` to use a specific RPC for this request
- *revalidate*
  - `?revalidate=true` to update the list without the 10mn refresh delay



The returned data is cached for 10 minutes.
This route returns a JSON object with the following structure:
```json
{
	"title": "The Frog Prince 2",
	"logo": "🐸💋",
	"displayName": "🐸💋 The Frog Prince 2",
	"src": "https://ape.tax/frogprince2",
	"status": "endorsed",
	"type": "experimental",
	"address": "0x671a912c10bba0cfa74cfc2d6fba9ba1ed9530b2",
	"network": 1,
	"strategies": [{
		"address": "0xf6D87dFC0841A289614B3d6fdb78D956ebd3cfF0",
		"name": "StrategyLeagueDAOStakingLINK",
		"description": "Supplies LINK to [League Dao](https://dao.leaguedao.com/yield-farming) to earn LEAG. Earned tokens are harvested, sold for more LINK which is deposited back into the strategy."
	}, {
		"address": "0x8198815871a45A5a883d083B7B105927eb9919D8",
		"name": "Vesper LINK",
		"description": "Supplies LINK to [Vesper Finance](https://vesper.finance) to earn VSP. Earned tokens are harvested, sold for more LINK which is deposited back into the strategy."
	}, {
		"address": "0x136fe75bfDf142a917C954F58577DB04ef6F294B",
		"name": "StrategyMakerLINKDAIDelegate",
		"description": "Stakes LINK in [MakerDAO](https://oasis.app/borrow) vault and mints DAI. This newly minted DAI is then deposited into the DAI yVault to generate yield."
	}, {
		"address": "0x906f0a6f23e7160eB0927B0903ab80b5E3f3950D",
		"name": "AaveLenderLINKBorrowerSUSD",
		"description": "Supplies LINK to [AAVE](https://app.aave.com/home) to generate interest and earn staked AAVE tokens. Once unlocked, earned tokens are harvested, sold for more LINK which is deposited back into the strategy. This strategy also borrows tokens against LINK. Borrowed tokens are then deposited into corresponding yVault to generate yield."
	}],
	"data": {
		"apiVersion": "0.4.2",
		"depositLimit": "3000000.0",
		"totalAssets": "851655.782895167878223773",
		"availableDepositLimit": "2148344.217104832121776227",
		"pricePerShare": "1.012132673519862183",
		"decimals": 18,
		"activation": 1622471192
	},
	"APY": {
		"week": "1.13%",
		"month": "5.89%",
		"inception": "1.2133%"
	},
	"want": {
		"address": "0x514910771af9ca656af840dff83e8264ecf986ca",
		"symbol": "LINK",
		"cgID": "chainlink"
	}
}
```


## /api/tvl
This route is accessible to this URI and gives the breakdown of the total value locked of all assets in the network, between Endorsed, Experimental and Deprecated Vaults.
```
https://ape.tax/api/tvl
```

The following options are available:
- *network*
	- `?network=1` for Mainnet (default)
	- `?network=56` for BSC
	- `?network=137` for Polygon
	- `?network=250` for Fantom Opera
	- `?network=42161` for Arbitrum One
- *rpc*
	- `?rpc=YOU_CUSTOM_RPC` to use a specific RPC for this request
- *revalidate*
  - `?revalidate=true` to update the list without the 10mn refresh delay

The returned data is cached for 5 minutes.
This route returns a JSON object with the following structure:
```json
{
	"tvlEndorsed": 2359420184.439323,
	"tvlExperimental": 43318810.89709232,
	"tvlDeprecated": 10637.27189204499,
	"tvl": 2402749632.6083074
}
```

## /api/specificApy
This route is accessible to this URI and gives the APY of a specific Vault, per week, month and inception
```
https://ape.tax/api/specificApy
```

The following options is **mandatory**:
- *address*
  - `?address=0x671a912c10bba0cfa74cfc2d6fba9ba1ed9530b2`

The following options are available:
- *network*
	- `?network=1` for Mainnet (default)
	- `?network=56` for BSC
	- `?network=137` for Polygon
	- `?network=250` for Fantom Opera
	- `?network=42161` for Arbitrum One
- *rpc*
	- `?rpc=YOU_CUSTOM_RPC` to use a specific RPC for this request
- *revalidate*
  - `?revalidate=true` to update the list without the 10mn refresh delay

The returned data is cached for 10 minutes.
This route returns a JSON object with the following structure:
```json
{
	"week": "1.13%",
	"month": "5.89%",
	"inception": "1.2133%",
	"extra": {
		"pricePerShare": "1.012132673519862183",
		"decimals": 18
	}
}
```

