module.exports = async function makeGemini(opts = {}) {
const geminiReq = require('@derhuerst/gemini/client')
  const { makeRoutedFetch } = await import('make-fetch')
  const {fetch, router} = makeRoutedFetch()
// const { Readable } = require('stream')

const DEFAULT_OPTS = {
  followRedirects: true,
  verifyAlpnId: () => true,
  tlsOpt: {
    rejectUnauthorized: false
  }
}
  const finalOpts = { ...DEFAULT_OPTS, opts }
  // const SUPPORTED_METHODS = ['HEAD', 'GET', 'POST', 'DELETE']

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

  async function handleGemini(request) {
    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }
      const toRequest = new URL(url, referrer)

      if (toRequest.protocol !== 'gemini:') {
        return sendTheData(signal, {statusCode: 409, headers: {}, data: ['wrong protocol']})
      } else if (!method) {
        return sendTheData(signal, {statusCode: 409, headers: {}, data: ['something wrong with method']})
      }

      if(toRequest.hostname === '_'){
        return sendTheData(signal, {statusCode: 20 * 10, statusText: 'works', headers: {'Content-Type': 'text/plain; charset=utf-8'}, data: ['works']})
      }
      
      if (!toRequest.hostname.startsWith('gemini.')) {
        toRequest.hostname = 'gemini.' + toRequest.hostname
      }

      const mainObj = await new Promise((resolve, reject) => {
        geminiReq(toRequest.href, finalOpts, (err, res) => {
          if (err) {
            reject(err)
          } else {
            const { statusCode, statusMessage: statusText } = res

            const headers = {'Content-Type': 'text/gemini'}

            const data = res

            resolve({
              statusCode: statusCode * 10,
              statusText,
              headers,
              data
            })
          }
        })
      })
      return sendTheData(signal, mainObj)
  }

  router.any('gemini://*/**', handleGemini)

  return fetch
}