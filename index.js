module.exports = async function makeGemini(opts = {}) {
const geminiReq = require('@derhuerst/gemini/client')
  const { makeRoutedFetch } = await import('make-fetch')
  const { fetch, router } = makeRoutedFetch({ onNotFound: handleEmpty, onError: handleError })
  const { Readable } = require('stream')
  
  function handleEmpty(request) {
    const { url, headers: reqHeaders, method, body, signal } = request
    if(signal){
      signal.removeEventListener('abort', takeCareOfIt)
    }
    
    return {status: 400, headers: {}, body: 'did not find any data'}
  }

  function handleError(e, request) {
    const { url, headers: reqHeaders, method, body, signal } = request
    if(signal){
      signal.removeEventListener('abort', takeCareOfIt)
    }

    return {status: 500, headers: {}, body: e.stack}
  }

const DEFAULT_OPTS = {
  followRedirects: true,
  verifyAlpnId: () => true,
  tlsOpt: {
    rejectUnauthorized: false
  }
}
  const finalOpts = { ...DEFAULT_OPTS, opts }
  const useTimeOut = finalOpts.timeout

function intoStream (data) {
  return new Readable({
    read () {
      this.push(data)
      this.push(null)
    }
  })
}

  function takeCareOfIt(data){
    console.log(data)
    throw new Error('aborted')
  }

  function sendTheData(theSignal, theData){
    if(theSignal){
      theSignal.removeEventListener('abort', takeCareOfIt)
    }
    return theData
  }

  async function handleData(timeout, data) {
    if (timeout) {
      return await Promise.race([
        new Promise((resolve, reject) => setTimeout(() => { const err = new Error('timed out'); err.name = 'timeout'; reject(err) }, timeout)),
        data
      ])
    } else {
      return await data
    }
  }

  function makeQuery(link) {
    return new Promise((resolve, reject) => {
        geminiReq(link, finalOpts, (err, res) => {
          if (err) {
            reject(err)
          } else {
            const { statusCode, statusMessage: statusText, meta } = res

        const isOK = (statusCode >= 10) && (statusCode < 300)

        const headers = isOK ? { 'Content-Type': meta } : {}

        const data = isOK ? res : intoStream(meta)

            resolve({
              status: statusCode * 10,
              statusText,
              headers,
              body: data
            })
          }
        })
    })
  }

  router.get('gemini://*/**', async function (request) {
    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }
      const toRequest = new URL(url, referrer)

      if(toRequest.hostname === '_'){
        return sendTheData(signal, {status: 20 * 10, statusText: 'works', headers: {'Content-Type': 'text/plain; charset=utf-8'}, body: ['works']})
      }
      
      if (!toRequest.hostname.startsWith('gemini.')) {
        toRequest.hostname = 'gemini.' + toRequest.hostname
    }
    
    const mainTimeout = reqHeaders.has('x-timer') || toRequest.searchParams.has('x-timer') ? reqHeaders.get('x-timer') !== '0' || toRequest.searchParams.get('x-timer') !== '0' ? Number(reqHeaders.get('x-timer') || toRequest.searchParams.get('x-timer')) * 1000 : undefined : useTimeOut

      return sendTheData(signal, await handleData(mainTimeout, makeQuery(toRequest.href)))
  })

  return fetch
}