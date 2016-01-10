/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
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
import pathTools from 'path'
import zlib from 'zlib'
import { EventEmitter } from 'events'
import co from 'co'
import adapt from 'ugly-adapter'
import wait from './wait'
import task from './task'
import UrlPath from './url-path'

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
    let pDocroot = new UrlPath(docroot)
    let stat = getStatic(pDocroot.toSystemPath())
    stat.serve(req, resp)
  }).listen(0, 'localhost')

  return server
})()

class ProvisionableRequest {

  constructor(opts) {
    this._respProm = task()
    let h = (/https/i).test(opts.protocol) ? https : http
    if (opts.proxy) {
      let proxyInfo = url.parse(opts.proxy)
        , proxyPort = proxyInfo.port
        , proxyHostname = proxyInfo.hostname
        , proxyPath = 'http://' + opts.hostname + (opts.port ? ':' + opts.port : '') + opts.path
      opts.hostname = proxyHostname
      opts.port = proxyPort
      opts.path = proxyPath
    }
    this._writable = h.request(opts, this._respProm.resolve)
    this._writable.on('error', this._respProm.reject)
  }

  send(readable) {
    return new Promise((resolve, reject) => {
      if (!readable || typeof readable === 'string') {
        this._writable.end(readable || '', resolve)
      } else {
        readable.on('error', reject)
        readable.on('end', resolve)
        readable.pipe(this._writable)
      }
    })
  }

  receive() {
    return this._respProm
  }
}

/*
 * This check() function made me scratch my head when I came back to
 * it months later. It simply does too many things. It still isn't perfect,
 * but hopefully now this beast is slightly easier to follow. It returns
 * a promise on a boolean indicating whether or not the passed file was
 * created. IF the strategy is NOT 'mirror' it resolves false since 'mirror'
 * is the only strategy that creates files. Otherwise if the file exists
 * it resolves false. Otherwise it has a side effect of creating the file
 * by requesting out to the remote server and writing the result to the
 * file, then resolves true.
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
    yield adapt(mkdirp, pathTools.dirname(file))
    let provReq = new ProvisionableRequest({
      protocol: req.protocol,
      proxy: upstreamProxy,
      method: 'GET',
      hostname: req.hostname,
      port: req.port,
      path: req.url,
    })
    provReq.send()
    let mirrResp = yield provReq.receive()
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

  serve(opts) {

    return co.call(this, function*() {

      // First, get all our ducks in a row WRT to
      // options, setting variables, etc.
      let req = this._request
      let resp = this._response
      if (typeof opts === 'string') {
        opts = { path: opts }
      }
      opts = _.extend({
        docroot: pathTools.sep,
        path: url.parse(req.url).pathname,
        strategy: 'replace',
      }, opts)
      let { docroot, path, strategy } = opts
      let headers = _.extend({
        'x-hoxy-static-docroot': docroot,
      }, req.headers)
      delete headers['if-none-match']
      delete headers['if-modified-since']

      // Now call the static file service.
      let pDocroot = new UrlPath(docroot)
        , pPath = new UrlPath(path)
        , pFullPath = pPath.rootTo(pDocroot)
        , fullSysPath = pFullPath.toSystemPath()
      let created = yield check(strategy, fullSysPath, req, this._proxy._upstreamProxy)
      if (created) {
        this.emit('log', {
          level: 'info',
          message: 'copied ' + req.fullUrl() + ' to ' + fullSysPath,
        })
      }
      let staticResp = yield new Promise((resolve, reject) => {
        let addr = staticServer.address()
        http.get({
          hostname: addr.address,
          port: addr.port,
          headers: headers,
          path: pPath.toUrlPath(),
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
          fullSysPath,
          staticResp.statusCode,
          strategy
        )
        throw new Error(message)
      } else if (useResponse) {
        resp._setHttpSource(staticResp)
      }
    })
  }

  _setPhase(phase) {
    this._phase = this._request.phase = this._response.phase = phase
  }

  /*
   * This returns a promise on a partially fulfilled request
   * (an instance of class ProvisionableRequest). At the time
   * the promise is fulfilled, the request is in a state where
   * it's been fully piped out, but nothing received. It's up
   * to the caller of this function to call receive() on it, thus
   * getting a promise on the serverResponse object. That enables
   * hoxy to implement the 'request-sent' phase.
   */
  _sendToServer() {
    let req = this._request._finalize()
      , resp = this._response
      , upstreamProxy = this._proxy._upstreamProxy
      , source = req._source
      , pSlow = this._proxy._slow || {}
      , rSlow = req.slow() || {}
      , latency = rSlow.latency || 0
    if (resp._populated) {
      return Promise.resolve(undefined)
    }
    return co.call(this, function*() { // return the outer promise
      let provisionableReq = new ProvisionableRequest({
        protocol: req.protocol,
        proxy: upstreamProxy,
        hostname: req.hostname,
        port: req.port || req._getDefaultPort(),
        method: req.method,
        path: req.url,
        headers: req.headers,
      })
      if (latency > 0) {
        yield wait(latency)
      }
      if (rSlow.rate > 0) {
        let brake = streams.brake(rSlow.rate)
        source = source.pipe(brake)
      }
      if (pSlow.rate) {
        let groupedBrake = pSlow.rate.throttle()
        source = source.pipe(groupedBrake)
      }
      if (pSlow.up) {
        let groupedBrake = pSlow.up.throttle()
        source = source.pipe(groupedBrake)
      }
      req._tees().forEach(writable => source.pipe(writable))
      yield provisionableReq.send(source) // wait for it all to pipe out
      return provisionableReq
    })
  }

  _sendToClient(outResp) {
    let resp = this._response._finalize()
      , source = resp._source
      , rSlow = resp.slow() || {}
      , pSlow = this._proxy._slow || {}
      , rLatency = rSlow.latency || 0
      , pLatency = pSlow.latency || 0
      , latency = Math.max(pLatency, rLatency)
    return co.call(this, function*() {
      if (latency > 0) {
        yield wait(latency)
      }
      outResp.writeHead(resp.statusCode, resp.headers)
      if (rSlow.rate > 0) {
        let brake = streams.brake(rSlow.rate)
        source = source.pipe(brake)
      }
      if (pSlow.rate) {
        let groupedBrake = pSlow.rate.throttle()
        source = source.pipe(groupedBrake)
      }
      if (pSlow.down) {
        let groupedBrake = pSlow.down.throttle()
        source = source.pipe(groupedBrake)
      }
      let tees = resp._tees()
      tees.forEach(writable => source.pipe(writable))
      yield new Promise((resolve, reject) => {
        source.on('error', reject)
        source.on('end', resolve)
        source.pipe(outResp)
      })
    })
  }

  _start() {
    // for now, an immediately-kept promise
    return awate('started').keep('started')
  }
}
