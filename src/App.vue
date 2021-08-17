<template lang="pug">
  #app
    div(v-konami @konami="showApeTax = !showApeTax")
    div(v-if="showApeTax")
      div.apeTax
    div(v-else)
      div(v-if="isDrizzleInitialized && chainId", id="app")
        .chain
          select.is-size-5.is-size-6(v-model="selectedChainId" @change="changeNetwork($event)")
            option(v-for="(chain, id) in chains" :value="id" :key="id") {{ chain.name }}
          .chain_status.is-size-6.is-size-7-mobile(v-if="chainId != selectedChainId") CHANGE METAMASK NETWORK
        .section
          Section(:config="config" :allConfig="allConfig" :chainId="selectedChainId" :chainCoin="chainCoin" :chainExplorer="chainExplorer")
      div(v-else)
        div Loading Ex<sup>2</sup> 🧪...
</template>

<script>
import config from './vaults.json';
import chains from './chains.json';
import Vault from './Vault';
import LidoVault from './LidoVault';
import stETHLPVault from './stETHLPVault';
import Home from './Home';
import NotFound from './NotFound';
import {mapGetters} from 'vuex';
import Web3 from 'web3';

const vaultPath = window.location.pathname.substring(1);
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

const Section = window.location.pathname === '/' ? Home : VaultType;

let web3 = new Web3(Web3.givenProvider);
window.ethereum.on('chainChanged', () => {
	window.location.reload();
}
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
			showApeTax: false,
			chains: chains,
			selectedChainId: null,
		};
	},
	asyncComputed: {
		...mapGetters('drizzle', ['isDrizzleInitialized', 'drizzleInstance']),
		chainId() {
			if (this.isDrizzleInitialized) {
				return this.drizzleInstance.web3.eth.getChainId();
			}
			return 0;
		},
		chainName() {
			if (this.chainId) {
				return chains[this.selectedChainId].name;
			}
		},
		chainCoin() {
			if (this.chainId) {
				return chains[this.selectedChainId].coin;
			}
		},
		chainExplorer() {
			if (this.chainId) {
				return chains[this.selectedChainId].block_explorer;
			}
		}
	},
	methods: {
		async changeNetwork(event) {
			this.selectedChainId = parseInt(event.target.value);
		},
	},
	async created() {
		this.selectedChainId = await web3.eth.getChainId();
	}
};
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
  font-size: 1.2rem;
  text-align: right;
}

.chain_status {
  color: red;
  font-size: 0.1rem;
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
  font-size: 5rem;
}

.grid {
  display: grid;
}
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.col-span-1 {
  grid-column: span 1 / span 1;
}
.col-span-2 {
  grid-column: span 2 / span 2;
}
.max-w-5xl {
	max-width: 64rem;
}
@media (min-width: 640px) {
  .xs-col-span-1 {
    grid-column: span 1 / span 1;
  }
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
  font-size: 0.8rem;
}

.row:after {
  content: "";
  display: table;
  clear: both;
}

.apeTax {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: url(assets/splash_apetax.png);
  background-size: cover;
  background-color: purple;
}
</style>
