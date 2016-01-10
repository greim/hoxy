/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

//import assert from 'assert'
//import send from './lib/send'
//import wait from '../src/wait'
//import co from 'co'
import hoxy from '../src/main';
import http from 'http'

describe('non-existent servers', function(){

  it('should foo', done => {

    const proxy = hoxy.createServer({
      reverse: 'http://sdfkjhsdfdgjhhfs.example.com:8888',
    })
    proxy.listen(function() {
      const { address, port } = proxy.address()
      http.get({
        hostname: address,
        port: port,
        path: '/',
      }, () => {
        done(new Error('callback not expected'))
      }).on('error', done)
    })
    proxy.on('error', () => {
      done()
    })
  })
})
