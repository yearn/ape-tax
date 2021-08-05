<template lang="pug">
#home
  h1.title.is-3.is-hidden-mobile Experimental Experiments Registry
  h1.title.is-3.is-hidden-tablet Ex<sup>2</sup> Registry
  div.container.is-max-desktop.warning.is-size-7-mobile ⚠️ <strong>WARNING</strong> this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution.
  div.columns
    div.column.is-one-third.is-half-mobile
      h2(v-show="experimentalVaultsActive.length || experimentalVaultsOther.length").title.is-size-4.is-size-6-mobile 🚀 Experimental
      ul
        li(class="vaultLine" v-for="vault in [...experimentalVaultsActive, ...experimentalVaultsOther]")
          a.is-size-6.is-size-7-mobile(class="links" :href="'/' + vault.URL")
            <div class="vault">
              span( class="vaultLogo" v-for="letter in splitLogo(vault.LOGO)")
                <span>{{ letter }}</span>
              <span class="text">{{ vault.TITLE }}</span>
            </div>
          status-tag(:status="vault.VAULT_STATUS")
    div.column.is-one-third.is-half-mobile
      h2(v-show="weirdVaultsActive.length").title.is-size-4.is-size-6-mobile 🧠 Weird
      ul
        li(class="vaultLine" v-for="vault in [...weirdVaultsActive, ...weirdVaultsOther]")
          a.is-size-6.is-size-7-mobile(class="links" :href="'/' + vault.URL")
            <div class="vault">
              span( class="vaultLogo" v-for="letter in splitLogo(vault.LOGO)")
                <span>{{ letter }}</span>
              <span class="text">{{ vault.TITLE }}</span> 
            </div>
          status-tag(:status="vault.VAULT_STATUS")

</template>

<script>
import StatusTag from "./components/StatusTag";
import GraphemeSplitter from 'grapheme-splitter';
const splitter = new GraphemeSplitter();

export default {
  name: "Home",
  components: {
    StatusTag,
  },
  props: ["allConfig", "chainId"],
  data() {
    return {
      items: Object.keys(this.allConfig)
        .map((key) => ({
          ...this.allConfig[key],
          URL: key,
        })),
    };
  },
  filters: {},
  methods: {
    splitLogo(logo) {
      return splitter.splitGraphemes(logo);
    },
  },
  computed: {
    experimentalVaultsActive() {
      var items = this.items;

      var result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "experimental" && (item.VAULT_STATUS === "active" || item.VAULT_STATUS === "new")
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
            item.VAULT_STATUS != "new" &&
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
            item.VAULT_TYPE === "weird" && (item.VAULT_STATUS === "active" || item.VAULT_STATUS === "new")
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
            item.VAULT_STATUS != "new" &&
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
div.endorsed {
  color: white !important;
  background-color: #0657F9 !important;
}
div.endorsed strong{
  color: white !important;
}
a.links,
a.links:visited,
a.links:hover {
  font-family: IBM Plex Mono, monospace;
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
.vaultLine {
  display: flex;
  align-items: center;
}
.vault {
  display: flex;
  align-items: center;
  width: 100%;
}
.text {
  margin-left: 8px;
  border-bottom: 1px dotted transparent;
}
.vaultLogo {
  width: 20px;
}
.vault > .vaultLogo:first-child {
  text-align: left;
}
.vault > .vaultLogo:last-child {
  text-align: right;
}
</style>
