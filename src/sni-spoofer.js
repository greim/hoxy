/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import adapt from 'ugly-adapter'
import co from 'co'
import pem from 'pem'
import tls from 'tls'
import { EventEmitter } from 'events'

export class SNISpoofer extends EventEmitter {

  constructor(rootKey, rootCert) {
    super()
    this._rootKey = rootKey
    this._rootCert = rootCert
    this._cache = new Map()
  }

  callback() {

    let cache = this._cache
      , rootKey = this._rootKey
      , rootCert = this._rootCert
      , _this = this

    let getCachedCtx = co.wrap(function*(serverName) {
      let ctx = cache.get(serverName)
      if (!ctx) {
        ctx = getCtx(serverName)
        cache.set(serverName, ctx)
      }
      return yield ctx
    })

    let getCtx = co.wrap(function*(serverName) {
      let create = adapt.part(pem.createCertificate)
      let { clientKey: key, certificate: cert } = yield create({
        country: 'US',
        state: 'Utah',
        locality: 'Provo',
        organization: 'ACME Tech Inc',
        commonName: serverName,
        altNames: [serverName],
        serviceKey: rootKey,
        serviceCertificate: rootCert,
        serial: Date.now(),
        days: 500,
      })
      let ctx = tls.createSecureContext({ key, cert })
      _this.emit('generate', serverName)
      return ctx
    })

    return (serverName, cb) => {
      getCachedCtx(serverName).then(ctx => cb(null, ctx), err => {
        _this.emit('error', err)
        cb(err)
      })
    }
  }
}
