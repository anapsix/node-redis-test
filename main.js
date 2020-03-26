#!/usr/bin/env node

const redis = require('redis')
const { promisify } = require('util')

const uri = 'redis://localhost/0'
const client = redis.createClient(uri)
const setAsync = promisify(client.set).bind(client)
const getAsync = promisify(client.get).bind(client)
const scanAsync = promisify(client.scan).bind(client)
const ttlAsync = promisify(client.ttl).bind(client)


function put (key, value, opts={}) {
  const cmd = [key, value]
  const epoch = Math.floor(Date.now() / 1000)
  // console.log(`got expirationTtl: ${opts.expirationTtl}`)
  if ((typeof(opts.expirationTtl) != 'undefined') || (opts.expirationTtl != null)) {
    if ((typeof(opts.expirationTtl) != 'number') || (opts.expirationTtl == NaN)) {
      throw new TypeError('Unsupported expirationTtl, only numbers are supported')
    }
    cmd.push('EX', opts.expirationTtl)
  } else if ((typeof(opts.expiration) != 'undefined') || (opts.expiration != null)) {
    if ((typeof(opts.expiration) != 'number') || (opts.expiration == NaN)) {
      throw new TypeError('Unsupported expiration, only numbers are supported')
    }
    const exp = opts.expiration - epoch
    if (exp <= 0) {
      // console.log('expiration is in the past')
      return Promise.resolve(false)
    }
    cmd.push('EX', exp)
  }
  return setAsync(cmd)
    .then(function(msg) { return msg === 'OK' })
    .catch(function(msg) {
      throw new Error(msg)
    })
}

function getTtl(key) {
  return ttlAsync(key)
    .then(
      function(res){
        console.log(`${res} : ${typeof res}`)
        return Promise.resolve(res)
      },
      function(err){
        if (err) throw err
      }
    )
    .catch(function(err) {
      throw new Error(err)
    })
}

function list (opts={prefix: '', limit: 1000, cursor: '0'}) {
  const keys = []
  const cmdOpts = {
    prefix: opts.prefix || '',
    limit: opts.limit || 1000,
    cursor: opts.cursor || 0
  }
  const cmd = [cmdOpts.cursor, 'MATCH']
  if ((typeof(cmdOpts.prefix) !== 'undefined') || (typeof(cmdOpts.prefix) !== 'null')) {
    cmd.push(`${cmdOpts.prefix}*`)
  } else {
    cmd.push('*')
  }
  cmd.push('COUNT',cmdOpts.limit)

  return scanAsync(cmd)
    .then(
      function(res){
        const cursor = res[0]
        var keys = res[1].sort().map(key => ({
          name: key,
          expiration: Promise.resolve(ttlAsync(key))
        }))
        const listComplete = cursor == 0 ? true : false

        const scanRes = {
          keys: keys,
          cursor: cursor,
          list_complete: listComplete
        }

        // console.log(scanRes)
        return Promise.resolve(scanRes)
      },
      function(err){
        if (err) throw err
      }
    )
    .catch(function(err) {
      throw new Error(err)
    })
}

put('/hello1', 'test', {expirationTtl: 600})
put('/hello2', 'test', {expirationTtl: 600})
put('/hello3', 'test', {expirationTtl: 600})
put('/hello4', 'test', {expirationTtl: 600})
put('/hello5', 'test', {expirationTtl: 600})

// console.log(`${ttlAsync('/hello1')}`)

const listResults = list()
  .then(ok=>{
    console.log(ok)
  })
  .finally(function(){
    client.quit()
  })




