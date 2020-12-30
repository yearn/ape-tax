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
import Home from './Home'
import NotFound from './NotFound'
import { mapGetters } from 'vuex'

const vaultPath = window.location.pathname.substring(1)
const vaultConfig = config[vaultPath] || null;

const VaultType = window.location.pathname === '/yvsteth' ? LidoVault : (
  Object.prototype.hasOwnProperty.call(config, vaultPath) ? Vault : NotFound
)

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
  font-size: 14px;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
  margin-top: 20px;
}

.logo {
  font-size: 80px;
}
</style>
