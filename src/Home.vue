<template lang="pug">
#home
  h1.title.is-3 Experimental Experiments Registry
  div.columns
    div.column.is-two-thirds.warning ⚠️ <strong>WARNING</strong> this vaults are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution.
  div.columns
    div.column.is-one-third
      h2(v-show="yearnVaultsActive.length || yearnVaultsOther.length").title.is-4 🚀 Experimental
      ul
        li(v-for="vault in yearnVaultsActive")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
        li(v-for="vault in yearnVaultsOther")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
    div.column.is-one-third
      h2(v-show="experimentVaultsActive.length").title.is-4 🧠 Weird
      ul
        li(v-for="vault in experimentVaultsActive")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span> 
          status-tag(:status="vault.VAULT_STATUS")
        li(v-for="vault in experimentVaultsOther")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")

</template>

<script>
import StatusTag from "./components/StatusTag";

import { mapGetters } from "vuex";

export default {
  name: "Home",
  components: {
    StatusTag,
  },
  props: ["allConfig", "chainId", "chainCoin"],
  data() {
    return {
      items: Object.keys(this.allConfig)
        .map((key) => ({
          ...this.allConfig[key],
          URL: key,
        }))
    };
  },
  filters: {},
  methods: {},
  computed: {
    ...mapGetters('drizzle', ['drizzleInstance']),
    yearnVaults() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter((item) => item.VAULT_TYPE === "yearn")
        .slice()
        .reverse();

      return result;
    },
    yearnVaultsActive() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "yearn" && item.VAULT_STATUS === "active"
        )
        .slice()
        .reverse();

      return result;
    },
    yearnVaultsOther() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "yearn" &&
            item.VAULT_STATUS != "active" &&
            item.VAULT_STATUS != "stealth"
        )
        .slice()
        .reverse();

      return result;
    },
    experimentVaultsActive() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "experiment" && item.VAULT_STATUS === "active"
        )
        .slice()
        .reverse();

      return result;
    },
    experimentVaultsOther() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "experiment" &&
            item.VAULT_STATUS != "active" &&
            item.VAULT_STATUS != "stealth"
        )
        .slice()
        .reverse();

      return result;
    },
  },
};
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
  margin-top: 1em;
  margin-bottom: 1em;
  background-color: #fff257;
}
a.links,
a.links:visited,
a.links:hover {
  font-family: IBM Plex Mono, monospace;
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
