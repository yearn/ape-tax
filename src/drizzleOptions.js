import ERC20 from './abi/ERC20.json'
import yVaultV2 from './abi/yVaultV2.json'
import yStrategy from './abi/yStrategy.json'
import GuestList from './abi/GuestList.json'

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
      web3Contract: new web3.eth.Contract(ERC20, "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
    },
    {
      contractName: 'StrategyLenderYieldOptimiser',
      web3Contract: new web3.eth.Contract(yStrategy, "0x520a45E22B1eB5D7bDe09A445e70708d2957B365")
    },
    {
      contractName: 'yvDAI',
      web3Contract: new web3.eth.Contract(yVaultV2, "0x1b048bA60b02f36a7b48754f4edf7E1d9729eBc9")
    },
    {
      contractName: 'GuestList',
      web3Contract: new web3.eth.Contract(GuestList, "0x1403eea5fff87253658d755030a73dfbca2993ab")
    },
  ],
  events: {
  },
  polls: {
    accounts: 10000
  }
}

export default options
