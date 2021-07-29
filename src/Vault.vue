<template lang="pug">
#vault(v-if="isDrizzleInitialized && !wrong_chain")
  .logo {{ config.LOGO }}
  h1.title.is-size-3.is-size-4-mobile {{ config.TITLE }}
  div.container.is-max-desktop.warning.is-size-7-mobile(:class="config.VAULT_STATUS")
    info-message(:status="config.VAULT_STATUS")
  div Vault:&nbsp;
    a(
      :href="chainExplorer + '/address/' + config.VAULT_ADDR + '#code'",
      target="_blank"
    ) 📃Contract
  div Version: {{ vault_version }}
  div {{ config.WANT_SYMBOL }} price (CoinGecko 🦎): {{ want_price | toCurrency(4) }}
  div Deposit Limit: {{ vault_deposit_limit | fromWei(2, vault_decimals) }}  {{ config.WANT_SYMBOL }}
  div Total Assets: {{ vault_total_assets | fromWei(2, vault_decimals) }}  {{ config.WANT_SYMBOL }}
  div Total AUM: {{ vault_total_aum | toCurrency(2, vault_decimals) }}
  div(v-if="gross_apr > 0").spacer
  div(v-if="gross_apr > 0") Gross APR: {{ gross_apr | toPct(2) }}
  div.spacer
  div Price Per Share: {{ vault_price_per_share | fromWei(8, vault_decimals) }}
  div Available limit: {{ vault_available_limit | fromWei(2, vault_decimals) }} {{ config.WANT_SYMBOL }}
  progress-bar.is-hidden-mobile(:progress="progress_limit" :width="50")
  progress-bar.is-hidden-tablet(:progress="progress_limit" :width="30")
  div.spacer
  h2.title.is-4 <strong>Strategies</strong>
  div(v-for="(strategy, index) in strategies")
    div <strong> Strat. {{ index }}: </strong> {{ strategy.name }}
    div Address:&nbsp;
      a(
        :href="chainExplorer + '/address/' + strategy.address + '#code'",
        target="_blank"
      ) 📃Contract
  div.spacer
  h2.title.is-4 <strong>Wallet</strong>
  div Your Account: <strong>{{ username || activeAccount }}</strong>
  div Your Vault shares: {{ yvtoken_balance | fromWei(2, vault_decimals) }}
  div Your shares value: {{ yvtoken_value | toCurrency(2, vault_decimals) }}
  div Your {{ config.WANT_SYMBOL }} Balance: {{ want_balance | fromWei(2, vault_decimals) }}
  div Your {{ chainCoin }} Balance: {{ coin_balance | fromWei(2) }}
  div.spacer
    b-field(label="Amount", custom-class="is-small", v-if="vault_available_limit > 0")
      b-input(v-model.number="amount", size="is-small", type="number",min=0)
      p.control
        b-button.is-static(size="is-small") {{ config.WANT_SYMBOL }}

    span(v-if="vault_available_limit <= 0") Deposits closed.
    div.spacer
    button.unstyled(
      v-if="vault_available_limit > 0",
      :disabled="has_allowance_vault",
      @click.prevent="on_approve_vault"
    ) {{ has_allowance_vault ? '✅ Approved' : '🚀 Approve Vault' }}
    button.unstyled(
      v-if="vault_available_limit > 0",
      :disabled="!has_allowance_vault",
      @click.prevent="on_deposit"
    ) 🏦 Deposit
    button.unstyled(
      v-if="vault_available_limit > 0",
      :disabled="!has_allowance_vault",
      @click.prevent="on_deposit_all"
    ) 🏦 Deposit All
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
      a(href="https://twitter.com/emilianobonassi", target="_blank") emiliano
      |, 
      a(href="https://twitter.com/x48_crypto", target="_blank") x48
      |, 
      a(href="https://twitter.com/tbouder", target="_blank") Major
div(v-else-if=("isDrizzleInitialized && wrong_chain"))
  div(class="notFound")
    p ❌⛓
    p Wrong Chain
    div
      button.unstyled(
        @click.prevent="on_switch_chain",
      ) 🔀 Switch it on Metamask
    a.smallish(href="/") Back Home
div(v-else)
  div Loading yApp...
</template>

<script>

import { mapGetters } from "vuex";
import {ethers} from "ethers";
import axios from "axios";
import ProgressBar from './components/ProgressBar';
import InfoMessage from './components/InfoMessage';
import chains from './chains.json'
import yVaultV2 from "./abi/yVaultV2.json";
import yStrategy from "./abi/yStrategy.json";
import Web3 from "web3";

