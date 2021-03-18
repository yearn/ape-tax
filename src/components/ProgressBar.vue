<template>
  <div class="progress-bar is-size-8-mobile">
	
	<span class="progress-body">
	[
	{{ progress_line }}
	]
	</span>
	{{ progress_pct }}
  </div>
</template>

<script>
	const part_char = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█", ];
	const whole_char = "█";

export default {
  name: "ProgressBar",
  props: ['progress', 'width'],

  computed: {
	progress_pct () {
		return (this.progress * 100).toFixed(2) + " %";
	},
	progress_line() {
		let whole_width = Math.floor(this.progress * this.width);
		let remainder_width = (this.progress * this.width) % 1;
		let part_width = Math.floor(remainder_width * 9);
		
		let white_width = this.width - whole_width - 1;
		if (this.progress == 1) white_width = 0;
		
		let line = "" + whole_char.repeat(whole_width) + part_char[part_width] + " ".repeat(white_width) + "";

        return line;
	}
  }
}

</script>
<style>

.progress-bar { 
	display: inline-block;
	white-space: pre-wrap;
}

.progress-body {
	background-color: #f0f0f0;
	color: black;
}

</style>