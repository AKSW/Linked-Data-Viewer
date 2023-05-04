/* global ldvConfig */

(() => {
  const fetchLabelsQuery = (query) => {
    return fetch(ldvConfig.endpointUrl, {
      ...ldvConfig.endpointOptions,
      headers: {
	Accept: 'application/json',
	'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'query=' + encodeURIComponent(query)
    }).then((response) => response.json())
  }

  const ldvAddLabelsForUris = (uris, links) => {
    if (!uris.length)
      return

    const showLabels = isLdvShowLabels()

    getLdvLabelsForUris(uris).then((json) => {
      const label = {}
      const lang = {}

      json.forEach(e => {
	label[e.uri] = e.label
	lang[e.uri] = e.lang
      })

      links.forEach(e => {
	if (!label[e.href])
	  return

	const labelBox = e.querySelector('.ldv-label')
	if (!labelBox)
	  return

	if (showLabels)
	  labelBox.innerHTML = `<em>${label[e.href]}` +
	    (lang[e.href] ?
	     `&nbsp;<span style="font-weight: lighter; font-size: smaller"><span>@</span><span style="font-size: smaller">${lang[e.href]}</span></span>` :
	     '') + `</em>`
	else
	  e.title = label[e.href] + (lang[e.href] ? ' @' + lang[e.href] : '')
      })
    })
  }

  const getLdvLabelsForUris = (uris) => {
    const infer = ldvConfig.infer
    const values = uris.map(e => `<${ e.startsWith('bnode://') ? '_:' + e.slice(8) : e }>`).join(' ')
    const query = ldvConfig.fetchLabelsQuery(values, getLdvLabelLang(), infer)

    return fetchLabelsQuery(query)
  }

  const ldvAddLabels = () => {
    const root = document.querySelector('#graph table[id]')
    if (!root)
      return
    const links = document.querySelectorAll('#graph table[id] a[href], #subtitle p a[href]')
    const uris = Array.from(new Set(Array.from(links).map(e => e.href)))
    uris.sort()
    ldvAddLabelsForUris(uris, links)
  }

  const isLdvShowLabels = () => {
    return window.localStorage.getItem('/ldv/loadlabels') === null
  }

  const getLdvLabelLang = () => {
    const localLang = window.localStorage.getItem('/ldv/labellang')
    if (localLang)
      return localLang
    else
      return ldvConfig.labelLang
  }

  const renderLdvLabelConfig = () => {
    const labelConfigHtml = document.getElementById('loadlabels')
    const checked = isLdvShowLabels()
    const currentLang = getLdvLabelLang()
    labelConfigHtml.innerHTML = `<input type="checkbox" onclick="ldvChangeLabelConfig(this)" id="loadlabelsx"${checked ? ' checked' :''} />` +
      `<label for="loadlabelsx">Resolve labels</label>` +
      (ldvConfig.labelLangChoice.length > 1 ?
       ` <select style="padding: 0 1em 0 4pt" onchange="ldvChangeLabelLanguage(this)" id="loadlabelslang">` +
       ldvConfig.labelLangChoice.map(lang => `<option value="${lang}"${currentLang === lang ? ' selected' : ''}>${lang}</option>`) +
       `</select>` :
       '')
  }

  const ldvChangeLabelConfig = (elem) => {
    if (elem.checked)
      window.localStorage.removeItem('/ldv/loadlabels')
    else
      window.localStorage.setItem('/ldv/loadlabels', false)
    window.location.reload()
  }

  const ldvChangeLabelLanguage = (elem) => {
    if (elem.value === ldvConfig.labelLang)
      window.localStorage.removeItem('/ldv/labellang')
    else
      window.localStorage.setItem('/ldv/labellang', elem.value)
    window.location.reload()
  }

  window.renderLdvLabelConfig = renderLdvLabelConfig
  window.isLdvShowLabels = isLdvShowLabels
  window.getLdvLabelLang = getLdvLabelLang
  window.ldvChangeLabelLanguage = ldvChangeLabelLanguage
  window.ldvChangeLabelConfig = ldvChangeLabelConfig
  window.ldvAddLabels = ldvAddLabels
  window.ldvAddLabelsForUris = ldvAddLabelsForUris
  window.getLdvLabelsForUris = getLdvLabelsForUris
})()
