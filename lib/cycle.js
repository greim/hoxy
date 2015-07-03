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
import nodeStatic from 'node-static'
import http from 'http'
import https from 'https'
import url from 'url'
import fs from 'fs'
import util from 'util'
import PATH from 'path'
import zlib from 'zlib'
import { EventEmitter } from 'events'

let isSecure = /https/i

// ---------------------------

let getStatic = (() => {
  let statics = {}
  return docroot => {
    let stat = statics[docroot]
    if (!stat) {
      stat = statics[docroot] = new nodeStatic.Server(docroot)
    }
    return stat
  }
})()

// Start up the server and serve out of various docroots.
let staticServer = http.createServer((req, resp) => {
  let docroot = req.headers['x-hoxy-static-docroot']
  let stat = getStatic(docroot)
  stat.serve(req, resp)
})
staticServer.listen(0)

// ---------------------------

// Ensure the existence of a file before it's requested,
// IF required by the given strategy.
function check(strategy, file, req, upstreamProxy) {
  let parsed = url.parse(file)
  file = parsed.pathname // stripped of query string.
  return awate('created').run(prom => {
    if (strategy !== 'mirror') {
      prom.keep('created', false)
    } else {
      fs.exists(file, exists => {
        if (exists) {
          prom.keep('created', false)
        } else {
          let mirrorReq = requestWithProxy({
            protocol: req.protocol,
            proxy: upstreamProxy,
            method: 'GET',
            hostname: req.hostname,
            port: req.port,
            path: req.url,
          }, mirrResp => {
            if (mirrResp.statusCode !== 200) {
              prom.fail(new Error('mirroring failed: ' + req.fullUrl() + ' => ' + mirrResp.statusCode))
              return
            }
            // TODO: test coverage for mkdirp
            mkdirp(PATH.dirname(file), err => {
              if (err) {
                prom.fail(err)
                return
              }
              let writable = fs.createWriteStream(file)
              let readable = mirrResp
              if (mirrResp.headers['content-encoding'] === 'gzip') {
                // TODO: test coverage
                let gunzip = zlib.createGunzip()
                readable = readable.pipe(gunzip)
              }
              readable.pipe(writable)
              readable.on('end', () => {
                prom.keep('created', true)
              })
              writable.on('error', err2 => {
                prom.fail(err2)
              })
            })
          })
          mirrorReq.on('error', err => prom.fail(err))
          mirrorReq.end()
        }
      })
    }
  })
}

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
    let docroot = opts.docroot
    let path = opts.path
    let strategy = opts.strategy
    if (!/\/$/.test(docroot)) { docroot = docroot + '/' }
    if (!/^\//.test(path)) { path = '/' + path }
    let headers = _.extend({
      'x-hoxy-static-docroot': docroot,
    }, req.headers)
    delete headers['if-none-match']
    delete headers['if-modified-since']
    let fullPath = docroot + path.substring(1)

    // Now call the static file service.
    return awate('staticResp').run(prom => {
      check(strategy, fullPath, req, this._proxy._upstreamProxy)
      .onfail(prom.fail, prom)
      .onkeep(got => {
        let kept = false
        if (got.created) {
          this.emit('log', {
            level: 'info',
            message: 'copied ' + req.fullUrl() + ' to ' + fullPath,
          })
        }
        let addr = staticServer.address()
        http.get({
          hostname: addr.address,
          port: addr.port,
          headers: headers,
          path: path,
        }, staticResp => {
          prom.keep('staticResp', staticResp)
          kept = true
        }).on('error', err => {
          if (!kept) {
            prom.fail(err)
          } else {
            this.emit('log', {
              level: 'warn',
              message: err.message,
              error: err,
            })
          }
        })
      })
    })

    // Now deal with the static response.
    .onkeep(got => {
      let code = got.staticResp.statusCode + ''
      let useResponse
      let isError
      if (/^2\d\d$/.test(code)) {
        useResponse = true // obviously
      } else if (/^4\d\d$/.test(code)) {
        if (strategy === 'replace') {
          useResponse = true // yep
        } else if (strategy === 'mirror') {
          isError = true // e.g., because fetch returned 404
        }
      } else {
        isError = true // nope
      }
      if (isError) {
        let message = util.format(
          'Failed to serve static file: %s => %s. Static server returned %d. Strategy: %s',
          req.fullUrl(),
          fullPath,
          got.staticResp.statusCode,
          strategy
        )
        cb.call(this, new Error(message))
      } else if (useResponse) {
        resp._setHttpSource(got.staticResp)
        cb.call(this)
      } else {
        cb.call(this) // it will fall through
      }
    })

    // Or, deal with an error.
    .onfail(err => cb.call(this, err))
  }

  _setPhase(phase) {
    this._phase = this._request.phase = this._response.phase = phase
  }

  _sendToServer() {
    let req = this._request,
      resp = this._response,
      upstreamProxy = this._proxy._upstreamProxy

    return awate('inRespProm', 'done')
    .run(prom => {
      let inRespProm = awate('inResp')
      prom.keep('inRespProm', inRespProm)
      let outReq, source, brake
      if (resp._populated) {
        inRespProm.keep('inResp', false)
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
        }, inResp => inRespProm.keep('inResp', inResp))
        outReq.on('error', err => inRespProm.fail(err))
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

function requestWithProxy(opts, callback) {
  let requestClass = isSecure.test(opts.protocol) ? https : http

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
