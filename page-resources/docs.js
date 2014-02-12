
(function(docEl, body){
  window.onresize = function scale(){
    docEl.style.fontSize = (body.clientWidth / 100) + 'px';
    return scale;
  }();
})(document.documentElement, document.body);

$('pre').deIndent();

Prism.highlightAll();

var $w = $(window);
var $nav = $('#nav');
var $headings = $('h1,h2,h3');
var moving = false;
$headings.each(function(){
  var $heading = $(this);
  var tldr = $heading.data('tldr');
  if (!tldr){
    tldr = $heading.next('.api-detail-content').find('*').eq(0).text();
  }
  if (!tldr){
    tldr = $heading.next('p').text();
  }
  tldr = tldr.split('\n').filter(function(line){return /\S/.test(line);})[0] || '';
  var $trigger = $('<a href="#'+$heading.attr('id')+'">'+$heading.text()+'<span class="tldr">'+tldr+'</span></a>');
  $('<li class="item-'+this.nodeName.toLowerCase()+'"></li>')
  .append($trigger)
  .appendTo($nav);
});

(function(){
  var oldTop;
  var sDist;

  $w.on('resize', function resize(){
    var height = document.documentElement.offsetHeight;
    var wHeight = document.documentElement.clientHeight;
    sDist = height - wHeight;
    return resize;
  }());

  $w.on('scroll', function(ev){
    var scrollTop = document.documentElement.scrollTop;
    if (scrollTop < 0) scrollTop = 0;
    if (scrollTop > sDist) scrollTop = sDist;
    if (oldTop === undefined) oldTop = scrollTop;
    var diff = scrollTop - oldTop;
    oldTop = scrollTop;
    if (diff && !moving){
      var navTop = $nav.scrollTop();
      $nav.scrollTop(navTop + diff);
    }
  });
})();

$('html').on('click', '[href^="#"]', function(ev){
  var hash = this.getAttribute('href');
  var id = hash.substring(1);
  var $el = $(hash);
  if ($el.length > 0){
    ev.preventDefault();
    $el.attr('id','');
    location.hash = hash;
    var top = $el.offset().top;
    moving = true;
    $('html').animate({scrollTop: (top-30)+'px'}, 200, function(){
      $el.attr('id',id);
      setTimeout(function(){
        moving = false;
      }, 100);
    });
  }
});
