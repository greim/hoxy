var await = require('await');
var fs = require('fs');
var colors = require('colors');
var util = require('util');

// --------------------------------------------

module.exports = function(args){
  start()
  .then(function(){
    return getTransferInfo(args);
  })
  .then(function(got){
    return canCopyFiles(got.transferInfo);
  })
  .catch(function(err){
    console.error(f('Error: %s', err.message).red);
    console.error('No changes were made.'.red);
    process.exit(1);
  })
  .then(function(got){
    return copyFiles(got.transferInfo);
  })
  .then(function(){
    console.log('All done!'.green.bold);
    process.exit(0);
  })
  .catch(function(err){
    console.error(f('Error: %s', err.message).red);
    process.exit(1);
  })
  ;
};

// --------------------------------------------

var f = util.format.bind(util);

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

function start(){
  console.log('Initializing new Hoxy project in current directory');
  return await('started').keep('started');
}

// --------------------------------------------

function canCopyFiles(transferInfo){
  var unignorables = transferInfo.filter(function(info){
    return !info.ignorable;
  });
  var proms = unignorables.map(function(info){
    var prom = await('target', 'exists')
    .keep('target', info.target);
    fs.exists(info.target, function(exists){
      console.log(f('Checking %s already exists? %s', info.target, (exists ? 'YES'.red : 'NO'.green)));
      prom.keep('exists', exists);
    });
    return prom;
  });
  var prom = await('done');
  await.all(proms)
  .onfail(prom.fail.bind(prom))
  .onkeep(function(gots){
    var existing = gots.filter(function(got){
      return got.exists;
    }).map(function(got){
      return got.target;
    });
    if (existing.length === 0){
      prom.keep('done');
    } else {
      prom.fail(new Error(f('Existing file(s) would be clobbered: %s', existing.join(' '))));
    }
  });
  return prom;
}

// --------------------------------------------

function copyFiles(transferInfo){
  var proms = transferInfo.map(function(info){
    var prom = await('done');
    var doneProm;
    if (typeof info.source === 'object'){
      doneProm = saveJson(info.source, info.target);
    } else {
      doneProm = copyFile(info.source, info.target);
    }
    doneProm
    .onkeep(function(got){
      console.log(f('created %s', info.target).green);
      prom.keep('done');
    })
    .onfail(function(err){
      var mess = err.message;
      if (info.ignorable && /EEXIST/.test(mess)){
        console.log(f('Checking %s already exists? ' + 'YES'.yellow, info.target));
        prom.keep('done')
      } else {
        prom.fail(err);
      }
    });
    return prom;
  });
  return await.all(proms);
}

// --------------------------------------------

function saveJson(obj, target){
    var prom = await('done');
    try {
      var objString = JSON.stringify(obj, null, '  ') + '\n';
    } catch(err) {
      prom.fail(err);
      return;
    }
    fs.writeFile(target, objString, {
      encoding: 'utf8',
      flag: 'wx' // fail if exists
    }, prom.nodify('done'));
    return prom;
}

// --------------------------------------------

function copyFile(source, target){
    var prom = await('done');
    var sourceStream = fs.createReadStream(source);
    var targetStream = fs.createWriteStream(target,{flags:'wx'}); // fail if exists
    sourceStream.pipe(targetStream);
    sourceStream.on('end', prom.keep.bind(prom, 'done'));
    function failer(err){
      prom.fail(err);
    }
    sourceStream.on('error', failer);
    targetStream.on('error', failer);
    return prom;
}








