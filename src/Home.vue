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
    div.column.is-one-third.is-half-mobile
      h2(v-show="vaultsInactive.length").title.is-size-4.is-size-6-mobile 🚨 Withdraw
      ul
        li(class="vaultLine" v-for="vault in vaultsInactive")
          a.is-size-6.is-size-7-mobile(class="links" :href="'/' + vault.URL")
            <div class="vault">
              span( class="vaultLogo" v-for="letter in splitLogo(vault.LOGO)")
                <span>{{ letter }}</span>
              <span class="text">{{ vault.TITLE }}</span> 
            </div>
          status-tag(:status="vault.VAULT_STATUS")

</template>

<script>
import GraphemeSplitter from 'grapheme-splitter';
import {ethers} from "ethers";
import StatusTag from "./components/StatusTag";
const splitter = new GraphemeSplitter();

export default {
  name: "Home",
  components: {
    StatusTag,
  },
  props: ["allConfig", "chainId", 'currentAccount'],
  data() {
    return {
      withdrawVaults: [],
      vaultsInactive: [],
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
      const splitted = splitter.splitGraphemes(logo);
      return ([splitted[0], `${splitted.slice(1).join('')}`])
    },
  },
  computed: {
    experimentalVaultsActive() {
      const items = this.items;

      const result = items
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
      const items = this.items;

      const result = items
        .filter((item) =>
          item.CHAIN_ID === this.chainId &&
          item.VAULT_TYPE === "experimental" &&
          item.VAULT_STATUS === "endorsed"
        ).reverse();

      return result;
    },
    weirdVaultsActive() {
      const items = this.items;

      const result = items
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
      const items = this.items;

      const result = items
        .filter((item) => item.CHAIN_ID === this.chainId)
        .filter(
          (item) =>
            item.VAULT_TYPE === "weird" &&
            item.VAULT_STATUS === "endorsed"
        )
        .slice()
        .reverse();

      return result;
    },
  },
  async created() {
    const items = this.items;
    const result = items.filter(item => (item.CHAIN_ID === this.chainId) && (item.VAULT_STATUS === 'withdraw'))
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const currentAccount = '0xeafb3ee25b5a9a1b35f193a4662e3bdba7a95beb' || (await provider.listAccounts())[0];

    const promises = await Promise.all(result.map(async ({VAULT_ADDR}) => {
      const	vaultContract = new ethers.Contract(VAULT_ADDR, ['function balanceOf(address) view returns (uint256)'], provider);
      const balance = await vaultContract.balanceOf(currentAccount);
      return balance.isZero() ? null : VAULT_ADDR;
    }))

    const needToWidthdraw = promises.filter(Boolean);
    this.vaultsInactive = result.filter(item => needToWidthdraw.includes(item.VAULT_ADDR));
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
  margin-left: 16px;
  border-bottom: 1px dotted transparent;
}
.vaultLogo {
  width: 20px;
  text-align: right;
}
.vault > .vaultLogo:first-child {
  text-align: left;
}
</style>
