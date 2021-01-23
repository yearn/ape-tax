<template lang="pug">
	div(class="info-message")
		span(v-if="status == 'withdraw'")
			| 🛑 <strong>WITHDRAW YOUR FUNDS</strong> this vault is disabled and it will not generate more yield.
			| Please remove your funds.
		span(v-else-if="status == 'use_production'")
			| ⭐️ <strong class="blue">MOVED TO PRODUCTION</strong> this vault is one of the few lucky ones that's been promoted to main site.
			| Please, deposit using the endorsed vault at
			| 
			a(href="https://yearn.finance/vaults", target="_blank") <strong>yearn.finance</strong>
		span(v-else)
			| ⚠️ <strong>WARNING</strong> this vault is experimental.
			| It's extremely risky and will probably be discarded when production ones are deployed.
			| Proceed with caution.
</template>

<script>

export default {
	name: "InfoMessage",
	props: ['status'],
	data() {
		return {
			message_type: '',
		}
	},

	computed: {},
	created() {
		switch(this.status) {
			case 'withdraw':
				this.message_type = 'is-danger';
				break;
			case 'use_production':
				this.message_type = 'is-info';
				break;
			default:
				this.message_type = '';
			}
	},

}

</script>
<style>
.tag {
	margin-left: 1em;
}
a strong {
	color: blue !important;
}

a strong:hover {
	color: black !important;
}
</style>