<template lang="pug">
  div(v-if="isDrizzleInitialized", id="app")
    .logo {{ config.LOGO }}
    .section
      Component(:config="config")
  div(v-else)
    div Loading yApp...
</template>

<script>
import config from './config.js'
import Vault from './Vault'
import { mapGetters } from 'vuex'

// TODO: change to custom home and not found
const NotFound = { template: '<p>Page not found</p>' }
const Home = { template: '<p>Welcome</p>' }

const vaultPath = window.location.pathname.substring(1)
const vaultConfig = config[vaultPath] || null;

const Component = window.location.pathname === '/' ? Home : (
  Object.prototype.hasOwnProperty.call(config, vaultPath) ? Vault : NotFound
)

export default {
  name: 'app',
  components: {
    Component,
  },
  data() {
    return {
      config: vaultConfig,
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
  margin-top: 60px;
}

.logo {
  font-size: 100px;
}
</style>
