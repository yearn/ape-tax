import WETH from './abi/WETH.json'
import yVaultV2 from './abi/yVaultV2.json'
import yStrategy from './abi/yStrategy.json'

import Web3 from 'web3'
let web3 = new Web3(Web3.givenProvider);

const options = {
  web3: {
    block: false,
  },
  syncAlways: true,
  contracts: [
    {
      contractName: 'WETHVault',
      web3Contract: new web3.eth.Contract(yVaultV2, "0x18c447b7Ad755379B8800F1Ef5165E8542946Afd")
    },
    {
      contractName: 'WETH',
      web3Contract: new web3.eth.Contract(WETH, "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
    },
    {
      contractName: 'StrategyLenderYieldOptimiser',
      web3Contract: new web3.eth.Contract(yStrategy, "0x520a45E22B1eB5D7bDe09A445e70708d2957B365")
    },
    {
      contractName: 'yvDAI',
      web3Contract: new web3.eth.Contract(yVaultV2, "0x1b048bA60b02f36a7b48754f4edf7E1d9729eBc9")
    },
  ],
  events: {
  },
  polls: {
    accounts: 10000
  }
}

export default options
