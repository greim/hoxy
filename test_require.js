var hoxy = require('./index.js')
var path = require('path')

hoxy({
    projectName: 'Test require',
    debug: true,
    port: 8080,
    stage: 'programmingdrunk.com:80',
    pluginPath: function(name) {
      return path.join(__dirname, name + '.js');
    }
});
