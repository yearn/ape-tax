<template lang="pug">
  div(v-if="isDrizzleInitialized", id="app")
    h1 Hegic Vault aka "El Calfos"
    div Lots: {{ lots || fromWei(2) }}
    div Hegic price (CoinGecko 🦎): {{ hegic_price | fromWei(4) | toCurrency(4) }}
    div Deposit Limit: {{ vault_deposit_limit | fromWei(2) }}
    div Total Assets: {{ vault_total_assets | fromWei(2) }}
    div Total AUM: {{ vault_total_aum | toCurrency(2) }}  
    p
    div Price Per Share: {{ vault_price_per_share | fromWei(8) }}
    div Hegic Future Profit: {{ strategy_future_profits | fromWei(8) }}
    p
    div Available limit: {{ vault_available_limit | fromWei(2) }} HEGIC
    p
    div Your Account: <strong>{{ username || activeAccount }}</strong>
    div Your Vault shares: {{ yhegic_balance | fromWei(2) }}
    div Your Hegic Balance: {{ hegic_balance | fromWei(2) }}
    p
    label(v-if="vault_available_limit > 0") Amount 
    input(v-if="vault_available_limit > 0" size="is-small" v-model.number="amount" type="number" min=0)
    span(v-if="vault_available_limit <= 0") Deposits closed. 
    p
    button(v-if="vault_available_limit > 0" :disabled='has_allowance_vault', @click.prevent='on_approve_vault') {{ has_allowance_vault ? '✅ Approved' : '🚀 Approve Vault' }}
    button(v-if="vault_available_limit > 0" :disabled='!has_allowance_vault', @click.prevent='on_deposit') 🏦 Deposit
    button(v-if="vault_available_limit > 0" :disabled='!has_allowance_vault', @click.prevent='on_deposit_all') 🏦 Deposit All
    button(:disabled='!has_yhegic_balance', @click.prevent='on_withdraw_all') 💸 Withdraw All
    div.red(v-if="error")
      span {{ error }}
    p
      div.muted
        span Made with 💙  
        span yVault:  
        a(href='https://twitter.com/macarse', target='_blank') Carlos
        span  & 
        a(href='https://twitter.com/mattdwest', target='_blank') Matt
        span  - UI:  
        a(href='https://twitter.com/fameal', target='_blank') fameal
  div(v-else)
    div Loading yApp...

</template>

<script>
import { mapGetters } from 'vuex'
import ethers from 'ethers'
import axios from 'axios'

/*
import ethers, { BigNumber } from 'ethers'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
*/

const max_uint = new ethers.BigNumber.from(2).pow(256).sub(1).toString()
const ERROR_NEGATIVE = "You have to deposit a positive number of tokens 🐀"
const ERROR_NEGATIVE_WITHDRAW = "You don't have any vault shares"

