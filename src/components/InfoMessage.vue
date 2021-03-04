<template lang="pug">
	div(class="info-message")
		span(v-if="status == 'withdraw'")
			| 🛑 <strong>WITHDRAW YOUR FUNDS</strong> this experiment is disabled and it will not generate more yield.
			| Please remove your funds.
		span(v-else)
			| ⚠️ <strong>WARNING</strong> this experiment is experimental.
			| It's extremely risky and will probably be discarded when the test is over.
			| Proceed with extreme caution.
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