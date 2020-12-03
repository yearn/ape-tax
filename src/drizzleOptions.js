import config from './config.js'

import ERC20 from './abi/ERC20.json'
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
      contractName: 'Vault', //yvzLOT
      web3Contract: new web3.eth.Contract(yVaultV2, config.VAULT_ADDR)
    },
    {
      contractName: 'WANT', //zLOT
      web3Contract: new web3.eth.Contract(ERC20, config.WANT_ADDR)
    },
    {
      contractName: 'YFI', //YFI to approve bribe
      web3Contract: new web3.eth.Contract(ERC20, "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e")
    },
  ],
  events: {
  },
  polls: {
    accounts: 10000
  }
}

export default options
