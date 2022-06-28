function	ProgressChart({progress, width}) {
	const	part_char = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
	const	whole_char = '█';
	const	whole_width = Math.floor(progress * width);
	const	remainder_width = (progress * width) % 1;
	const	part_width = Math.floor(remainder_width * 9);
	let		white_width = width - whole_width - 1;

	if (progress == 1)
		white_width = 0;
	
	return '' + whole_char.repeat(whole_width) + part_char[part_width] + ' '.repeat(white_width) + '';
}

export default ProgressChart;