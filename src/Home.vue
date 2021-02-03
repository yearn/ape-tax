<template lang="pug">
#home
  h1.title.is-3 Test Vaults Registry
  div.columns
    div.column.is-two-thirds ⚠️ <strong>WARNING</strong> this vaults are experimental. They are extremely risky and will probably be discarded when production ones are deployed. Proceed with caution.
  div.spacer
  div.columns
    div.column.is-one-third
      h2.title.is-4 🚀 Yearn Vaults
      ul
        li(v-for="vault in yearnVaultsActive")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
        li(v-for="vault in yearnVaultsOther")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
    div.column.is-one-third
      h2.title.is-4 🧠 Experiments
      ul
        li(v-for="vault in experimentVaults")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span> 
</template>

<script>
import StatusTag from './components/StatusTag';

import { mapGetters } from "vuex";

export default {
  name: "Home",
  components: {
    StatusTag
  },
  props: ['allConfig'],
  data() {
    return {
    };
  },
  filters: {},
  methods: {},
  computed: {
    yearnVaults() {
      var items = this.allConfig;
  
      var result = Object.keys(items)
        .map(((key) => ({
          ...items[key],
          URL: key
        })))
        .filter(item => item.VAULT_TYPE === 'yearn')
        .slice().reverse()

      return result;
    },
    yearnVaultsActive() {
      var items = this.allConfig;
  
      var result = Object.keys(items)
        .map(((key) => ({
          ...items[key],
          URL: key
        })))
        .filter(item => item.VAULT_TYPE === 'yearn' && item.VAULT_STATUS === 'active')
        .slice().reverse()

      return result;
    },
    yearnVaultsOther() {
      var items = this.allConfig;
  
      var result = Object.keys(items)
        .map(((key) => ({
          ...items[key],
          URL: key
        })))
        .filter(item => 
          item.VAULT_TYPE === 'yearn' 
          && item.VAULT_STATUS != 'active'
          && item.VAULT_STATUS != 'stealth'
        )
        .slice().reverse()

      return result;
    },
    experimentVaults() {
      var items = this.allConfig;
  
      var result = Object.keys(items)
        .map(((key) => ({
          ...items[key],
          URL: key
        })))
        .filter(
          item => item.VAULT_TYPE === 'experiment' 
          && item.VAULT_STATUS != 'stealth'
        )
        .slice().reverse()

      return result;
    }
  },
  created() {},
}
</script>

<style>
ul {
  list-style-type: none;
  padding-left: 0.5em;
  padding-bottom: 0.5em;
}
ul li {
  margin-top: 1em;
  margin-bottom: 1em;
}
div.warning {
  width: 50%;
}
a.links,
a.links:visited,
a.links:hover {
  font-family: IBM Plex Mono,monospace;
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
  text-decoration: none;
}
a.links:hover span.text {
  border-bottom: 1px dotted red;
}
.muted {
  color: gray;
  font-size: 0.8em;
}
.red {
  color: red;
  font-weight: 700;
}
.blue {
  color: blue;
  font-weight: 700;
}
.spacer {
  padding-top: 1em;
  padding-bottom: 1em;
}
</style>