/* global ldvConfig */
(() => {
  const addIframeAuth = () => {
    if (window.location.pathname.substring(0, 2) === '/_') // internal files
      return

    if (window.location.pathname.slice(0, 2) === '/*' && window.location.pathname.length > 2)
      return

    document.querySelector('body').insertAdjacentHTML(
      'beforeend',
      `<iframe src="${ldvConfig.endpointUrl}?query=ask{}" width="1" height="1" id="iframe-auth" onload="ldvLoadWindowResource()"></iframe>`)
  }

  if (ldvConfig.endpointOptions.credentials === 'include') {
    window.useIframeAuth = true
    window.addEventListener('DOMContentLoaded', (event) => addIframeAuth())
  }
})()
