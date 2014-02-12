jQuery.fn.deIndent = function(){
  this.each(function(){
    var text = $(this).html();
    var lines = text.split('\n');

    // remove \r
    lines = lines.map(function(line){
      return line.replace(/\r/g, '');
    });

    // remove empty first and last lines
    lines = lines.filter(function(line, idx){
      if (idx === 0 || idx === lines.length-1){
        return /\S/.test(line);
      } else {
        return true;
      }
    });

    // find minimum length of leading whitespace
    var minimum = lines.reduce(function(smallest, line){
      if (!/\S/.test(line)){
        return smallest;
      }
      var leading = line.replace(/^(\s+).*/,'$1');
      return Math.min(smallest, leading.length);
    }, Infinity);

    // chop off that minimum length
    lines = lines.map(function(line){
      return line.substring(minimum);
    });
    $(this).html(lines.join('\n'));
  });
  return this;
};

