/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
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
import { SNISpoofer } from './sni-spoofer'
import net from 'net'
import https from 'https'
import { ThrottleGroup } from 'stream-throttle'

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
  'buffer': () => {},
  'string': () => {},
}

function wrapAsync(intercept) {
  return function(req, resp, cycle) {
    let result = intercept.call(this, req, resp, cycle)
    if (result && typeof result.then === 'function') {
      return result
    } else if (result && typeof result.next === 'function') {
      return co(result)
    } else {
      return Promise.resolve()
    }
  }
}

function asIntercept(opts, intercept) {
  if (opts.as) {
    return co.wrap(function*(req, resp, cycle) {
      let r = opts.phase === 'request' ? req : resp
      yield r._load()
      asHandlers[opts.as](r)
      yield intercept.call(this, req, resp, cycle)
    })
  } else {
    return intercept
  }
}

let otherIntercept = (() => {
  let ctPatt = /;.*$/
  function test(tester, testee, isUrl) {
    if (tester === undefined) { return true }
    if (tester instanceof RegExp) { return tester.test(testee) }
    if (typeof tester === 'function') { return !!tester(testee) }
    if (isUrl) { return getUrlTester(tester)(testee) }
    return tester == testee // eslint-disable-line eqeqeq
  }
  return function(opts, intercept) {
    return function(req, resp, cycle) {

      let isReq = opts.phase === 'request' || opts.phase === 'request-sent'
        , reqContentType = req.headers['content-type']
        , respContentType = resp.headers['content-type']
        , contentType = isReq ? reqContentType : respContentType
        , reqMimeType = reqContentType ? reqContentType.replace(ctPatt, '') : undefined
        , respMimeType = respContentType ? respContentType.replace(ctPatt, '') : undefined
        , mimeType = isReq ? reqMimeType : respMimeType
        , isMatch = 1

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
        return intercept.call(this, req, resp, cycle)
      } else {
        return Promise.resolve()
      }
    }
  }
})()

export default class Proxy extends EventEmitter {

  constructor(opts = {}) {
    super()

    if (opts.reverse) {
      let reverse = opts.reverse
      if (!/^https?:\/\/[^:]+(:\d+)?$/.test(reverse)) {
        throw new Error(`invalid value for reverse: "${opts.reverse}"`)
      }
      this._reverse = reverse
    }

    if (opts.upstreamProxy) {
      let proxy = opts.upstreamProxy
      if (!/^https?:\/\//.test(proxy)) {
        proxy = 'http://' + proxy
      }
      if (!/^https?:\/\/[^:]+:\d+$/.test(proxy)) {
        throw new Error(`invalid value for upstreamProxy: "${opts.upstreamProxy}"`)
      }
      this._upstreamProxy = proxy
    }

    if (opts.slow) {
      this.slow(opts.slow)
    }

    this._tls = opts.tls

    this._intercepts = Object.freeze({
      'request': [],
      'request-sent': [],
      'response': [],
      'response-sent': [],
    })

    let createServer = opts.tls
      ? https.createServer.bind(https, opts.tls)
      : http.createServer.bind(http)

    this._server = createServer((fromClient, toClient) => {

      let cycle = new Cycle(this)
        , req = cycle._request
        , resp = cycle._response

      cycle.on('log', log => this.emit('log', log))

      co.call(this, function*() {
        req._setHttpSource(fromClient, opts.reverse)
        try { yield this._runIntercepts('request', cycle) }
        catch(ex) { this._emitError(ex, 'request') }
        let partiallyFulfilledRequest = yield cycle._sendToServer()
        try { yield this._runIntercepts('request-sent', cycle) }
        catch(ex) { this._emitError(ex, 'request-sent') }
        if (partiallyFulfilledRequest === undefined) {
          this.emit('log', {
            level: 'debug',
            message: `server fetch skipped for ${req.fullUrl()}`,
          })
        } else {
          let responseFromServer = yield partiallyFulfilledRequest.receive()
          resp._setHttpSource(responseFromServer)
        }
        try { yield this._runIntercepts('response', cycle) }
        catch(ex) { this._emitError(ex, 'response') }
        yield cycle._sendToClient(toClient)
        try { yield this._runIntercepts('response-sent', cycle) }
        catch(ex) { this._emitError(ex, 'response-sent') }
      }).catch(ex => {
        this.emit('error', ex)
        this.emit('log', {
          level: 'error',
          message: ex.message,
          error: ex,
        })
      })
    })

    this._server.on('error', err => {
      this.emit('error', err)
      this.emit('log', {
        level: 'error',
        message: 'proxy server error: ' + err.message,
        error: err,
      })
    })

    if (opts.certAuthority) {

      let { key, cert } = opts.certAuthority
        , spoofer = new SNISpoofer(key, cert)
        , SNICallback = spoofer.callback()
        , cxnEstablished = new Buffer(`HTTP/1.1 200 Connection Established\r\n\r\n`, 'ascii')

      spoofer.on('error', err => this.emit('error', err))
      spoofer.on('generate', serverName => {
        this.emit('log', {
          level: 'info',
          message: `generated fake credentials for ${serverName}`,
        })
      })

      this._server.on('connect', (request, clientSocket, head) => {
        let addr = this._tlsSpoofingServer.address()
        let serverSocket = net.connect(addr.port, addr.address, () => {
          clientSocket.write(cxnEstablished)
          serverSocket.write(head)
          clientSocket
          .pipe(serverSocket)
          .pipe(clientSocket)
        })
      })

      this._tlsSpoofingServer = https.createServer({
        key,
        cert,
        SNICallback,
      }, (fromClient, toClient) => {
        let shp = 'https://' + fromClient.headers.host
          , fullUrl = shp + fromClient.url
          , addr = this._server.address()
        let toServer = http.request({
          host: 'localhost',
          port: addr.port,
          method: fromClient.method,
          path: fullUrl,
          headers: fromClient.headers,
        }, fromServer => {
          toClient.writeHead(fromServer.statusCode, fromServer.headers)
          fromServer.pipe(toClient)
        })
        fromClient.pipe(toServer)
      })
    }
  }

