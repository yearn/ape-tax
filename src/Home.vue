<template lang="pug">
#home
  h1.title.is-3.is-hidden-mobile Experimental Experiments Registry
  h1.title.is-3.is-hidden-tablet Ex<sup>2</sup> Registry
  
  //---------------------------------------------------------------------------
  //- Disclaimer message. For you in the code. This project is amazing because
  //- it's the frontline of the vaults and the strategies in DEFI. But the
  //- front line could have some issue when it come to survival. Have fun !
  //---------------------------------------------------------------------------
  div.max-w-5xl.warning.is-size-7-mobile ⚠️ <strong>WARNING</strong> this experiments are experimental. They are extremely risky and will probably be discarded when the test is over. There's a good chance that you can lose your funds. If you choose to proceed, do it with extreme caution.
  
  //---------------------------------------------------------------------------
  //- Inactive vault alert banner. This will only be displayed if the user has
  //- funds in a `withdraw` vault.
  //---------------------------------------------------------------------------
  div(v-show="vaultsInactive.length")
    div.max-w-5xl.withdraw.is-size-7-mobile.pb-0 🚨 <strong>YOU ARE USING DEPRECATED VAULTS</strong> You have funds in deprecated vaults. Theses vaults are no longer generating any profit and are now an image from the past. Please remove your funds from these vaults.
      div.mt-4
        ul.grid.grid-cols-2
          li.vaultLine.xs-col-span-1.col-span-2(v-for="vault in vaultsInactive")
            a.is-size-6.is-size-7-mobile(class="links" :href="'/' + vault.URL")
              <div class="vault">
                span( class="vaultLogo" v-for="letter in splitLogo(vault.LOGO)")
                  <span>{{ letter }}</span>
                <span class="text">{{ vault.TITLE }}</span> 
              </div>
  
  //---------------------------------------------------------------------------
  //- This section will display the vaults in two columns. The left column will
  //- display the 'normal' vaults, and the right one the 'weird' vaults.
  //---------------------------------------------------------------------------
  section.max-w-5xl.grid.grid-cols-2
    div.xs-col-span-1.col-span-2.mb-4
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
    div.xs-col-span-1.col-span-2
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
import GraphemeSplitter from 'grapheme-splitter';
import {ethers} from 'ethers';
import StatusTag from './components/StatusTag';
const splitter = new GraphemeSplitter();

export default {
	name: 'Home',
	components: {StatusTag},
	props: ['allConfig', 'chainId', 'currentAccount'],
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
			return ([splitted[0], `${splitted.slice(1).join('')}`]);
		},
	},
	computed: {
		experimentalVaultsActive() {
			const items = this.items;

			const result = items
				.filter((item) =>
					item.CHAIN_ID === this.chainId &&
          item.VAULT_TYPE === 'experimental' && (item.VAULT_STATUS === 'active' || item.VAULT_STATUS === 'new')
				).reverse();

			return result;
		},
		experimentalVaultsOther() {
			const items = this.items;

			const result = items
				.filter((item) =>
					item.CHAIN_ID === this.chainId &&
          item.VAULT_TYPE === 'experimental' &&
          item.VAULT_STATUS === 'endorsed'
				).reverse();

			return result;
		},
		weirdVaultsActive() {
			const items = this.items;

			const result = items
				.filter((item) =>
					item.CHAIN_ID === this.chainId &&
          item.VAULT_TYPE === 'weird' && (item.VAULT_STATUS === 'active' || item.VAULT_STATUS === 'new')
				).reverse();

			return result;
		},
		weirdVaultsOther() {
			const items = this.items;

			const result = items
				.filter((item) =>
					item.CHAIN_ID === this.chainId &&
          item.VAULT_TYPE === 'weird' &&
          item.VAULT_STATUS === 'endorsed'
				).reverse();

			return result;
		},
	},
	async created() {
		const items = this.items;
		const result = items.filter(item => (item.CHAIN_ID === this.chainId) && (item.VAULT_STATUS === 'withdraw'));
		const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
		const currentAccount = (await provider.listAccounts())[0];

		const promises = await Promise.all(result.map(async ({VAULT_ADDR}) => {
			const	vaultContract = new ethers.Contract(VAULT_ADDR, ['function balanceOf(address) view returns (uint256)'], provider);
			const balance = await vaultContract.balanceOf(currentAccount);
			return balance.isZero() ? null : VAULT_ADDR;
		}));

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
div.withdraw {
  margin-top: 1rem !important;
  margin-bottom: 2rem !important;
  margin-left: 0 !important;
  padding: 1rem;
  background-color: #EF4444;
  color: white !important;
}
div.withdraw strong{
  color: white !important;
}
div.withdraw > .columns {
  margin-top: 0rem;
}
div.withdraw .text{
  color: white !important;
}
div.withdraw .vaultLogo{
  color: white !important;
}
div.withdraw a.links:hover span.text {
  border-bottom: 1px dotted white !important;
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
.grid > .vaultLine {
  margin-top: 0;
  margin-bottom: 1rem;
}
</style>
