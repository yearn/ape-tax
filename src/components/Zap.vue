<template lang="pug">
    div.columns
      div.column.is-2
        b-field(label="Amount", custom-class="is-small")
          b-input(v-model.number="amount_zap", size="is-small", type="number", min=0, step=0.1)
          p.control
            b-button.is-static(size="is-small") {{ symbol }}
    
      div.column
        b-field(label="Slippage", custom-class="is-small")
          b-input(v-model.number="slippage", size="is-small", type="number", min=0, step=0.1)
          p.control
            b-button.is-static(size="is-small") %

            button.unstyled(
              v-if="vault_available_limit > 0",
              @click.prevent="on_deposit_zap"
              ) 🏦 Zap In With {{ symbol }}
</template>

<script>

export default {
	name: "Zap",
	props: ['symbol','contract'],
	data() {
		return {
			amount_zap: 0,
            slippage: 0.5,
		}
	},
    methods: {
        on_deposit_eth() {
            this.error = null;

            if (this.amount_eth <= 0) {
                this.error = ERROR_NEGATIVE;
                this.amount_eth = 0;
                return;
            }

            
            this.contract.methods.zapEthIn(this.slippage*100).send( 
                { 
                    from: this.activeAccount,
                    value: ethers.utils.parseEther(this.amount_zap.toString()).toString() 
                }
            );

        },
    },
	computed: {},
	created() {},
}

</script>