var await = require('await');
var fs = require('fs');

// --------------------------------------------

module.exports = function(args){
  start('.')
  .then(function(){
    return getTransferInfo(args);
  })
  .then(function(got){
    return canCopyFiles(got.transferInfo);
  })
  .then(function(got){
    return copyFiles(got.transferInfo);
  })
  .then(function(){
    console.log('all done');
    process.exit(0);
  })
  .catch(function(err){
    console.error(err.stack);
    process.exit(1);
  });
};

// --------------------------------------------

function getTransferInfo(args){
  var sourceDir = __dirname + '/copyables';
  var targetDir = '.';
  var info = [{
    source: {
      name: 'my-debugging-proxy',
      version: '0.0.0',
      main: './run-hoxy',
      dependencies: {
        hoxy: '1.x',
        minimist: '0.0.x',
        'lodash-node': '2.3.x'
      }
    },
    target: targetDir + '/package.json',
    ignorable: false
  },{
    source: {
      port: args.port,
      upstreamProxy: args['upstream-proxy'],
      reverse: args.reverse
    },
    target: targetDir + '/hoxy.json',
    ignorable: false
  },{
    source: sourceDir + '/gitignore.txt',
    target: targetDir + '/.gitignore',
    ignorable: true
  },{
    source: sourceDir + '/run-hoxy.js',
    target: targetDir + '/run-hoxy.js',
    ignorable: false
  },{
    source: sourceDir + '/license.txt',
    target: targetDir + '/license.txt',
    ignorable: true
  }];
  return await('transferInfo')
  .keep('transferInfo', info);
}

// --------------------------------------------

function start(dir){
  console.log('initializing in ' + dir);
  return await('started').keep('started');
}

// --------------------------------------------

function canCopyFiles(transferInfo){
  var unignorables = transferInfo.filter(function(info){
    return !info.ignorable;
  });
  var proms = unignorables.map(function(info){
    var prom = await('ok');
    fs.exists(info.target, function(exists){
      if (exists){
        prom.fail(new Error(info.target + ' already exists'));
      } else {
        prom.keep('ok');
      }
    });
    return prom;
  });
  return await.all(proms);
}

// --------------------------------------------

function copyFiles(transferInfo){
  var proms = transferInfo.map(function(info){
    if (typeof info.source === 'object'){
      return saveJson(info.source, info.target, info.ignorable);
    } else {
      return copyFile(info.source, info.target, info.ignorable);
    }
  });
  return await.all(proms);
}

// --------------------------------------------

function saveJson(obj, target, failSilent){
    var prom = await('status')
    .onkeep(function(got){
      console.log(got.status);
    });
    try {
      var objString = JSON.stringify(obj, null, '  ');
    } catch(err) {
      prom.fail(err);
      return;
    }
    fs.writeFile(target, objString, {
      encoding: 'utf8',
      flag: 'wx' // fail if exists
    }, function(err){
      if (err){
        if (failSilent){
          var status = target + ' not created. ('+err.message+')';
          prom.keep('status', status);
        } else {
          prom.fail(err);
        }
      } else {
        prom.keep('status', target + ' created');
      }
    });
    return prom;
}

// --------------------------------------------

function copyFile(source, target, failSilent){
    var prom = await('status')
    .onkeep(function(got){
      console.log(got.status);
    });
    var sourceStream = fs.createReadStream(source);
    var targetStream = fs.createWriteStream(target,{flags:'wx'}); // fail if exists
    sourceStream.pipe(targetStream);
    var keeper = prom.keep.bind(prom, 'status', target + ' created');
    sourceStream.on('end', keeper);
    function failer(err){
      if (failSilent){
        var status = target + ' not created. ('+err.message+')';
        prom.keep('status', status);
      } else {
        prom.fail(err);
      }
    }
    sourceStream.on('error', failer);
    targetStream.on('error', failer);
    return prom;
}