  listen(port) {
    // TODO: test bogus port
    this._server.listen.apply(this._server, arguments)
    let message = 'proxy listening on ' + port
    if (this._tls) {
      message = 'https ' + message
    }
    if (this._reverse) {
      message += ', reverse ' + this._reverse
    }
    this.emit('log', {
      level: 'info',
      message: message,
    })
    if (this._tlsSpoofingServer) {
      this._tlsSpoofingServer.listen(0, 'localhost')
    }
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
    intercept = wrapAsync(intercept)
    intercept = asIntercept(opts, intercept) // TODO: test asIntercept this, args, async
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
    return this
  }

  slow(opts) {
    if (opts) {
      let slow = this._slow = { opts, latency: 0 };
      ['rate', 'latency', 'up', 'down'].forEach(name => {
        let val = opts[name]
        if (val === undefined) { return }
        if (typeof val !== 'number') {
          throw new Error(`slow.${name} must be a number`)
        }
        if (val < 0) {
          throw new Error(`slow.${name} must be >= 0`)
        }
      })
      if (opts.rate) {
        slow.rate = new ThrottleGroup({ rate: opts.rate })
      }
      if (opts.latency) {
        slow.latency = opts.latency
      }
      if (opts.up) {
        slow.up = new ThrottleGroup({ rate: opts.up })
      }
      if (opts.down) {
        slow.down = new ThrottleGroup({ rate: opts.down })
      }
    } else {
      if (!this._slow) {
        return undefined
      } else {
        return this._slow.opts
      }
    }
  }

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
        const stopLogging = self._logLongTakingIntercept(phase, req)
        yield intercept.call(cycle, req, resp, cycle)
        stopLogging()
      }
    })
  }

  _logLongTakingIntercept(phase, req) {
    const t = setTimeout(() => {
      this.emit('log', {
        level: 'debug',
        message: 'an async ' + phase + ' intercept is taking a long time: ' + req.fullUrl(),
      })
    }, 5000)

    return function stopLogging() {
      clearTimeout(t)
    }
  }
}

// TODO: test direct url string comparison, :id tags, wildcard, regexp
// TODO: test line direct url string comparison, :id tags, wildcard
let getUrlTester = (() => {
  let sCache = {}
    , rCache = {}
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
