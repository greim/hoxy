/**
 * using a regexp replacement, replace the location header value as well as do a global replacement in the response body
 *
 * useful for repointing static file refs to your proxy
 *
 * use:
 * response: @change-location('programmingdrunk\.com', 'localhost:8080')
 * @param api
 */

exports.run = function(api){
    var res = api.getResponseInfo();


    var fromRegexp = new RegExp(api.arg(0), 'gi');
    var to = api.arg(1);

    if(res.headers['location']){
        res.headers['location'] = res.headers['location'].replace(fromRegexp, to);
    }

    var ct = api.getResponseInfo().headers['content-type'];
    if (ct && ct.indexOf('html')>-1) {
        var html = api.getResponseBody();
        try {
            api.setResponseBody(html.replace(fromRegexp, to));
            api.notify();
        } catch (ex) {
            api.notify(ex);
        }
    } else {
        api.notify();
    }


};
