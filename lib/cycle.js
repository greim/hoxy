/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import Request from './request'
import Response from './response'
import streams from './streams'
import awate from 'await'
import mkdirp from 'mkdirp'
import _ from 'lodash'
import { Server as DocRootServer } from 'node-static'
import http from 'http'
import https from 'https'
import url from 'url'
import fs from 'fs'
import util from 'util'
import PATH from 'path'
import zlib from 'zlib'
import { EventEmitter } from 'events'
import co from 'co'
import adapt from 'ugly-adapter'

let staticServer = (() => {

  let getStatic = (() => {
    let statics = {}
    return docroot => {
      let stat = statics[docroot]
      if (!stat) {
        stat = statics[docroot] = new DocRootServer(docroot)
      }
      return stat
    }
  })()

  // Start up the server and serve out of various docroots.
  let server = http.createServer((req, resp) => {
    let docroot = req.headers['x-hoxy-static-docroot']
    let stat = getStatic(docroot)
    stat.serve(req, resp)
  }).listen(0)

  return server
})()

function requestWithProxy(opts, callback) {
  let requestClass = (/https/i).test(opts.protocol) ? https : http

  if (opts.proxy) {
    let proxyInfo = url.parse(opts.proxy)
    let proxyPort = proxyInfo.port
    let proxyHostname = proxyInfo.hostname
    let proxyPath = 'http://' + opts.hostname + (opts.port ? ':' + opts.port : '') + opts.path
    opts.hostname = proxyHostname
    opts.port = proxyPort
    opts.path = proxyPath
  }
  return requestClass.request(opts, callback)
}

/*
 * This check() function made me scratch my head when I came back to
 * it months later. It simply does too many things. It still isn't perfect,
 * but after rewriting as pseudo-synchronous logic, it's a bit easier to follow.
 * For posterity, here's what it does. At the highest level, it returns
 * a (promise on a) boolean indicating whether or not the passed file was
 * created. IF the strategy is NOT 'mirror' it returns false since 'mirror'
 * is the only strategy that creates files. ELSE IF the file exists
 * it returns false. ELSE it has a side effect of creating the file
 * by requesting out to the remote server and writing the result to the
 * file, then returns true.
 */
function check(strategy, file, req, upstreamProxy) {
  let parsed = url.parse(file)
  file = parsed.pathname // stripped of query string.

  return co(function*() {
    if (strategy !== 'mirror') {
      return false
    }
    try {
      yield adapt(fs.stat, file)
      return false
    } catch(ex) {
      // file does not exist, so continue
    }
    // TODO: test coverage for mkdirp
    yield adapt(mkdirp, PATH.dirname(file))
    let mirrResp = yield new Promise((resolve, reject) => {
      let mirrorReq = requestWithProxy({
        protocol: req.protocol,
        proxy: upstreamProxy,
        method: 'GET',
        hostname: req.hostname,
        port: req.port,
        path: req.url,
      }, resolve)
      mirrorReq.on('error', reject)
      mirrorReq.end('')
    })

    if (mirrResp.statusCode !== 200) {
      throw new Error(`mirroring failed: ${req.fullUrl()} => ${mirrResp.statusCode}`)
    }
    let writeToFile = fs.createWriteStream(file)
    if (mirrResp.headers['content-encoding'] === 'gzip') {
      // TODO: test coverage
      let gunzip = zlib.createGunzip()
      mirrResp = mirrResp.pipe(gunzip)
    }
    yield new Promise((resolve, reject) => {
      mirrResp.pipe(writeToFile)
      mirrResp.on('end', resolve)
      writeToFile.on('error', reject)
    })
  })
}

// ---------------------------

export default class Cycle extends EventEmitter {

  constructor(proxy) {
    super()
    this._proxy = proxy
    this._request = new Request()
    this._response = new Response()
    this._request.on('log', log => this.emit('log', log))
    this._response.on('log', log => this.emit('log', log))
  }

  data(name, val) {
    if (!this._userData) {
      this._userData = {}
    }
    if (arguments.length === 2) {
      this._userData[name] = val
    }
    return this._userData[name]
  }

