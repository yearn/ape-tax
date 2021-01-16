<template lang="pug">
  div(v-if="isDrizzleInitialized || isHome", id="app")
    .section
      Section(:config="config" :allConfig="allConfig")
  div(v-else)
    div Loading yApp...
</template>

<script>
import config from './config.js'
import Vault from './Vault'
import LidoVault from './LidoVault'
import stETHLPVault from './stETHLPVault'
import Home from './Home'
import NotFound from './NotFound'
import { mapGetters } from 'vuex'

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
  computed: mapGetters('drizzle', ['isDrizzleInitialized'])
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
