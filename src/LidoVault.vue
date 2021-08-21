<template lang="pug">
#vault(v-if="isDrizzleInitialized")
  .logo {{ config.LOGO }}
  h1.title.is-3 {{ config.TITLE }}
  div.columns
    div.column.is-one-quarter ⚠️ <strong>WARNING</strong> this experiment is experimental. They are extremely risky and will probably be discarded when the test is over. Proceed with caution.
    div.column.is-one-quarter 📢 <strong>DISCLAIMER</strong> When you transfer and deposit, your ETH will be converted into stETH 1:1 and deposit in the vault. You will not be able to redeem stETH for ETH until txs are enables in ETH2.0.
  div Vault:&nbsp;
    a(
      :href="'https://etherscan.io/address/' + config.VAULT_ADDR + '#code'",
      target="_blank"
    ) 📃Contract
  div Version: {{ vault_version }}
  div {{ config.WANT_SYMBOL }} price (CoinGecko 🦎): {{ want_price | toCurrency(4) }}
  div Deposit Limit: ♾️ {{ config.WANT_SYMBOL }}
  div Total Assets: {{ vault_total_assets | fromWei(2, vault_decimals) }} {{ config.WANT_SYMBOL }}
  div Total AUM: {{ vault_total_aum | toCurrency(2, vault_decimals) }}
  div.spacer
  div Price Per Share: {{ vault_price_per_share | fromWei(8, vault_decimals) }}
  div Available limit: ♾️ {{ config.WANT_SYMBOL }}
  div.spacer
  h2.title.is-4 <strong>Wallet</strong>
  div Your Account: <strong>{{ username || activeAccount }}</strong>
  div Your Vault shares: {{ yvtoken_balance | fromWei(2, vault_decimals) }}
  div Your {{ config.WANT_SYMBOL }} Balance: {{ want_balance | fromWei(2, vault_decimals) }}
  div Your ETH Balance: {{ eth_balance | fromWei(2) }}
  div.spacer
  span <strong>You are a guest. Welcome to the <span class="blue">Citadel</span> 🏰</strong>
  div.spacer 
  b-field(label="Amount", custom-class="is-small", v-if="vault_available_limit > 0")
    b-input(v-model.number="amount", size="is-small", type="number", min=0)
    p.control
      b-button.is-static(size="is-small") ETH

      button.unstyled(
      v-if="vault_available_limit > 0",
      @click.prevent="on_deposit"
      ) 🏦 Deposit ETH


  b-field(label="Amount", custom-class="is-small", v-if="vault_available_limit > 0")
    b-input(v-model.number="amount_steth", size="is-small", type="number", min=0)
    p.control
      b-button.is-static(size="is-small") stETH

      button.unstyled(
      v-if="vault_available_limit > 0",
      :disabled="has_allowance_vault",
      @click.prevent="on_approve_vault"
      ) {{ has_allowance_vault ? '✅ Approved' : '🚀 Approve stETH' }}
      button.unstyled(
      v-if="vault_available_limit > 0",
      :disabled="!has_allowance_vault",
      @click.prevent="on_deposit_steth"
      ) 🏦 Deposit stETH

  div.spacer

  button.unstyled(:disabled="!has_yvtoken_balance", @click.prevent="on_withdraw_all") 💸 Withdraw All
  .red(v-if="error")
    span {{ error }}
  div.spacer
    .muted
      span Made with 💙
      | 
      span yVault:
      |
      a(:href="'https://twitter.com/' + config.VAULT_DEV", target="_blank") {{ config.VAULT_DEV }}
      | 
      span - UI:
      |
      a(href="https://twitter.com/fameal", target="_blank") fameal
      |, 
      a(href="https://twitter.com/emilianobonassi", target="_blank") emilianobonassi
      |, 
      a(href="https://twitter.com/vasa_develop", target="_blank") vasa
div(v-else)
  div Loading yApp...
</template>

<script>

import {mapGetters} from 'vuex';
import {ethers} from 'ethers';
import axios from 'axios';
import LidoVault from './abi/LidoVault.json';
import Web3 from 'web3';