  serve(opts, cb, ctx) {

    let prom = co.call(this, function*() {

      // First, get all our ducks in a row WRT to
      // options, setting variables, etc.
      ctx = ctx || this
      let req = this._request
      let resp = this._response
      if (typeof opts === 'string') {
        opts = { path: opts }
      }
      opts = _.extend({
        docroot: '/',
        path: req.url,
        strategy: 'replace',
      }, opts)
      let { docroot, path, strategy } = opts
      if (!/\/$/.test(docroot)) { docroot = docroot + '/' }
      if (!/^\//.test(path)) { path = '/' + path }
      let headers = _.extend({
        'x-hoxy-static-docroot': docroot,
      }, req.headers)
      delete headers['if-none-match']
      delete headers['if-modified-since']
      let fullPath = docroot + path.substring(1)

      // Now call the static file service.
      let created = yield check(strategy, fullPath, req, this._proxy._upstreamProxy)
      if (created) {
        this.emit('log', {
          level: 'info',
          message: 'copied ' + req.fullUrl() + ' to ' + fullPath,
        })
      }
      let staticResp = yield new Promise((resolve, reject) => {
        let addr = staticServer.address()
        http.get({
          hostname: addr.address,
          port: addr.port,
          headers: headers,
          path: path,
        }, resolve)
        .on('error', reject)
      })
      let code = staticResp.statusCode
        , useResponse
        , isError
      if (/^2\d\d$/.test(code)) {
        useResponse = true
      } else if (/^4\d\d$/.test(code)) {
        if (strategy === 'replace') {
          useResponse = true
        } else if (strategy === 'mirror') {
          isError = true
        }
      } else {
        isError = true // nope
      }
      if (isError) {
        let message = util.format(
          'Failed to serve static file: %s => %s. Static server returned %d. Strategy: %s',
          req.fullUrl(),
          fullPath,
          staticResp.statusCode,
          strategy
        )
        throw new Error(message)
      } else if (useResponse) {
        resp._setHttpSource(staticResp)
      }
    })
    prom.then(
      () => cb.call(ctx, null),
      err => cb.call(ctx, err)
    )
    return prom
  }

  _setPhase(phase) {
    this._phase = this._request.phase = this._response.phase = phase
  }

  _sendToServer() {

    let req = this._request
      , resp = this._response
      , upstreamProxy = this._proxy._upstreamProxy

    return awate('fromServerProm', 'done')
    .run(prom => {
      let fromServerProm = awate('fromServer')
      prom.keep('fromServerProm', fromServerProm)
      let outReq, source, brake
      if (resp._populated) {
        fromServerProm.keep('fromServer', false)
        prom.keep('done')
      } else {
        req._finalize()
        outReq = requestWithProxy({
          protocol: req.protocol,
          proxy: upstreamProxy,
          hostname: req.hostname,
          port: req.port || req._getDefaultPort(),
          method: req.method,
          path: req.url,
          headers: req.headers,
        }, fromServer => fromServerProm.keep('fromServer', fromServer))
        outReq.on('error', err => fromServerProm.fail(err))
        source = req._source
        let slow = req.slow()
        let rate = slow.rate
        if (rate > 0) {
          brake = streams.brake(rate)
        }
        let latency = slow.latency
        if (latency > 0) {
          setTimeout(send, latency) // TODO: set timeout calculating time since request was received, in order to make latency behave as a limit
        } else {
          send()
        }
      }
      function send() {
        // TODO: test to ensure that JsonReader, DomReader, ParamReader (etc) throw errors here which propagate to an error in the log output.
        if (brake) {
          source = source.pipe(brake)
        }
        source.on('error', err => prom.fail(err))
        source.on('end', () => prom.keep('done'))
        source.pipe(outReq)
        let tees = req._tees()
        tees.forEach(writable => source.pipe(writable))
      }
    })
  }

  _sendToClient(outResp) {
    let resp = this._response
    return awate('response-sent')
    .run(prom => {
      resp._finalize()
      outResp.writeHead(resp.statusCode, resp.headers)
      let source = resp._source
      let brake
      let slow = resp.slow()
      let rate = slow.rate
      if (rate > 0) {
        brake = streams.brake(rate)
      }
      let latency = slow.latency
      if (latency > 0) {
        setTimeout(send, latency)
      } else {
        send()
      }
      function send() {
        // TODO: test to ensure that JsonReader, DomReader, ParamReader (etc) throw errors here which propagate to an error in the log output.
        source.on('error', err => prom.fail(err))
        source.on('end', () => prom.keep('response-sent'))
        if (brake) {
          source = source.pipe(brake)
        }
        source.pipe(outResp)
        let tees = resp._tees()
        tees.forEach(writable => source.pipe(writable))
      }
    })
  }

  _start() {
    // for now, an immediately-kept promise
    return awate('started').keep('started')
  }
}
