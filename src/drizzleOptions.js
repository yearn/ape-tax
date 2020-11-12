import ERC20 from './abi/ERC20.json'
import yVaultV2 from './abi/yVaultV2.json'
import yHegicStrategy from './abi/yHegicStrategy.json'
import HegicStaking from './abi/HegicStaking.json'

import Web3 from 'web3'
let web3 = new Web3(Web3.givenProvider);

const options = {
  web3: {
    block: false,
    fallback: {
      url: 'wss://mainnet.infura.io/ws/v3/afd1f2dfef404bb18cd1490ca0eef832'
    }
  },
  syncAlways: true,
  contracts: [
    {
      contractName: 'yHegicVault',
      web3Contract: new web3.eth.Contract(yVaultV2, "0xbe77b53a165d3109ae9500ebaa9328b577960abf")
    },
    {
      contractName: 'HEGIC',
      web3Contract: new web3.eth.Contract(ERC20, "0x584bc13c7d411c00c01a62e8019472de68768430")
    },
    {
      contractName: 'yHegicStrategyETH',
      web3Contract: new web3.eth.Contract(yHegicStrategy, "0x4141b5e7b687a89d994bff1b35c8082404ca70a7")
    },
    {
      contractName: 'yHegicStrategyWBTC',
      web3Contract: new web3.eth.Contract(yHegicStrategy, "0xaE466D9Cb123E26b369C63ba89F8588be5f19E5b")
    },
    {
      contractName: 'HegicStakingETH',
      web3Contract: new web3.eth.Contract(HegicStaking, "0x1Ef61E3E5676eC182EED6F052F8920fD49C7f69a")
    },
    {
      contractName: 'HegicStakingWBTC',
      web3Contract: new web3.eth.Contract(HegicStaking, "0x840a1AE46B7364855206Eb5b7286Ab7E207e515b")
    },
  ],
  events: {
  },
  polls: {
    accounts: 15000
  }
}

export default options