let web3 = new Web3(Web3.givenProvider);

const max_uint = ethers.BigNumber.from(2).pow(256).sub(1).toString();
const BN_ZERO = ethers.BigNumber.from(0);
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const ERROR_NEGATIVE = "You have to deposit a positive number of tokens 🐀";
const ERROR_NEGATIVE_ALL = "You don't have tokens to deposit 🐀";
const ERROR_NEGATIVE_WITHDRAW = "You don't have any vault shares";

export default {
  name: "Vault",
  components: {
    ProgressBar,
    InfoMessage,
  },
  props: ['config', 'chainId', 'chainCoin', 'chainExplorer'],
  data() {
    return {
      username: null,
      want_price: 0,
      amount: 0,
      amount_wrap: 0,
      strategies: [],
      strategies_balance: 0,
      average_price: 0,
      error: null,
      vault_activation: 0,
      gross_apr: 0,
      wrong_chain: false,
    };
  },
  filters: {
    fromWei(data, precision, decimals) {
      if (decimals === undefined) decimals = 18;
      if (data === "loading") return data;
      if (data > 2 ** 255) return "♾️";
      let value = ethers.utils.commify(ethers.utils.formatUnits(data, decimals));
      let parts = value.split(".");

      if (precision === 0) return parts[0];

      return parts[0] + "." + parts[1].slice(0, precision);
    },
    fromWei15(data, precision) {
      if (data === "loading") return data;
      if (data > 2 ** 255) return "♾️";
      let value = ethers.utils.commify(ethers.utils.formatUnits(data, 15));
      let parts = value.split(".");

      if (precision === 0) return parts[0];

      return parts[0] + "." + parts[1].slice(0, precision);
    },
    toPct(data, precision) {
      if (isNaN(data)) return "-";
      return `${(data * 100).toFixed(precision)}%`;
    },
    toCurrency(data, precision) {
      if ( !data ) return "-";
      
      if (typeof data !== "number") {
        data = parseFloat(data);
      }
      var formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: precision,
      });
      return formatter.format(data);
    },
  },
  methods: {
    on_approve_vault() {
      this.drizzleInstance.contracts["WANT"].methods["approve"].cacheSend(
        this.vault,
        max_uint,
        { from: this.activeAccount }
      );
    },
    on_deposit() {
      this.error = null;

      if (this.amount <= 0) {
        this.error = ERROR_NEGATIVE;
        this.amount = 0;
        return;
      }

      this.drizzleInstance.contracts["Vault"].methods["deposit"].cacheSend(
        ethers.utils.parseUnits(this.amount.toString(), this.vault_decimals).toString(),
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

      this.drizzleInstance.contracts["Vault"].methods["deposit"].cacheSend({
        from: this.activeAccount,
      });
    },
    on_withdraw_all() {
      if (this.yvtoken_balance <= 0) {
        this.error = ERROR_NEGATIVE_WITHDRAW;
        this.amount = 0;
        return;
      }
      this.drizzleInstance.contracts["Vault"].methods["withdraw"].cacheSend({
        from: this.activeAccount,
      });
    },
    async load_reverse_ens() {
      let lookup = this.activeAccount.toLowerCase().substr(2) + ".addr.reverse";
      let resolver = await this.drizzleInstance.web3.eth.ens.resolver(lookup);
      let namehash = ethers.utils.namehash(lookup);
      this.username = await resolver.methods.name(namehash).call();
    },
    async get_strategies(vault) {
      for (let i = 0, p = Promise.resolve(); i < 20; i++) {
        p = p.then(
          (_) =>
            new Promise((resolve) =>
              vault.methods
                .withdrawalQueue(i)
                .call()
                .then((strat_addr) => {
                  if (strat_addr !== ADDRESS_ZERO) {
                    let Strategy = new web3.eth.Contract(yStrategy, strat_addr);
                    let data = {
                      address: strat_addr,
                      balance: null,
                    };

                    // Add to strat address to array
                    this.$set(this.strategies, i, data);

                    Strategy.methods
                      .name()
                      .call()
                      .then((name) => {
                        console.log(name);
                        this.$set(this.strategies[i], "name", name);
                      });
                  }

                  resolve();
                })
            )
        );
      }
    },
    get_block_timestamp(timestamp) {
      return axios.get(`https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=JXRIIVMTAN887F9D7NCTVQ7NMGNT1A4KA3`)      
    },
    call(contract, method, args, out = "number") {
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
        case "number":
          if (value === null) value = 0;
          return ethers.BigNumber.from(value);
        case "address":
          return value;
        default:
          return value;
      }
    },
    on_switch_chain() {
      if (!window.ethereum) {
        console.error(`window.ethereum not initialized`)
        return
      }
      if (!chains[this.config.CHAIN_ID]) {
        console.error(`invalid chain_swap configuration`)
        return
      }
      if (this.config.CHAIN_ID === 1) {
        window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{chainId: '0x1'}],
        })
        .catch((error) => console.error(error));
      } else {
        window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chains[this.config.CHAIN_ID].chain_swap, this.activeAccount],
        })
        .catch((error) => console.error(error));
      }
    }
  },
  computed: {
    ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    ...mapGetters("drizzle", ["drizzleInstance", "isDrizzleInitialized"]),
    ...mapGetters("contracts", ["getContractData", "contractInstances"]),

    user() {
      return this.activeAccount;
    },
    vault() {
      return this.drizzleInstance.contracts["Vault"].address;
    },
    vault_version() {
      return this.call("Vault", "apiVersion", [], "string");
    },
    vault_supply() {
      return this.call("Vault", "totalSupply", []);
    },
    vault_deposit_limit() {
      return this.call("Vault", "depositLimit", []);
    },
    vault_total_assets() {
      return this.call("Vault", "totalAssets", []);
    },
    vault_available_limit() {
      if (this.config.VAULT_STATUS == 'active' || this.config.VAULT_STATUS == 'stealth' || this.config.VAULT_STATUS == '') {
        return this.call("Vault", "availableDepositLimit", []);
      } else {
        return BN_ZERO;
      }
    },
    vault_total_aum() {
      let toFloat = ethers.BigNumber.from(10).pow(this.vault_decimals.sub(2)).toString();
      let numAum = this.vault_total_assets.div(toFloat).toNumber();
      return (numAum / 100) * this.want_price;
    },
    vault_price_per_share() {
      return this.call("Vault", "pricePerShare", []);
    },
    vault_decimals() {
      return this.call("Vault", "decimals", []);
    },
    yvtoken_balance() {
      return this.call("Vault", "balanceOf", [this.activeAccount]);
    },
    yvtoken_value() {
      let toFloat = ethers.BigNumber.from(10).pow(this.vault_decimals.sub(2)).toString();
      let numAum = this.yvtoken_balance.div(toFloat).toNumber();
      return (numAum / 100) * this.want_price;
    },
    want_balance() {
      return this.call("WANT", "balanceOf", [this.activeAccount]);
    },
    coin_balance() {
      return this.activeBalance;
    },
    progress_limit() {
      return (this.vault_deposit_limit.isZero()?0:(this.vault_deposit_limit - this.vault_available_limit) / this.vault_deposit_limit);
    },
    has_allowance_vault() {
      return !this.call("WANT", "allowance", [
        this.activeAccount,
        this.vault,
      ]).isZero();
    },
    has_want_balance() {
      return this.want_balance > 0;
    },
    has_yvtoken_balance() {
      return this.yvtoken_balance > 0;
    },
  },
  async created() {
    if (this.chainId && this.config.CHAIN_ID !== this.chainId) {
      //window.location.href = '/';
      this.wrong_chain = true;
    }
    axios
      .get(
        "https://api.coingecko.com/api/v3/simple/price?ids=" +
          this.config.COINGECKO_SYMBOL.toLowerCase() +
          "&vs_currencies=usd"
      )
      .then((response) => {
        this.want_price = response.data[this.config.COINGECKO_SYMBOL.toLowerCase()].usd;
      });

    axios.get("https://api.yearn.finance/v1/chains/1/vaults/all")
    .then((response) => {
      this.gross_apr = response.data.filter((item) => item.address === this.vault).[0].apy.gross_apr;
    });

    //Active account is defined?
    if (this.activeAccount !== undefined) this.load_reverse_ens();

    let Vault = new web3.eth.Contract(yVaultV2, this.vault);
    this.get_strategies(Vault);

  },
};
</script>

<style>
input {
  height: 26px;
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
.pointer {
  cursor: pointer;
}
a,
a:visited,
a:hover {
  color: gray;
}
</style>
