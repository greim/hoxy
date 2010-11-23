/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Stub css beautifier to use until something better is found or I get motivated
to write a CSS beautifier.

usage: var beautified = css_beautify(cssCode);
*/

exports.css_beautify = function(code){
	if (!code) return code;
	return code.replace(/\r/g, '')
		.replace(/\{/g, '{\n')
		.replace(/;/g, ';\n')
		.replace(/\}/g, '\n}\n')
		.replace(/\n\n+/g, '\n')
		.replace(/\n\s+/g, '\n')
		.replace(/\}/g, '}\n');
};
