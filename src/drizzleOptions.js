import ERC20 from './abi/ERC20.json'
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider);

const options = (config) => ({
  web3: {
    block: false,
  },
  syncAlways: true,
  contracts: config !== null ? [
    {
      contractName: 'Vault', //yvzLOT
      web3Contract: new web3.eth.Contract(config.VAULT_ABI, config.VAULT_ADDR)
    },
    {
      contractName: 'WANT', //zLOT
      web3Contract: new web3.eth.Contract(ERC20, config.WANT_ADDR)
    },
    {
      contractName: 'YFI', //YFI to approve bribe
      web3Contract: new web3.eth.Contract(ERC20, "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e")
    },
  ] : [],
  events: {
  },
  polls: {
    accounts: 10000
  }
})

export default options
