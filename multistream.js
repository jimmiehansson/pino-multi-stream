'use strict'

const metadata = Symbol.for('pino.metadata')

const levels = {
  silent: Infinity,
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
}

function multistream (streamsArray) {
  var counter = 0

  streamsArray = streamsArray || []

  const res = {
    write,
    add,
    minLevel: 0,
    streams: [],
    clone,
    [metadata]: true
  }

  if (Array.isArray(streamsArray)) {
    streamsArray.forEach(add, res)
  } else if (streamsArray) {
    add.call(res, streamsArray)
  }

  // clean this object up
  // or it will stay allocated forever
  // as it is closed on the following closures
  streamsArray = null

  return res

  // we can exit early because the streams are ordered by level
  function write (data) {
    var dest
    const level = this.lastLevel
    const { streams } = this
    var stream
    for (var i = 0; i < streams.length; i++) {
      dest = streams[i]
      stream = dest.stream
      if (dest.level <= level) {
        if (stream[metadata]) {
          const { lastMsg, lastObj, lastLogger } = this
          stream.lastLevel = level
          stream.lastMsg = lastMsg
          stream.lastObj = lastObj
          stream.lastLogger = lastLogger
        }
        stream.write(data)
      } else {
        break
      }
    }
  }

  function add (dest) {
    const { streams } = this
    if (typeof dest.write === 'function') {
      return add.call(this, { stream: dest })
    } else if (typeof dest.levelVal === 'number') {
      return add.call(this, Object.assign({}, dest, { level: dest.levelVal, levelVal: undefined }))
    } else if (typeof dest.level === 'string') {
      return add.call(this, Object.assign({}, dest, { level: levels[dest.level] }))
    } else if (typeof dest.level !== 'number') {
      // we default level to 'info'
      dest = Object.assign({}, dest, { level: 30 })
    } else {
      dest = Object.assign({}, dest)
    }

    dest.id = counter++

    streams.unshift(dest)
    streams.sort(compareByLevel)

    this.minLevel = streams[0].level

    return res
  }

  function clone (level) {
    var streams = new Array(this.streams.length)

    for (var i = 0; i < streams.length; i++) {
      streams[i] = {
        level: level,
        stream: this.streams[i].stream
      }
    }

    return {
      write,
      add,
      minLevel: level,
      streams,
      clone,
      [metadata]: true
    }
  }
}

function compareByLevel (a, b) {
  if (a.level < b.level) {
    return -1
  } else if (a.level > b.level) {
    return 1
  } else {
    if (a.counter < b.counter) {
      return -1
    } else if (a.counter > b.counter) {
      return 1
    } else {
      return 0
    }
  }
}

module.exports = multistream
