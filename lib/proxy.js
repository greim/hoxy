/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import http from 'http'
import Cycle from './cycle'
import cheerio from 'cheerio'
import querystring from 'querystring'
import RoutePattern from 'route-pattern'
import isTypeXml from './is-xml'
import { EventEmitter } from 'events'
import co from 'co'
import adapt from 'ugly-adapter'

// --------------------------------------------------

function isAsync(fun) {
  return fun.length >= 3
}

function filterIntercept(opts, intercept) {
  if (opts.filter) {
    let origIntercept = intercept
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
    let origIntercept = intercept
    intercept = function(req, resp, done) {
      let args = arguments
      let r = opts.phase === 'request' ? req : resp
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

let otherIntercept = (() => {
  let ctPatt = /;.*$/
  function test(tester, testee, isUrl) {
    if (tester === undefined) { return true }
    if (tester instanceof RegExp) { return tester.test(testee) }
    if (isUrl) { return getUrlTester(tester)(testee) }
    return tester == testee // intentional double-equals
  }
  return function(opts, intercept) {
    let isReq = opts.phase === 'request' || opts.phase === 'request-sent'
    return function(req, resp, done) {
      let reqContentType = req.headers['content-type']
      let respContentType = resp.headers['content-type']
      let reqMimeType = reqContentType ? reqContentType.replace(ctPatt, '') : undefined
      let respMimeType = respContentType ? respContentType.replace(ctPatt, '') : undefined
      let contentType, mimeType
      contentType = isReq ? reqContentType : respContentType
      mimeType = isReq ? reqMimeType : respMimeType
      let isMatch = 1

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

    if (opts.reverse) {
      this._reverse = opts.reverse
    }

    if (opts.upstreamProxy) {
      this._upstreamProxy = opts.upstreamProxy
    }

    this._intercepts = Object.freeze({
      'request': [],
      'request-sent': [],
      'response': [],
      'response-sent': [],
    })

    // --------------------------------------------------

    this._server = http.createServer((fromClient, toClient) => {

      let cycle = new Cycle(this)
        , req = cycle._request
        , resp = cycle._response

      cycle.on('log', log => this.emit('log', log))

      co.call(this, function*() {
        req._setHttpSource(fromClient, opts.reverse)
        try { yield this._runIntercepts('request', cycle) }
        catch(ex) { this._emitError(ex, 'request') }
        let { fromServerProm } = yield cycle._sendToServer()
        try { yield this._runIntercepts('request-sent', cycle) }
        catch(ex) { this._emitError(ex, 'request-sent') }
        let { fromServer } = yield fromServerProm
        if (!fromServer) {
          this.emit('log', {
            level: 'debug',
            message: `server fetch skipped for ${req.fullUrl()}`,
          })
        } else {
          resp._setHttpSource(fromServer)
        }
        try { yield this._runIntercepts('response', cycle) }
        catch(ex) { this._emitError(ex, 'response') }
        yield cycle._sendToClient(toClient)
        try { yield this._runIntercepts('response-sent', cycle) }
        catch(ex) { this._emitError(ex, 'response-sent') }
      }).catch(ex => {
        this.emit('log', {
          level: 'error',
          message: ex.message,
          error: ex,
        })
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
    let message = 'proxy listening on ' + port
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
    let phase = opts.phase
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

  address() {
    return this._server.address.apply(this._server, arguments)
  }

  log(events, cb) {
    let listenTo = {}
    events.split(/\s/)
    .map(s => s.trim())
    .filter(s => !!s)
    .forEach(s => listenTo[s] = true)
    let writable
    if (!cb) {
      writable = process.stderr
    } else if (cb.write) {
      writable = cb
    }
    this.on('log', log => {
      if (!listenTo[log.level]) { return }
      let message = log.error ? log.error.stack : log.message
      if (writable) {
        writable.write(log.level.toUpperCase() + ': ' + message + '\n')
      } else if (typeof cb === 'function') {
        cb(log)
      }
    })
  }

  // --------------------------------------------------

  _emitError(ex, phase) {
    this.emit('log', {
      level: 'error',
      message: `${phase} phase error: ${ex.message}`,
      error: ex,
    })
  }

  _runIntercepts(phase, cycle) {

    let req = cycle._request
      , resp = cycle._response
      , self = this
      , intercepts = this._intercepts[phase]

    return co(function*() {
      cycle._setPhase(phase)
      for (let intercept of intercepts) {
        if (isAsync(intercept)) {
          let t = setTimeout(() => {
            self.emit('log', {
              level: 'debug',
              message: 'an async ' + phase + ' intercept is taking a long time: ' + req.fullUrl(),
            })
          }, 5000)
          yield adapt.method(intercept, 'call', cycle, req, resp)
          clearTimeout(t)
        } else {
          intercept.call(cycle, req, resp)
        }
      }
    })
  }
}

// ---------------------------------------------------

// TODO: test direct url string comparison, :id tags, wildcard, regexp
// TODO: test line direct url string comparison, :id tags, wildcard
let getUrlTester = (() => {
  let sCache = {},
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
          let pattern = RoutePattern.fromString(testUrl)
          sCache[testUrl] = u => pattern.matches(u)
        }
      }
      return sCache[testUrl]
    }
  }
})()

// TODO: test all five for both requet and response
let asHandlers = {
  '$': r => {
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    let contentType = r.headers['content-type']
    let isXml = isTypeXml(contentType)
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
