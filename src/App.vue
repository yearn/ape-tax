<template lang="pug">
  div(v-if="isDrizzleInitialized", id="app")
    .logo 🦧👱‍♂️
    .section
      Vault
  div(v-else)
    div Loading yApp...
</template>

<script>
import Vault from './Vault'
import { mapGetters } from 'vuex'

export default {
  name: 'app',
  components: {
    Vault,
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
