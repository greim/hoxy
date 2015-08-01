/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import UrlPath from '../src/url-path'
import path from 'path'

describe('url-path', function() {

  describe('unix-like', function() {

    it('should construct', () => {
      let aPath = new UrlPath('/foo/bar')
      assert.ok(aPath)
    })

    it('should return an absolute url path', () => {
      let aPath = new UrlPath('/foo/bar')
      assert.equal(aPath.toUrlPath(), '/foo/bar')
    })

    it('should return an absolute system path', () => {
      let aPath = new UrlPath('/foo/bar')
        , expected = `${path.sep}foo${path.sep}bar`
      assert.equal(aPath.toSystemPath(), expected)
    })

    it('should return a relative url path', () => {
      let aPath = new UrlPath('foo/bar')
      assert.equal(aPath.toUrlPath(), 'foo/bar')
    })

    it('should return a relative system path', () => {
      let aPath = new UrlPath('foo/bar')
        , expected = `foo${path.sep}bar`
      assert.equal(aPath.toSystemPath(), expected)
    })

    it('should root to another path (when absolute)', () => {
      let aPath = new UrlPath('/baz/qux')
        , rootPath = new UrlPath('/foo/bar')
        , fullPath = aPath.rootTo(rootPath)
        , expected = '/foo/bar/baz/qux'
      assert.equal(fullPath.toUrlPath(), expected)
    })

    it('should root to another path (when relative)', () => {
      let aPath = new UrlPath('baz/qux')
        , rootPath = new UrlPath('/foo/bar')
        , fullPath = aPath.rootTo(rootPath)
        , expected = '/foo/bar/baz/qux'
      assert.equal(fullPath.toUrlPath(), expected)
    })

    it('should err when rooting to non-absolute path', () => {
      assert.throws(() => {
        let aPath = new UrlPath('/baz/qux')
          , rootPath = new UrlPath('foo/bar')
        aPath.rootTo(rootPath)
      })
    })
  })

  describe('windows-like', function() {

    it('should construct', () => {
      let aPath = new UrlPath('c:\\foo\\bar')
      assert.ok(aPath)
    })

    it('should return an absolute url path', () => {
      let aPath = new UrlPath('c:\\foo\\bar')
      assert.equal(aPath.toUrlPath(), '/foo/bar')
    })

    it('should return an absolute system path', () => {
      let aPath = new UrlPath('c:\\foo\\bar')
        , expected = `c:${path.sep}foo${path.sep}bar`
      assert.equal(aPath.toSystemPath(), expected)
    })

    it('should return a relative url path', () => {
      let aPath = new UrlPath('foo\\bar')
      assert.equal(aPath.toUrlPath(), 'foo/bar')
    })

    it('should return a relative system path', () => {
      let aPath = new UrlPath('foo\\bar')
        , expected = `foo${path.sep}bar`
      assert.equal(aPath.toSystemPath(), expected)
    })

    it('should root to another path (when absolute)', () => {
      let aPath = new UrlPath('c:\\baz\\qux')
        , rootPath = new UrlPath('c:\\foo\\bar')
        , fullPath = aPath.rootTo(rootPath)
        , expected = '/foo/bar/baz/qux'
      assert.equal(fullPath.toUrlPath(), expected)
    })

    it('should root to another path (when relative)', () => {
      let aPath = new UrlPath('baz\\qux')
        , rootPath = new UrlPath('c:\\foo\\bar')
        , fullPath = aPath.rootTo(rootPath)
        , expected = '/foo/bar/baz/qux'
      assert.equal(fullPath.toUrlPath(), expected)
    })

    it('should err when rooting to non-absolute path', () => {
      assert.throws(() => {
        let aPath = new UrlPath('c:\\baz\\qux')
          , rootPath = new UrlPath('foo\\bar')
        aPath.rootTo(rootPath)
      })
    })
  })
})
