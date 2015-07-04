/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var fs = require('fs')
var assert = require('assert')
var send = require('./lib/send')
var adapt = require('ugly-adapter')

// ---------------------------

describe('Serving from local', () => {

  it('should serve', () => {
    return send({
      path: 'http://example.com/abc',
    }).through('request', function*() {
      yield this.serve({ docroot: `${__dirname}/files` })
    }).to(function*() {
      throw new Error('server hit was not skipped')
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'abc2')
    }).promise()
  })

  it('should not see through to server with serve', () => {
    return send({
      path: 'http://example.com/def',
    }).through('request', function*() {
      yield this.serve({ docroot: `${__dirname}/files` })
    }).to(function*() {
      throw new Error('failed to skip server')
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, '')
      assert.strictEqual(resp.statusCode, 404, `should have been 404 but was ${resp.statusCode}`)
    }).promise()
  })

  it('should serve with overlay strategy', () => {
    return send({
      path: 'http://example.com/abc',
    }).through('request', function*() {
      let opts = { docroot: `${__dirname}/files`, strategy: 'overlay' }
      yield this.serve(opts)
    }).to(function*() {
      throw new Error('server hit was not skipped')
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'abc2')
    }).promise()
  })

  it('should fallback silently with overlay strategy', () => {
    return send({
      path: 'http://example.com/def',
    }).through('request', function*() {
      let opts = { docroot: `${__dirname}/files`, strategy: 'overlay' }
      yield this.serve(opts)
    }).to({
      body: '1234',
    }).receiving(function*(resp) {
      assert.strictEqual(resp.statusCode, 200)
      assert.strictEqual(resp.body, '1234')
    }).promise()
  })

  it('should mirror with mirror strategy', () => {
    return send({
      path: 'http://example.com/def',
    }).through('request', function*() {
      let docroot = `${__dirname}/files`
        , file = `${docroot}/def`
        , strategy = 'mirror'
      yield this.serve({ docroot, strategy })
      yield adapt(fs.unlink, file)
    }).to({
      body: 'def',
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'def')
    }).promise()
  })

  it('should not re-mirror with mirror strategy', () => {
    return send({
      path: 'http://example.com/abc',
    }).through('request', function*() {
      let docroot = `${__dirname}/files`
        , strategy = 'mirror'
        , file = `${docroot}/abc`
      let stat1 = yield adapt(fs.stat, file)
      yield this.serve({ docroot, strategy })
      let stat2 = yield adapt(fs.stat, file)
      assert.equal(stat1.mtime.getTime(), stat2.mtime.getTime())
    }).to(function*() {
      throw new Error('should not have hit server')
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'abc2')
    }).promise()
  })
})
