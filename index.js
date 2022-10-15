const geminiReq = require('@derhuerst/gemini/client')
const makeFetch = require('make-fetch')
const { Readable } = require('stream')

const DEFAULT_OPTS = {
  followRedirects: true,
  verifyAlpnId: () => true,
  tlsOpt: {
    rejectUnauthorized: false
  }
}

module.exports = function makeGemini (opts = {}) {
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

  return makeFetch(async (request) => {

    const { url, method, headers: reqHeaders, body, signal, referrer } = request

    if(signal){
      signal.addEventListener('abort', takeCareOfIt)
    }

    try {
      const toRequest = new URL(url, referrer)

      if (toRequest.protocol !== 'gemini:') {
        return sendTheData(signal, {statusCode: 409, headers: {}, data: ['wrong protocol']})
      } else if (!method) {
        return sendTheData(signal, {statusCode: 409, headers: {}, data: ['something wrong with method']})
      } else if (!toRequest.hostname.startsWith('gemini.')) {
        toRequest.hostname = 'gemini.' + toRequest.hostname
      }

      const mainObj = await new Promise((resolve, reject) => {
        geminiReq(toRequest.href, finalOpts, (err, res) => {
          if (err) {
            reject(err)
          } else {
            const { statusCode, statusMessage: statusText, meta } = res
    
            // TODO: Figure out what to do with `1x` status codes
            const isOK = (statusCode >= 10) && (statusCode < 300)
    
            // If the response is 200, the mime type should be the meta tag
            const headers = isOK ? { 'Content-Type': meta } : {}
    
            // If the response had an error, use the meta as the response body
            const data = isOK ? res : [meta]
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
    } catch (error) {
      return sendTheData(signal, {statusCode: 500, headers: {}, data: [JSON.stringify(error.stack)]})
    }
  })
}

function intoStream (data) {
  return new Readable({
    read () {
      this.push(data)
      this.push(null)
    }
  })
}
