/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import awate from 'await'

// ---------------------------

/*
 * For executing potentially async logic serially against a list, failing on
 * error. Returns a promise when all done. Example:
 *
 *   require('./serializer')([0, 1, 2, 3], function(item, next) {
 *     ...do stuff...
 *     next()
 *   })
 *   require('./serializer')([0, 1, 2, 3], function(item, next) {
 *     ...do stuff...
 *     next(new Error('something bad happened'))
 *   })
 */
export default {
  serialize(items, itemCallback, ctx) {
    ctx = ctx || this
    var prom = awate('done')
    var len = items.length
    var idx = 0
    ; (function next(err) {
      if (err) {
        prom.fail(err)
      } else if (idx < len) {
        var item = items[idx++]
        try { itemCallback.call(ctx, item, next) }
        catch(ex) { prom.fail(ex) }
      } else {
        prom.keep('done')
      }
    })()
    return prom
  },
}
