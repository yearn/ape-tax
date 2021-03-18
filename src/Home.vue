<template lang="pug">
#home
  h1.title.is-3.is-hidden-mobile Experimental Experiments Registry
  h1.title.is-3.is-hidden-tablet Ex<sup>2</sup> Registry
  div.container.is-max-desktop.warning.is-size-7-mobile ⚠️ <strong>WARNING</strong> this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution.
  div.columns
    div.column.is-one-third.is-half-mobile
      h2(v-show="experimentalVaultsActive.length || experimentalVaultsOther.length").title.is-size-4.is-size-6-mobile 🚀 Experimental
      ul
        li.is-size-6.is-size-7-mobile(v-for="vault in experimentalVaultsActive")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
        li.is-size-6.is-size-7-mobile(v-for="vault in experimentalVaultsOther")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span>
          status-tag(:status="vault.VAULT_STATUS")
    div.column.is-one-third.is-half-mobile
      h2(v-show="weirdVaultsActive.length").title.is-size-4.is-size-6-mobile 🧠 Weird
      ul
        li.is-size-6.is-size-7-mobile(v-for="vault in weirdVaultsActive")
          a( class="links" :href="'/' + vault.URL") {{ vault.LOGO }} <span class="text">{{ vault.TITLE }}</span> 
          status-tag(:status="vault.VAULT_STATUS")
        li.is-size-6.is-size-7-mobile(v-for="vault in weirdVaultsOther")
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
    experimentalVaults() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter((item) => item.VAULT_TYPE === "experimental")
        .slice()
        .reverse();

      return result;
    },
    experimentalVaultsActive() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "experimental" && item.VAULT_STATUS === "active"
        )
        .slice()
        .reverse();

      return result;
    },
    experimentalVaultsOther() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "experimental" &&
            item.VAULT_STATUS != "active" &&
            item.VAULT_STATUS != "stealth"
        )
        .slice()
        .reverse();

      return result;
    },
    weirdVaultsActive() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "weird" && item.VAULT_STATUS === "active"
        )
        .slice()
        .reverse();

      return result;
    },
    weirdVaultsOther() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "weird" &&
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
  padding-left: 0.5rem;
  padding-bottom: 0.5rem;
}
ul li {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
div.warning {
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
  margin-left: 0 !important;
  padding: 1rem;
  background-color: #fff257;
}
a.links,
a.links:visited,
a.links:hover {
  font-family: IBM Plex Mono, monospace;
/*  font-size: 1rem;*/
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
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
