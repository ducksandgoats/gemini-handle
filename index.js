module.exports = async function makeGemini(opts = {}) {
const geminiReq = require('@derhuerst/gemini/client')
  const { makeRoutedFetch } = await import('make-fetch')
  const { fetch, router } = makeRoutedFetch({ onNotFound: handleEmpty, onError: handleError })
  const parse = require('gemini-to-html/parse')
  const render = require('gemini-to-html/render')
  
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

  router.get('gemini://*/**', async function (request) {
    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }
      const toRequest = new URL(url, referrer)

      if(toRequest.hostname === '_'){
        return sendTheData(signal, {status: 20 * 10, statusText: 'works', headers: {'Content-Type': 'text/plain; charset=utf-8'}, body: ['works']})
      }
      
      // if (!toRequest.hostname.startsWith('gemini.')) {
      //   toRequest.hostname = 'gemini.' + toRequest.hostname
      // }

      const mainObj = await new Promise((resolve, reject) => {
        geminiReq(toRequest.href, finalOpts, (err, res) => {
          if (err) {
            reject(err)
          } else {
            const { statusCode, statusMessage: statusText } = res

            const headers = {'Content-Type': 'text/gemini'}

            const data = res

            resolve({
              status: statusCode * 10,
              statusText,
              headers,
              body: render(data)
            })
          }
        })
      })
      return sendTheData(signal, mainObj)
  })

  return fetch
}