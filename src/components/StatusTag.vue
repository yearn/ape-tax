<template lang="pug">
	span(v-if="status == 'use_production'")
		a(href="https://yearn.finance/vaults" target="_blank")
			b-tag(:type="tag_type" v-if="tag_text != ''") {{ tag_text }}
				| 
				b-icon(icon="open-in-new", size="is-small")
	span(v-else)
		b-tag(:type="tag_type" v-if="tag_text != ''") {{ tag_text }}
</template>

<script>

export default {
	name: "StatusTag",
	props: ['status'],
	data() {
		return {
			tag_type: '',
			tag_text: '',
		}
	},

	computed: {},
	created() {
		switch(this.status) {
			case 'disabled':
				this.tag_text = 'Disabled';
				this.tag_type = 'is-warning';
				break;
			case 'withdraw':
				this.tag_text = 'Withdraw';
				this.tag_type = 'is-danger';
				break;
			case 'use_production':
				this.tag_text = 'Use Production';
				this.tag_type = 'is-info';
				this.link = 'https://yearn.finance/vaults';
				break;
			default:
				this.tag_type = '';
				this.tag_text = '';
			}
	},

}

</script>
<style>
.tag {
	margin-left: 1em;
	font-size: 0.6rem !important;
}
</style>