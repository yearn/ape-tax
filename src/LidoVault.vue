<template lang="pug">
#vault(v-if="isDrizzleInitialized")
  .logo {{ config.LOGO }}
  h1 {{ config.TITLE }}
  div.warning ⚠️ <strong>WARNING</strong> this vaults are experimental. They are extremely risky and will probably be discarded when production ones are deployed. Proceed with caution.
  p
  div Vault:&nbsp;
    a(
      :href="'https://etherscan.io/address/' + config.VAULT_ADDR + '#code'",
      target="_blank"
    ) 📃Contract
  div Version: {{ vault_version }}
  div {{ config.WANT_SYMBOL }} price (CoinGecko 🦎): {{ want_price | toCurrency(4) }}
  div Deposit Limit: Un-Limited {{ config.WANT_SYMBOL }}
  div Total Assets: {{ vault_total_assets | fromWei(2, vault_decimals) }} {{ config.WANT_SYMBOL }}
  div Total AUM: {{ vault_total_aum | toCurrency(2, vault_decimals) }}
  p
  div Price Per Share: {{ vault_price_per_share | fromWei(8, vault_decimals) }}
  div Available limit: Un-Limited {{ config.WANT_SYMBOL }}
  h2 <strong>Wallet</strong>
  div Your Account: <strong>{{ username || activeAccount }}</strong>
  div Your Vault shares: {{ yvtoken_balance | fromWei(2, vault_decimals) }}
  div Your {{ config.WANT_SYMBOL }} Balance: {{ want_balance | fromWei(2, vault_decimals) }}
  div Your ETH Balance: {{ eth_balance | fromWei(2) }}
  p
  div(v-if="is_guest || yfi_needed <= 0")
    span <strong>You are a guest. Welcome to the <span class="blue">Citadel</span> 🏰</strong>
    p
    label(v-if="vault_available_limit > 0") Amount
    input(
      v-if="vault_available_limit > 0",
      size="is-small",
      v-model.number="amount",
      type="number",
      min=0
    )
    span(v-if="vault_available_limit <= 0") Deposits closed.
    p
    button(
      v-if="vault_available_limit > 0",
      :disabled="has_allowance_vault",
      @click.prevent="on_approve_vault"
    ) {{ has_allowance_vault ? '✅ Approved' : '🚀 Approve Vault' }}
    button(
      v-if="vault_available_limit > 0",
      :disabled="!has_allowance_vault",
      @click.prevent="on_deposit"
    ) 🏦 Deposit
    button(
      v-if="vault_available_limit > 0",
      :disabled="!has_allowance_vault",
      @click.prevent="on_deposit_all"
    ) 🏦 Deposit All
    button(:disabled="!has_want_balance", @click.prevent="on_withdraw_all") 💸 Withdraw All
  div(v-else)
    .red
      span ⛔ You need {{ yfi_needed | fromWei(4) }} YFI more to enter the Citadel ⛔
    <div v-konami @konami="bribe_unlocked = !bribe_unlocked"></div>
    div(v-if="bribe_unlocked")
      span If you still want to join the party...
      |
      button(v-if="has_allowance_bribe", @click.prevent="on_bribe_the_bouncer") 💰 Bribe the bouncer with ({{ bribe_cost | fromWei(3) }} YFI)
      button(v-if="!has_allowance_bribe", @click.prevent="on_approve_bribe") 🚀 Approve Bribe
    div(v-else)
      span Remember Konami 🎮
  .red(v-if="error")
    span {{ error }}
  p
    .muted
      span Made with 💙
      span yVault:
      |
      a(:href="'https://twitter.com/' + config.VAULT_DEV", target="_blank") {{ config.VAULT_DEV }}
      span - Guest List:
      |
      a(href="https://twitter.com/bantg", target="_blank") banteg
      span - UI:
      |
      a(href="https://twitter.com/fameal", target="_blank") fameal,
      a(href="https://twitter.com/vasa_develop", target="_blank") vasa
div(v-else)
  div Loading yApp...
</template>

<script>

import { mapGetters } from "vuex";
import ethers from "ethers";
import axios from "axios";
import GuestList from "./abi/GuestList.json";
import yVaultV2 from "./abi/yVaultV2.json";
import yStrategy from "./abi/yStrategy.json";
import ERC20 from "./abi/ERC20.json";

import Web3 from "web3";

let web3 = new Web3(Web3.givenProvider);

const max_uint = new ethers.BigNumber.from(2).pow(256).sub(1).toString();
const BN_ZERO = new ethers.BigNumber.from(0);
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const ERROR_NEGATIVE = "You have to deposit a positive number of tokens 🐀";
const ERROR_NEGATIVE_ALL = "You don't have tokens to deposit 🐀";
const ERROR_NEGATIVE_WITHDRAW = "You don't have any vault shares";
const ERROR_GUEST_LIMIT = "That would exceed your guest limit. Try less.";
const ERROR_GUEST_LIMIT_ALL =
  "That would exceed your guest limit. Try not doing all in.";

