/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import Body from './body'
import _ from 'lodash'
import url from 'url'
import querystring from 'querystring'
import assert from 'assert'

let validProtocols = {
  'http:': true,
  'https:': true,
}

let removeHeaders = {
  'accept-encoding': true, // until proxy handles gzip
  'proxy-connection': true,
  'proxy-authorization': true,
}

let nonEntityMethods = {
  GET: true,
  HEAD: true,
  TRACE: true,
}

/**
 * Represents an HTTP request.
 */
export default class Request extends Body {

  constructor() {
    super()
    this._data = { slow: {} }
  }

  /**
   * Getter/setter for HTTP protocol, e.g. 'http:'
   */
  get protocol(){
    return this._getRawDataItem('protocol')
  }

  set protocol(protocol){
    if (!validProtocols.hasOwnProperty(protocol)) {
      throw new Error('invalid protocol: ' + protocol) // TODO: test this
    }
    this._setRawDataItem('protocol', protocol)
  }

  /**
   * Getter/setter for host name. Does not incude port.
   */
  get hostname(){
    return this._getRawDataItem('hostname')
  }

  set hostname(hostname){
    if (!hostname){
      throw new Error('invalid hostname: ' + hostname) // TODO: test this
    }
    this._setRawDataItem('hostname', hostname)
  }

  /**
   * Getter/setter for port.
   */
  get port(){
    return this._getRawDataItem('port')
  }

  set port(port){
    if (port === undefined) {
      this._setRawDataItem('port', undefined)
    } else {
      let parsedPort = parseInt(port)
      if (!parsedPort){
        throw new Error('invalid port: ' + port) // TODO: test this
      }
      this._setRawDataItem('port', parsedPort)
    }
  }

  /**
   * Getter/setter for HTTP method.
   */
  get method(){
    return this._getRawDataItem('method')
  }

  set method(method){
    if (!method){
      throw new Error('invalid method') // TODO: test this
    }
    this._setRawDataItem('method', method.toUpperCase())
  }

  /**
   * Getter/setter for URL. Root-relative.
   */
  get url(){
    return this._getRawDataItem('url')
  }

  set url(aUrl){
    if (!/^\//.test(aUrl)){
      throw new Error('invalid url, must start with /') // TODO: test this
    }
    this._setRawDataItem('url', aUrl)
  }

  /**
   * Getter/setter for URL. Root-relative.
   */
  get query(){
    const aUrl = this._getRawDataItem('url')
    const pUrl = url.parse(aUrl, true)
    return pUrl.query || {}
  }

  set query(params){
    assert(typeof params === 'object', 'params not an object')
    let aUrl = this._getRawDataItem('url')
    const pUrl = url.parse(aUrl, true)
    const search = querystring.stringify(params)
    pUrl.search = search
    aUrl = url.format(pUrl)
    this._setRawDataItem('url', aUrl)
  }

  /**
   * Getter/setter for HTTP request header object.
   */
  get headers(){
    return this._getRawDataItem('headers')
  }

  set headers(headers){
    this._setRawDataItem('headers', _.extend({}, headers))
  }

  fullUrl(u){
    if (u){
      let purl = url.parse(u)
      if (purl.protocol) { this.protocol = purl.protocol }
      if (purl.hostname) { this.hostname = purl.hostname }
      if (purl.port) { this.port = purl.port }
      else { this.port = undefined }
      if (purl.path) { this.url = purl.path }
      return undefined
    } else {
      let portStr = ''
      let declaredPort = this.port
      if (declaredPort) {
        portStr = ':' + declaredPort
      }
      return this.protocol + '//' + this.hostname + portStr + this.url
    }
  }

  _setHttpSource(inReq, reverse){
    let u = inReq.url
    if (reverse){
      u = url.resolve(reverse, u)
    }
    let purl = url.parse(u)
    if (reverse){
      inReq.headers.host = purl.host
      if (!purl.protocol){
        throw new Error('missing protocol on reverse proxy')
      }
    }
    let host = (() => {
      let aHost = inReq.headers.host
      let result = {}
      if (aHost){
        let matches = aHost.match(/^([^:]+)(:([\d]+))?$/)
        if (matches){
          result.name = matches[1]
          let port = parseInt(matches[3])
          if (port){
            result.port = port
          }
        }
      }
      return result
    })()
    this.httpVersion = inReq.httpVersion
    this.headers = inReq.headers
    this.protocol = purl.protocol || 'http:'
    this.hostname = purl.hostname || host.name
    let port = purl.port || host.port
    if (port){
      this.port = port
    }
    //this.port = purl.port || host.port || this._getDefaultPort()
    this.method = inReq.method
    this.url = purl.path
    inReq._isOriginal = true
    this._source = inReq
  }

  /**
   * Returns the default port given the current protocol.
   */
  _getDefaultPort(){
    return this.protocol === 'https:' ? 443 : 80
  }

  // TODO: emit debug log events for things that are changed.
  _finalize(){
    if (nonEntityMethods.hasOwnProperty(this.method)) {
      this.string = '' // TODO: test
    }
    if (!this._source){
      this.string = '' // TODO: test?
    }

    if (!this._source._isOriginal){
      delete this.headers['content-length']
      if (typeof this._source.finalize === 'function'){
        this._source.finalize()
      }
      if (typeof this._source.size === 'function'){
        this.headers['content-length'] = this._source.size()
      }
    }

    Object.keys(this.headers).forEach(name => {
      // TODO: test
      if (removeHeaders.hasOwnProperty(name)) {
        delete this.headers[name]
      } else if (this.headers[name] === undefined){
        delete this.headers[name]
      }
    })

    // TODO: test host header correction
    let portStr = ''
    let declaredPort = this.port
    if (declaredPort) { portStr += ':' + declaredPort }
    this.headers.host = this.hostname + portStr
    return this
  }
}