export default {
  name: 'yHegicVault',
  data() {
    return {
      username: null,
      hegic_price: 0,
      amount: 0,
      error: null
    }
  },
  filters: {
    fromWei(data, precision) {
      if (data === 'loading') return data
      if (data > 2**255) return '�~H~^'
      let value = ethers.utils.commify(ethers.utils.formatEther(data))
      let parts = value.split('.')

      if (precision === 0) return parts[0]

      return parts[0] + '.' + parts[1].slice(0, precision)
    },
    toPct(data, precision) {
      if (isNaN(data)) return '?'
      return `${(data * 100).toFixed(precision)}%`
    },
    toCurrency(data, precision) {
      if (typeof data !== "number") {
        data = parseFloat(data);
      }
      var formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: precision
      })
      return formatter.format(data);
    },
  },
  methods: {
    on_approve_vault() {
      this.drizzleInstance.contracts['HEGIC'].methods['approve'].cacheSend(this.vault, max_uint, {from: this.activeAccount})
    },
    on_deposit() {
      this.error = null

      if (this.amount <= 0) {
        this.error = ERROR_NEGATIVE
        this.amount = 0
        return
      }

      this.drizzleInstance.contracts['yHegicVault'].methods['deposit'].cacheSend(ethers.utils.parseEther(this.amount.toString()).toString(), {from: this.activeAccount})
    },
    on_deposit_all() {
      if (this.hegic_balance <= 0) {
        this.error = ERROR_NEGATIVE
        this.amount = 0
        return
      }

      if (this.hegic_balance < this.vault_available_limit) {
          var limit = this.vault_available_limit.lt(0) ? "0" : this.vault_available_limit.toString()
          this.drizzleInstance.contracts['yHegicVault'].methods['deposit'].cacheSend(limit,{from: this.activeAccount})
          return
      }

      this.drizzleInstance.contracts['yHegicVault'].methods['deposit'].cacheSend({from: this.activeAccount})
    },
    on_withdraw_all() {
      if (this.yhegic_balance <= 0) {
        this.error = ERROR_NEGATIVE_WITHDRAW
        this.amount = 0
        return
      }
      this.drizzleInstance.contracts['yHegicVault'].methods['withdraw'].cacheSend({from: this.activeAccount})
    },
    async load_reverse_ens() {
      let lookup = this.activeAccount.toLowerCase().substr(2) + '.addr.reverse'
      let resolver = await this.drizzleInstance.web3.eth.ens.resolver(lookup)
      let namehash = ethers.utils.namehash(lookup)
      this.username = await resolver.methods.name(namehash).call()
    },

    call(contract, method, args, out='number') {
      let key = this.drizzleInstance.contracts[contract].methods[method].cacheCall(...args)
      let value
      try {
        value = this.contractInstances[contract][method][key].value 
      } catch (error) {
        value = null
      }
      switch (out) {
        case 'number':
          if (value === null) value = 0
          return new ethers.BigNumber.from(value)
        case 'address':
          return value
        default:
          return value
      }
    },
  },
  computed: {
    ...mapGetters('accounts', ['activeAccount', 'activeBalance']),
    ...mapGetters('drizzle', ['drizzleInstance', 'isDrizzleInitialized']),
    ...mapGetters('contracts', ['getContractData', 'contractInstances']),

    user() {
      return this.activeAccount
    },
    vault() {
      return this.drizzleInstance.contracts['yHegicVault'].address
    },
    strategy() {
      return this.drizzleInstance.contracts['yHegicStrategyETH'].address
    },
    strategy_wbtc() {
      return this.drizzleInstance.contracts['yHegicStrategyWBTC'].address
    },
    vault_supply() {
      return this.call('yHegicVault', 'totalSupply', [])
    },
    vault_deposit_limit() {
      return this.call('yHegicVault', 'depositLimit', [])
    },
    vault_total_assets() {
      return this.call('yHegicVault', 'totalAssets', [])
    },
    vault_available_limit() {
      return this.vault_deposit_limit.sub(this.vault_total_assets)
    },
    vault_total_aum() {
      const toInt = new ethers.BigNumber.from(10).pow(18).pow(2).toString()
      return this.vault_total_assets.mul(this.hegic_price).div(toInt)
    },
    vault_price_per_share() {
      return this.call('yHegicVault', 'pricePerShare', [])
    },
    strategy_future_profits() {
      return this.call('yHegicStrategyETH', 'hegicFutureProfit', []).add(this.call('yHegicStrategyWBTC', 'hegicFutureProfit', []))
    },
    lots() {
      return this.call('HegicStakingETH', 'balanceOf', [this.strategy]).toNumber() + this.call('HegicStakingWBTC', 'balanceOf', [this.strategy_wbtc]).toNumber()
    },
    yhegic_balance() {
      return this.call('yHegicVault', 'balanceOf', [this.activeAccount])
    },
    hegic_balance() {
      return this.call('HEGIC', 'balanceOf', [this.activeAccount])
    },
    vault_balance() {
      return this.call('yHegicVault', 'balanceOf', [this.activeAccount])
    },
    has_allowance_vault() {
      return !this.call('HEGIC', 'allowance', [this.activeAccount, this.vault]).isZero()
    },
    has_yhegic_balance() {
      return (this.yhegic_balance > 0)
    },
  },
  created() {

    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=hegic&vs_currencies=usd')
      .then(response => {
        this.hegic_price = ethers.utils.parseUnits(String(response.data.hegic.usd),18)
      })

    //active account is defined?
    if (this.activeAccount !== undefined) this.load_reverse_ens()

    
  }
}
</script>

<style>
button {
  margin-right: 1em;
}
.muted {
  color: gray;
  font-size: 0.8em;
}
.red{
  color: red;
  font-weight: 700;
}
a, a:visited, a:hover {
  color: gray;
}
</style>