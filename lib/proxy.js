/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import Base from './base'
import http from 'http'
import Cycle from './cycle'
import cheerio from 'cheerio'
import serializer from './serializer'
import querystring from 'querystring'
import RoutePattern from 'route-pattern'
import isTypeXml from './is-xml'
import { EventEmitter } from 'events'

// --------------------------------------------------

function isAsync(fun) {
  return fun.length >= 3
}

function filterIntercept(opts, intercept) {
  if (opts.filter) {
    var origIntercept = intercept
    intercept = (req, resp, done) => {
      if (opts.filter(req, resp)) {
        origIntercept.apply(this, arguments)
        if (!isAsync(origIntercept)) {
          done()
        }
      } else {
        done()
      }
    }
  }
  return intercept
}

function asIntercept(opts, intercept) {
  if (opts.as) {
    var origIntercept = intercept
    intercept = function(req, resp, done) {
      var args = arguments
      var r = opts.phase === 'request' ? req : resp
      r._load(err => {
        if (err) {
          done(err)
        } else {
          try{
            asHandlers[opts.as](r)
            origIntercept.apply(this, args)
            if (!isAsync(origIntercept)) {
              done()
            }
          } catch(err2) {
            done(err2)
          }
        }
      })
    }
  }
  return intercept
}

var otherIntercept = (() => {
  var ctPatt = /;.*$/
  function test(tester, testee, isUrl) {
    if (tester === undefined) { return true }
    if (tester instanceof RegExp) { return tester.test(testee) }
    if (isUrl) { return getUrlTester(tester)(testee) }
    return tester == testee // intentional double-equals
  }
  return function(opts, intercept) {
    var isReq = opts.phase === 'request' || opts.phase === 'request-sent'
    return function(req, resp, done) {
      var reqContentType = req.headers['content-type']
      var respContentType = resp.headers['content-type']
      var reqMimeType = reqContentType ? reqContentType.replace(ctPatt, '') : undefined
      var respMimeType = respContentType ? respContentType.replace(ctPatt, '') : undefined
      var contentType, mimeType
      contentType = isReq ? reqContentType : respContentType
      mimeType = isReq ? reqMimeType : respMimeType
      var isMatch = 1

      isMatch &= test(opts.contentType, contentType)
      isMatch &= test(opts.mimeType, mimeType)
      isMatch &= test(opts.requestContentType, reqContentType)
      isMatch &= test(opts.responseContentType, respContentType)
      isMatch &= test(opts.requestMimeType, reqMimeType)
      isMatch &= test(opts.responseMimeType, respMimeType)
      isMatch &= test(opts.protocol, req.protocol)
      isMatch &= test(opts.host, req.headers.host)
      isMatch &= test(opts.hostname, req.hostname)
      isMatch &= test(opts.port, req.port)
      isMatch &= test(opts.method, req.method)
      isMatch &= test(opts.url, req.url, true)
      isMatch &= test(opts.fullUrl, req.fullUrl(), true)
      if (isMatch) {
        intercept.apply(this, arguments)
        if (!isAsync(intercept)) {
          done()
        }
      } else {
        done()
      }
    }
  }
})()

export default class Proxy extends EventEmitter {

  constructor(opts = {}) {
    super()
    var thisProxy = this

    if (opts.reverse) {
      this._reverse = opts.reverse
    }

    if (opts.upstreamProxy) {
      this._upstreamProxy = opts.upstreamProxy
    }

    this._intercepts = {
      'request': [],
      'request-sent': [],
      'response': [],
      'response-sent': [],
    }

    // --------------------------------------------------

    this._server = http.createServer((inReq, outResp) => {

      // New cycle for each request.
      var cycle = new Cycle(this)
        , req = cycle._request
        , resp = cycle._response

      cycle.on('log', log => {
        this.emit('log', log)
      })

      cycle._start()
      .then(() => {
        req._setHttpSource(inReq, opts.reverse)
        return undefined
      })
      .then(() => {
        cycle._setPhase('request')
        return this._runIntercepts('request', cycle)
        // <= promise 'done'
      })
      .catch(err => {
        this.emit('log', {
          level: 'error',
          message: 'request-phase error: ' + err.message,
          error: err,
        })
        return undefined
      })
      .then(() => {
        return cycle._sendToServer()
        // <= promise 'inRespProm', 'done'
      })
      .then(() => {
        cycle._setPhase('request-sent')
        return this._runIntercepts('request-sent', cycle)
        // <= promise 'done'
      })
      .catch(err => {
        this.emit('log', {
          level: 'error',
          message: err.message,
          error: err,
        })
        return undefined
      })
      .then(got => {
        return got.inRespProm // gotten several thens ago
        // <= promise 'inResp'
      })
      .then(got => {
        if (!got.inResp) {
          this.emit('log', {
            level: 'debug',
            message: 'server fetch skipped for ' + req.fullUrl(),
          })
        } else {
          resp._setHttpSource(got.inResp)
        }
        return undefined
      })
      .then(() => {
        cycle._setPhase('response')
        return this._runIntercepts('response', cycle)
        // <= promise 'done'
      })
      .catch(err => {
        this.emit('log', {
          level: 'error',
          message: 'response-phase error: ' + err.message,
          error: err,
        })
        return undefined
      })
      .then(() => {
        return cycle._sendToClient(outResp)
        // <= promise 'response-sent'
      })
      .then(() => {
        cycle._setPhase('response-sent')
        return this._runIntercepts('response-sent', cycle)
        // <= promise 'done'
      })
      .catch(err => {
        this.emit('log', {
          level: 'error',
          message: err.message,
          error: err,
        })
        return undefined
      })
    })

    this._server.on('error', err => {
      this.emit('log', {
        level: 'error',
        message: 'proxy server error: ' + err.message,
        error: err,
      })
    })
  }

