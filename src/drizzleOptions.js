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
      contractName: 'Vault', //nTrumpVault
      web3Contract: new web3.eth.Contract(yVaultV2, "0xba81fb02d5e7b94b341e82d1959c372590b852be")
    },
    {
      contractName: 'WANT', //DAI
      web3Contract: new web3.eth.Contract(ERC20, "0x6B175474E89094C44Da98b954EedeAC495271d0F")
    },
    {
      contractName: 'Strategy',
      web3Contract: new web3.eth.Contract(yStrategy, "0xAD97639b0a94549E9391C20D5cAD0d52be96A383")
    },
  ],
  events: {
  },
  polls: {
    accounts: 10000
  }
}

export default options
