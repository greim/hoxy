module.exports = function(opts){

    opts = opts || {};
    var defaults = {
        projectName: 'Hoxy',
        debug: false, //Turn on debug mode, print errors to console.
        rules: './hoxy-rules.txt', //Specify rules file location
        port: 8080, //Specify port to listen on.
        stage: false, //Host that proxy will act as a staging server for.
        'no-version-check': false, //Attempt to run proxy without the startup version check.
        pluginPath: null //function that takes a name and returns path to plugin that can be required
    };

    for(var key in defaults){
        if(defaults.hasOwnProperty(key)){
            if(typeof opts[key] == 'undefined'){
                opts[key] = defaults[key];
            }
        }
    }
    var projectName = opts.projectName;
    delete opts.projectName;
    require('./runner.js')(projectName, opts);


}