export default {
  name: "Vault",
  components: {},
  props: ['config'],
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
      contractGuestList: null,
      is_guest: false,
      entrance_cost: new ethers.BigNumber.from("1"),
      total_yfi: new ethers.BigNumber.from("0"),
      bribe_unlocked: false,
      bribe_cost: new ethers.BigNumber.from("0"),
      vault_activation: 0,
      roi_week: 0,
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
    on_approve_bribe() {
      this.drizzleInstance.contracts["YFI"].methods["approve"].cacheSend(
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
    on_bribe_the_bouncer() {
      console.log(this.contractGuestList.methods);
      this.contractGuestList.methods
        .bribe_the_bouncer()
        .send({ from: this.activeAccount })
        .then((response) => {
          console.log(response);
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
          return new ethers.BigNumber.from(value);
        case "address":
          return value;
        default:
          return value;
      }
    },
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
      return this.call("Vault", "version", [], "string");
    },
    vault_supply() {
      return this.call("Vault", "totalSupply", []);
    },
    vault_deposit_limit() {
      return this.call("Vault", "depositLimit", []);
    },
    vault_total_assets() {
      return this.call("Vault", "totalSupply", []);
    },
    vault_available_limit() {
      return this.call("Vault", "availableDepositLimit", []);
    },
    vault_total_aum() {
      let toFloat = new ethers.BigNumber.from(10).pow(this.vault_decimals.sub(2)).toString();
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
    want_balance() {
      return this.call("WANT", "balanceOf", [this.activeAccount]);
    },
    eth_balance() {
      return this.activeBalance;
    },
    yfi_needed() {
      return this.entrance_cost.sub(this.total_yfi);
    },
    has_allowance_bribe() {
      return !this.call("YFI", "allowance", [
        this.activeAccount,
        this.vault,
      ]).isZero();
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
  },
  async created() {
    axios
      .get(
        "https://api.coingecko.com/api/v3/simple/price?ids=" +
          this.config.COINGECKO_SYMBOL.toLowerCase() +
          "&vs_currencies=usd"
      )
      .then((response) => {
        this.want_price = response.data[this.config.COINGECKO_SYMBOL.toLowerCase()].usd;
      });

    //Active account is defined?
    if (this.activeAccount !== undefined) this.load_reverse_ens();

    let Vault = new web3.eth.Contract(yVaultV2, this.vault);
    console.log(Vault);
    this.get_strategies(Vault);

    // Get GuestList contract and use it :)
    Vault.methods.guestList().call().then((response) => {
        if (response == ADDRESS_ZERO) {
          //if there's not guest list, everyone is a guest ;)
          console.log("No guest list. Everyone is invited!");
          this.is_guest = true;
          this.total_yfi = this.entrance_cost;
        } else {
          this.contractGuestList = new web3.eth.Contract(GuestList, response);

          this.contractGuestList.methods
            .guests(this.activeAccount)
            .call()
            .then((response) => {
              this.is_guest = response;
            });
        }

        this.contractGuestList.methods.total_yfi(this.activeAccount).call().then((response) => {
            console.log("Total YFI: " + response.toString());
            this.total_yfi = new ethers.BigNumber.from(response.toString());
          });

        Vault.methods.activation().call().then((vault_activation) => {
            this.contractGuestList.methods
              .entrance_cost(vault_activation)
              .call()
              .then((response) => {
                console.log("Entrance cost: " + response.toString());
                this.entrance_cost = new ethers.BigNumber.from(
                  response.toString()
                );
              });
          });

        this.contractGuestList.methods
          .bribe_cost()
          .call()
          .then((response) => {
            console.log("Bribe cost: " + response.toString());
            this.bribe_cost = new ethers.BigNumber.from(response.toString());
          });
      });

    // Get blocknumber and calc APY
    Vault.methods.pricePerShare().call().then( currentPrice => {
      const seconds_in_a_year = 31536000;
      const now = Math.round(Date.now() / 1000);

      // 1 week ago
      const one_week_ago = (now - 60 * 60 * 24 * 7);
      const ts_past = one_week_ago < this.config.BLOCK_ACTIVATED?this.config.BLOCK_ACTIVATED:one_week_ago;

      const ts_diff = now - ts_past;

      console.log("TS Past: " + one_week_ago);
      console.log("TS Activation: " + this.config.BLOCK_ACTIVATED);

      this.get_block_timestamp(ts_past).then(response => {
        console.log("Past block: " + response.data.result);
        Vault.methods.pricePerShare().call({}, response.data.result).then( pastPrice => {
          let roi = (currentPrice / pastPrice - 1) * 100;
          console.log("Current Price: " + currentPrice);
          console.log("Past Price: " + pastPrice);
          this.roi_week = roi/ts_diff*seconds_in_a_year;
          console.log("ROI week: " + roi);
          console.log("ROI year: " + this.roi_week);
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