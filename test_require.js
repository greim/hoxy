var hoxy = require('./index.js')

hoxy({
    projectName: 'Test require',
    debug: true,
    port: 8080,
    stage: 'programmingdrunk.com:80'
});
