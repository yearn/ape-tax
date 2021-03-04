<template lang="pug">
  div(v-if="isDrizzleInitialized && chainId", id="app")
    .chain {{ chainName }}
    .section
      Section(:config="config" :allConfig="allConfig" :chainId="chainId" :chainCoin="chainCoin" :chainExplorer="chainExplorer")
  div(v-else)
    div Loading Ex<sup>2</sup> 🧪...
</template>

<script>
import config from './config.js'
import chains from './chains.json'
import Vault from './Vault'
import LidoVault from './LidoVault'
import stETHLPVault from './stETHLPVault'
import Home from './Home'
import NotFound from './NotFound'
import { mapGetters } from 'vuex'
import Web3 from 'web3';

const vaultPath = window.location.pathname.substring(1)
const vaultConfig = config[vaultPath] || null;

let VaultType;

switch (window.location.pathname) {
  case '/yvsteth':
    VaultType = LidoVault;
    break;
  case '/stecrv':
    VaultType = stETHLPVault;
    break;
  default:
    VaultType = Object.prototype.hasOwnProperty.call(config, vaultPath) ? Vault : NotFound;
}

/*
const VaultType = window.location.pathname === '/yvsteth' ? LidoVault : (
  Object.prototype.hasOwnProperty.call(config, vaultPath) ? Vault : NotFound
)
*/

const Section = window.location.pathname === '/' ? Home : VaultType

let web3 = new Web3(Web3.givenProvider);
window.ethereum.on("chainChanged", (chainIdHex) =>
  window.location.reload()
);


export default {
  name: 'app',
  components: {
    Section,
  },
  data() {
    return {
      config: vaultConfig,
      allConfig: config,
      isHome: window.location.pathname === '/',
    }
  },
  asyncComputed: {
    ...mapGetters('drizzle', ['isDrizzleInitialized', 'drizzleInstance']),
    chainId() {
      if (this.isDrizzleInitialized) {
        return this.drizzleInstance.web3.eth.getChainId();
      }
      return 0
    },
    chainName() {
      if (this.chainId) {
        return chains[this.chainId].name;
      }
    },
    chainCoin() {
      if (this.chainId) {
        return chains[this.chainId].coin;
      }
    },
    chainExplorer() {
      if (this.chainId) {
        return chains[this.chainId].block_explorer;
      }
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap');

#app {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
  margin-top: 0px;
}
.section {
  padding: 1rem !important;
}
.chain {
  position: absolute;
  top: 5px;
  right: 20px;
  font-size: 20px;
}
body, button, input, optgroup, select, textarea {
  font-family: 'IBM Plex Mono', monospace !important;
}

.control .unstyled {
  margin-left: 0.5em;
}

button.unstyled {
  margin-right: 0.5em;
  height: 2.5em;
  line-height: 1.5;
  font-size: 0.75rem
}

.logo {
  font-size: 80px;
}

.column {
  float: left;
  width: 40%;
}

.column-sm {
  float: left;
  width: 25%;
  margin-right: 1%;
}

.warning {
  font-size: 13px;
}

.row:after {
  content: "";
  display: table;
  clear: both;
}
</style>
