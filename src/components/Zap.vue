<template lang="pug">
    div.columns(v-if="contract")
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
              @click.prevent="on_deposit_zap"
              ) 🏦 Zap In With {{ symbol }}
</template>

<script>
import { mapGetters } from "vuex";
import ethers from "ethers";
import ZapABI from "../abi/Zap.json";
import Web3 from "web3";

const ERROR_NEGATIVE = "You have to deposit a positive number of tokens 🐀";

let web3 = new Web3(Web3.givenProvider);

export default {
	name: "Zap",
	props: ['symbol','contract'],
	data() {
		return {
			amount_zap: 0,
            slippage: 0.5,
            contractZap: null,
		}
	},
    methods: {
        on_deposit_zap() {
            this.error = null;

            if (this.amount_zap <= 0) {
                this.error = ERROR_NEGATIVE;
                this.amount_zap = 0;
                return;
            }

            
            this.contractZap.methods.zapEthIn(this.slippage*100).send( 
                { 
                    from: this.activeAccount,
                    value: ethers.utils.parseEther(this.amount_zap.toString()).toString() 
                }
            );

        },
    },
	computed: {
        ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    },
	created() {
        // Zap Contract
        console.log("Zap contract: " + this.contract);
        this.contractZap = new web3.eth.Contract(ZapABI, this.contract);
    },
}

</script>