var patt = /xml/;

module.exports = function(mimeType){
  if (!mimeType){
    return false;
  } else {
    return patt.test(mimeType);
  }
};
