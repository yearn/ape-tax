import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'

import config from './config.js'
import drizzleVuePlugin from '@drizzle/vue-plugin'
import drizzleOptions from './drizzleOptions'
import VueKonami from 'vue-konami'

Vue.use(VueKonami)

Vue.use(Vuex)
const store = new Vuex.Store({ state: {} })

const vaultPath = window.location.pathname.substring(1)
const vaultConfig = config[vaultPath] || null;

Vue.use(drizzleVuePlugin, { store, drizzleOptions: drizzleOptions(vaultConfig) })

Vue.config.productionTip = false

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')