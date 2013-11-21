var HTTP = require('http');
var URL = require('url');
var HTS = require('../lib/http-transaction-state.js');

/**
 *
 * specialized version of internal-redirect
 *
 * say the static url for a resource is: //localhost:8080/static/2931fd4/css/stuff.css
 * you have a local server ready to server up that4 resource at //localhost:7777/css/stuff.css
 *
 * then do this:
 *
 * request: if $ext eq "css",  @rewrite-static('http://localhost:7777', '/staticVer/12342354/css', '/css')
 *
 * @param api
 */
exports.run = function(api) {
    var url = api.arg(0);
    var replaceRegexp = new RegExp(api.arg(1));
    var replaceWith = api.arg(2);

    var reqUrl = api.getRequestInfo().url.replace(replaceRegexp, replaceWith);

    var pUrl = URL.parse(url);
    var port = parseInt(pUrl.port) || 80;
    var hostname = pUrl.hostname;

    var client = HTTP.createClient(port, hostname);

    var clientReq = client.request('GET', reqUrl, { host: hostname });
    clientReq.end();
    clientReq.on('response', function(resp) {
        var hts = new HTS.HttpTransactionState();
        hts.setResponse(resp, function(respInf){
            api.setResponseInfo(respInf);
            api.notify();
        });
    });
};