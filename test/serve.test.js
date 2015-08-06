/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import fs from 'fs'
import assert from 'assert'
import path from 'path'
import send from './lib/send'
import adapt from 'ugly-adapter'

const docroot = path.join(__dirname, 'files')

function exists(file) {
  return new Promise(resolve => {
    fs.exists(file, resolve)
  })
}

describe('Serving from local', () => {

  describe('simple file service', () => {

    it('should serve a file', () => {
      return send({
        path: 'http://example.com/',
      }).through('request', function*() {
        yield this.serve({
          path: path.join(__dirname, 'files', 'abc'),
        })
      }).to(function*() {
        throw new Error('server hit was not skipped')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.body, 'abc2')
      }).promise()
    })

    it('should serve a file using a string instead of options object', () => {
      return send({
        path: 'http://example.com/',
      }).through('request', function*() {
        yield this.serve(path.join(__dirname, 'files', 'abc'))
      }).to(function*() {
        throw new Error('server hit was not skipped')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.body, 'abc2')
      }).promise()
    })
  })

  describe('replace strategy', () => {

    it('should serve an existing file from a local docroot', () => {
      return send({
        path: 'http://example.com/abc',
      }).through('request', function*() {
        yield this.serve({ docroot })
      }).to(function*() {
        throw new Error('server hit was not skipped')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.body, 'abc2')
      }).promise()
    })

    it('should return 404 when serving non-existant file from local docroot', () => {
      return send({
        path: 'http://example.com/def',
      }).through('request', function*() {
        yield this.serve({ docroot })
      }).to(function*() {
        throw new Error('server hit was not skipped')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.body, '')
        assert.strictEqual(resp.statusCode, 404, `should have been 404 but was ${resp.statusCode}`)
      }).promise()
    })
  })

  describe('overlay strategy', () => {

    it('should serve an existing file from a local docroot', () => {
      return send({
        path: 'http://example.com/abc',
      }).through('request', function*() {
        let opts = { docroot, strategy: 'overlay' }
        yield this.serve(opts)
      }).to(function*() {
        throw new Error('server hit was not skipped')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.body, 'abc2')
      }).promise()
    })

    it('should return 200 when serving non-existant file from a local docroot', () => {
      return send({
        path: 'http://example.com/def',
      }).through('request', function*() {
        let opts = { docroot, strategy: 'overlay' }
        yield this.serve(opts)
      }).to({
        body: '1234',
      }).receiving(function*(resp) {
        assert.strictEqual(resp.statusCode, 200)
        assert.strictEqual(resp.body, '1234')
      }).promise()
    })
  })

  describe('mirror strategy', () => {

    it('should copy a file when not found in a local docroot', () => {
      return send({
        path: 'http://example.com/def',
      }).through('request', function*() {
        let file = path.join(docroot, 'def')
          , strategy = 'mirror'
          , fileExists = yield exists(file)
        assert.ok(!fileExists, 'file existed before mirroring')
        yield this.serve({ docroot, strategy })
        yield adapt(fs.unlink, file)
      }).to({
        body: 'def',
      }).receiving(function*(resp) {
        assert.strictEqual(resp.statusCode, 200)
        assert.strictEqual(resp.body, 'def')
      }).promise()
    })

    it('should not re-copy a file when found in a local docroot', () => {
      return send({
        path: 'http://example.com/abc',
      }).through('request', function*() {
        let strategy = 'mirror'
          , file = path.join(docroot, 'abc')
          , stat1 = yield adapt(fs.stat, file)
        yield this.serve({ docroot, strategy })
        let stat2 = yield adapt(fs.stat, file)
        assert.equal(stat1.mtime.getTime(), stat2.mtime.getTime())
      }).to(function*() {
        throw new Error('should not have hit server')
      }).receiving(function*(resp) {
        assert.strictEqual(resp.statusCode, 200)
        assert.strictEqual(resp.body, 'abc2')
      }).promise()
    })
  })

  it('should return a promise', () => {
    return send({
      path: 'http://example.com/abc',
    }).through('request', function() {
      var prom = this.serve({ docroot })
      assert.ok(typeof prom.then === 'function')
      return prom
    }).promise()
  })
})
