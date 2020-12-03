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
      web3Contract: new web3.eth.Contract(yVaultV2, "0xCA6C9fB742071044247298Ea0dBd60b77586e1E8")
    },
    {
      contractName: 'WANT', //zLOT
      web3Contract: new web3.eth.Contract(ERC20, "0xA8e7AD77C60eE6f30BaC54E2E7c0617Bd7B5A03E")
    },
    {
      contractName: 'YFI',
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
