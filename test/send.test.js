/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import send from './lib/send'
import hoxy from '../index'

function failAfter(t) {
  return new Promise((res, rej) => {
    setTimeout(() => rej(new Error('fake')), t)
  })
}

describe('send', () => {

  it('should send path', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*(req) {
      assert.equal(req.url, '/')
    }).to(function*(req, resp) {
      assert.equal(req.url, '/')
      resp.end('')
    }).promise()
  })

  it('should send method', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*(req) {
      assert.equal(req.method, 'GET')
    }).to(function*(req, resp) {
      assert.equal(req.method, 'GET')
      resp.end('')
    }).promise()
  })

  it('should send headers', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
      headers: { 'x-foo': 'bar' },
    }).through('request', function*(req) {
      assert.equal(req.headers['x-foo'], 'bar')
    }).to(function*(req, resp) {
      assert.equal(req.headers['x-foo'], 'bar')
      resp.end('')
    }).promise()
  })

  // NOTE: regarding the next two tests:
  // In order to work, send() needs to switch 'hostname'
  // and 'port' to a local server on which .to() is
  // listening. In order to accommodate serve() tests,
  // it needs to do this before running intercepts
  // passed to through().

  it('should not send hostname', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*(req) {
      assert.throws(() => {
        assert.equal(req.hostname, 'example.com', '1234abcd')
      }, /1234abcd/)
    }).promise()
  })

  it('should not send port', () => {
    return send({
      path: 'http://example.com:9876/',
      method: 'GET',
    }).through('request', function*(req) {
      assert.throws(() => {
        assert.equal(req.port, 9876, '1234abcd')
      }, /1234abcd/)
    }).promise()
  })

  it('through errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*() {
      throw new Error('fake')
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('async through errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*() {
      yield failAfter(0)
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('to errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).to(function*() {
      throw new Error('fake')
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('async to errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).to(function*() {
      yield failAfter(0)
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('receiving errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).receiving(function*() {
      throw new Error('fake')
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('async receiving errors should fail it', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).receiving(function*() {
      yield failAfter(0)
    }).promise().then(() => {
      throw new Error('failed to fail')
    }).catch(err => {
      return err
    })
  })

  it('should hit every phase (1)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function() {
      steps += '1'
    }).to(function*(req, resp) {
      steps += '2'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit every phase (2)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function(req, resp, done) {
      steps += '1'
      setImmediate(done)
    }).to(function*(req, resp) {
      steps += '2'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit every phase (3)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*() {
      steps += '1'
    }).to(function*(req, resp) {
      steps += '2'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit every phase (4)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('response', function() {
      steps += '2'
    }).to(function*(req, resp) {
      steps += '1'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit every phase (5)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('response', function(req, resp, done) {
      steps += '2'
      setImmediate(done)
    }).to(function*(req, resp) {
      steps += '1'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit every phase (6)', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('response', function*() {
      steps += '2'
    }).to(function*(req, resp) {
      steps += '1'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '123', 'unexpected steps ordering')
    })
  })

  it('should hit multiple phases', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*() {
      steps += '1'
    }).through('response', function*() {
      steps += '3'
    }).to(function*(req, resp) {
      steps += '2'
      resp.end('')
    }).receiving(function*() {
      steps += '4'
    }).promise().then(() => {
      assert.equal(steps, '1234', 'unexpected steps ordering')
    })
  })

  it('should skip server phase if response populated', () => {
    let steps = ''
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).through('request', function*(req, resp) {
      steps += '1'
      resp.string = 'hello'
    }).to(function*(req, resp) {
      steps += '2'
      resp.end('')
    }).receiving(function*() {
      steps += '3'
    }).promise().then(() => {
      assert.equal(steps, '13', 'unexpected steps ordering')
    })
  })

  it('should receive body data', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).to(function*(req, resp) {
      resp.end('hello')
    }).receiving(function*(resp) {
      assert.equal(resp.body, 'hello')
    }).promise()
  })

  it('should send to an object literal instead of a function', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).to({
      statusCode: 400,
      headers: { 'x-foo': 'bar' },
      body: '123',
    }).receiving(function*(resp) {
      assert.equal(resp.statusCode, 400)
      assert.equal(resp.headers['x-foo'], 'bar')
      assert.equal(resp.body, '123')
    }).promise()
  })

  it('should allow tweaking', () => {
    return send({
      path: 'http://example.com/',
      method: 'GET',
    }).tweak(proxy => {
      assert.ok(proxy instanceof hoxy.Proxy)
    }).promise()
  })
})