  listen(port) {
    // TODO: test bogus port
    this._server.listen.apply(this._server, arguments)
    var message = 'proxy listening on ' + port
    if (this._reverse) {
      message += ', reverse ' + this._reverse
    }
    this.emit('log', {
      level: 'info',
      message: message,
    })
    return this
  }

  intercept(opts, intercept) {
    // TODO: test string versus object
    // TODO: test opts is undefined
    if (typeof opts === 'string') {
      opts = { phase: opts }
    }
    var phase = opts.phase
    if (!this._intercepts.hasOwnProperty(phase)) {
      throw new Error(phase ? 'invalid phase ' + phase : 'missing phase')
    }
    if (opts.as) {
      if (!asHandlers[opts.as]) {
        // TODO: test bogus as
        throw new Error('invalid as: ' + opts.as)
      }
      if (phase === 'request-sent' || phase === 'response-sent') {
        // TODO: test intercept as in read only phase
        throw new Error('cannot intercept ' + opts.as + ' in phase ' + phase)
      }
    }
    intercept = asIntercept(opts, intercept) // TODO: test asIntercept this, args, async
    intercept = filterIntercept(opts, intercept) // TODO: test filterIntercept this, args, async
    intercept = otherIntercept(opts, intercept) // TODO: test otherIntercept this, args, async
    this._intercepts[phase].push(intercept)
  }

  close() {
    this._server.close.apply(this._server, arguments)
  }

  log(events, cb) {
    var listenTo = {}
    events.split(/\s/)
    .map(s => s.trim())
    .filter(s => !!s)
    .forEach(s => listenTo[s] = true)
    var writable
    if (!cb) {
      writable = process.stderr
    } else if (cb.write) {
      writable = cb
    }
    this.on('log', log => {
      if (!listenTo[log.level]) { return }
      var message = log.error ? log.error.stack : log.message
      if (writable) {
        writable.write(log.level.toUpperCase() + ': ' + message + '\n')
      } else if (typeof cb === 'function') {
        cb(log)
      }
    })
  }

  // --------------------------------------------------

  _runIntercepts(phase, cycle) {
    var req = cycle._request,
      resp = cycle._response,
      self = this
    var intercepts = this._intercepts[phase]
    return serializer.serialize(intercepts, (intercept, next) => {
      if (isAsync(intercept)) {
        var t = setTimeout(() => {
          self.emit('log', {
            level: 'debug',
            message: 'an async ' + phase + ' intercept is taking a long time: ' + req.fullUrl(),
          })
        }, 5000)
        intercept.call(cycle, req, resp, err => {
          clearTimeout(t)
          next(err)
        })
      } else {
        try { intercept.call(cycle, req, resp) }
        catch(err) { next(err) }
        next()
      }
    })
  }
}

// ---------------------------------------------------

// TODO: test direct url string comparison, :id tags, wildcard, regexp
// TODO: test line direct url string comparison, :id tags, wildcard
var getUrlTester = (() => {
  var sCache = {},
    rCache = {}
  return testUrl => {
    if (testUrl instanceof RegExp) {
      if (!rCache[testUrl]) {
        rCache[testUrl] = u => testUrl.test(u)
      }
      return rCache[testUrl]
    } else {
      if (!sCache[testUrl]) {
        if (!testUrl) {
          sCache[testUrl] = u => testUrl === u
        } else {
          var pattern = RoutePattern.fromString(testUrl)
          sCache[testUrl] = u => pattern.matches(u)
        }
      }
      return sCache[testUrl]
    }
  }
})()

// TODO: test all five for both requet and response
var asHandlers = {
  '$': r => {
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    var contentType = r.headers['content-type']
    var isXml = isTypeXml(contentType)
    r.$ = cheerio.load(r._source.toString(), { xmlMode: isXml })
  },
  'json': r => {
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    r.json = JSON.parse(r._source.toString())
  },
  'params': r => {
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    r.params = querystring.parse(r._source.toString())
  },
  'buffers': () => {},
  'string': () => {},
}
