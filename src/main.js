import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'

import config from './config.js'
import drizzleVuePlugin from '@drizzle/vue-plugin'
import drizzleOptions from './drizzleOptions'
import VueKonami from 'vue-konami'
import AsyncComputed from 'vue-async-computed'

import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(Buefy, {
  defaultUseHtml5Validation: false,
})

Vue.use(VueKonami)

Vue.use(Vuex)
Vue.use(AsyncComputed)

const store = new Vuex.Store({ state: {} })

const vaultPath = window.location.pathname.substring(1)
const vaultConfig = config[vaultPath] || null;
console.log(drizzleOptions(vaultConfig));
Vue.use(drizzleVuePlugin, { store, drizzleOptions: drizzleOptions(vaultConfig) })

Vue.config.productionTip = false

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')