let web3 = new Web3(Web3.givenProvider);

const max_uint = ethers.constants.MaxUint256;
const ERROR_NEGATIVE = 'You have to deposit a positive number of tokens 🐀';
const ERROR_NEGATIVE_ALL = "You don't have tokens to deposit 🐀";
const ERROR_NEGATIVE_WITHDRAW = "You don't have any vault shares";

export default {
	name: 'Vault',
	components: {},
	props: ['config'],
	data() {
		return {
			username: null,
			want_price: 0,
			amount: 0,
			amount_steth: 0,
			strategies: [],
			strategies_balance: 0,
			average_price: 0,
			error: null,
			contractGuestList: null,
			is_guest: false,
			entrance_cost: ethers.BigNumber.from('1'),
			total_yfi: ethers.BigNumber.from('0'),
			bribe_unlocked: false,
			bribe_cost: ethers.BigNumber.from('0'),
			vault_activation: 0,
			roi_week: 0,
		};
	},
	filters: {
		fromWei(data, precision, decimals) {
			if (decimals === undefined) decimals = 18;
			if (data === 'loading') return data;
			if (data > 2 ** 255) return '♾️';
			let value = ethers.utils.commify(ethers.utils.formatUnits(data, decimals));
			let parts = value.split('.');

			if (precision === 0) return parts[0];

			return parts[0] + '.' + parts[1].slice(0, precision);
		},
		toPct(data, precision) {
			if (isNaN(data)) return '-';
			return `${(data * 100).toFixed(precision)}%`;
		},
		toCurrency(data, precision) {
			if ( !data ) return '-';
      
			if (typeof data !== 'number') {
				data = parseFloat(data);
			}
			var formatter = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: precision,
			});
			return formatter.format(data);
		},
	},
	methods: {
		on_approve_vault() {
			this.drizzleInstance.contracts['WANT'].methods['approve'].cacheSend(
				this.vault,
				max_uint,
				{from: this.activeAccount}
			);
		},
		on_approve_bribe() {
			this.drizzleInstance.contracts['YFI'].methods['approve'].cacheSend(
				this.vault,
				max_uint,
				{from: this.activeAccount}
			);
		},
		on_deposit() {
			this.error = null;

			if (this.amount <= 0) {
				this.error = ERROR_NEGATIVE;
				this.amount = 0;
				return;
			}

			this.drizzleInstance.web3.eth.sendTransaction(
				{
					from: this.activeAccount,
					to: this.vault,
					value: ethers.utils.parseEther(this.amount.toString()).toString()
				}
			);
		},
		on_deposit_steth() {
			this.error = null;

			if (this.amount_steth <= 0) {
				this.error = ERROR_NEGATIVE;
				this.amount_steth = 0;
				return;
			}

			this.drizzleInstance.contracts['Vault'].methods['deposit'].cacheSend(
				ethers.utils.parseUnits(this.amount_steth.toString(), this.vault_decimals).toString(),
				{
					from: this.activeAccount,
				}
			);
		},
		on_deposit_all() {
			if (this.want_balance <= 0) {
				this.error = ERROR_NEGATIVE_ALL;
				this.amount = 0;
				return;
			}

			this.drizzleInstance.contracts['Vault'].methods['deposit'].cacheSend({
				from: this.activeAccount,
			});
		},
		on_withdraw_all() {
			if (this.yvtoken_balance <= 0) {
				this.error = ERROR_NEGATIVE_WITHDRAW;
				this.amount = 0;
				return;
			}
			this.drizzleInstance.contracts['Vault'].methods['withdraw'].cacheSend({
				from: this.activeAccount,
			});
		},
		async load_reverse_ens() {
			let lookup = this.activeAccount.toLowerCase().substr(2) + '.addr.reverse';
			let resolver = await this.drizzleInstance.web3.eth.ens.resolver(lookup);
			let namehash = ethers.utils.namehash(lookup);
			this.username = await resolver.methods.name(namehash).call();
		},
		get_block_timestamp(timestamp) {
			return axios.get(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=JXRIIVMTAN887F9D7NCTVQ7NMGNT1A4KA3`);      
		},
		call(contract, method, args, out = 'number') {
			let key = this.drizzleInstance.contracts[contract].methods[
				method
			].cacheCall(...args);
			let value;
			try {
				value = this.contractInstances[contract][method][key].value;
			} catch (error) {
				value = null;
			}
			switch (out) {
			case 'number':
				if (value === null) value = 0;
				return ethers.BigNumber.from(value);
			case 'address':
				return value;
			default:
				return value;
			}
		},
	},
	computed: {
		...mapGetters('accounts', ['activeAccount', 'activeBalance']),
		...mapGetters('drizzle', ['drizzleInstance', 'isDrizzleInitialized']),
		...mapGetters('contracts', ['getContractData', 'contractInstances']),

		user() {
			return this.activeAccount;
		},
		vault() {
			return this.drizzleInstance.contracts['Vault'].address;
		},
		vault_version() {
			return this.call('Vault', 'version', [], 'string');
		},
		vault_total_assets() {
			return this.call('Vault', 'totalSupply', []);
		},
		vault_total_aum() {
			let toFloat = ethers.BigNumber.from(10).pow(this.vault_decimals.sub(2)).toString();
			let numAum = this.vault_total_assets.div(toFloat).toNumber();
			return (numAum / 100) * this.want_price;
		},
		vault_price_per_share() {
			return this.call('Vault', 'pricePerShare', []);
		},
		vault_decimals() {
			return this.call('Vault', 'decimals', []);
		},
		vault_available_limit() {
			return max_uint;
		},
		yvtoken_balance() {
			return this.call('Vault', 'balanceOf', [this.activeAccount]);
		},
		want_balance() {
			return this.call('WANT', 'balanceOf', [this.activeAccount]);
		},
		eth_balance() {
			return this.activeBalance;
		},
		yfi_needed() {
			return this.entrance_cost.sub(this.total_yfi);
		},
		has_allowance_vault() {
			return !this.call('WANT', 'allowance', [
				this.activeAccount,
				this.vault,
			]).isZero();
		},
		has_yvtoken_balance() {
			return this.yvtoken_balance > 0;
		},
	},
	async created() {
		axios
			.get(
				'https://api.coingecko.com/api/v3/simple/price?ids=' +
          this.config.COINGECKO_SYMBOL.toLowerCase() +
          '&vs_currencies=usd'
			)
			.then((response) => {
				this.want_price = response.data[this.config.COINGECKO_SYMBOL.toLowerCase()].usd;
			});

		//Active account is defined?
		if (this.activeAccount !== undefined) this.load_reverse_ens();

		let Vault = new web3.eth.Contract(LidoVault, this.vault);

		// Get blocknumber and calc APY
		Vault.methods.pricePerShare().call().then( currentPrice => {
			const seconds_in_a_year = 31536000;
			const now = Math.round(Date.now() / 1000);

			// 1 week ago
			const blockActivated = 1606599919;
			const one_week_ago = (now - 60 * 60 * 24 * 7);
			const ts_past = one_week_ago < blockActivated?blockActivated:one_week_ago;

			const ts_diff = now - ts_past;

			console.log('TS Past: ' + one_week_ago);
			console.log('TS Activation: ' + blockActivated);

			this.get_block_timestamp(ts_past).then(response => {
				console.log('Past block: ' + response.data.result);
				Vault.methods.pricePerShare().call({}, response.data.result).then( pastPrice => {
					let roi = (currentPrice / pastPrice - 1) * 100;
					console.log('Current Price: ' + currentPrice);
					console.log('Past Price: ' + pastPrice);
					this.roi_week = roi/ts_diff*seconds_in_a_year;
					console.log('ROI week: ' + roi);
					console.log('ROI year: ' + this.roi_week);
				});
			});
		});

		// Iterate through strats
	},
};
</script>

<style>
button {
  margin-right: 1em;
}
.muted {
  color: gray;
  font-size: 0.8em;
}
.muted a {
  text-decoration: underline;
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
a,
a:visited,
a:hover {
  color: gray;
}
</style>