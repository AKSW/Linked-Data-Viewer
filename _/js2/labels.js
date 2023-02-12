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

    var values = uris.map(e => `<${e}>`).join(' ')
    var query = ldvConfig.fetchLabelsQuery(values, ldvConfig.labelLang)
    var showLabels = isShowLabels()

    fetchLabelsQuery(query).then((json) => {
      var label = {}
      var lang = {}

      json.forEach(e => {
	label[e.uri] = e.label
	lang[e.uri] = e.lang
      })

      links.forEach(e => {
	if (!label[e.href])
	  return

	var labelBox = e.querySelector('.ldv-label')
	if (!labelBox)
	  return

	if (showLabels)
	  labelBox.innerHTML = `<em>${label[e.href]}` +
	    (lang[e.href] ?
	     ` <span style="font-weight: 300; font-size: smaller"><span>@</span><span style="font-size: smaller">${lang[e.href]}</span></span>` :
	     '') + `</em>`
	else
	  e.title = label[e.href] + (lang[e.href] ? ' @' + lang[e.href] : '')
      })
    })
  }

  const ldvAddLabels = () => {
    const root = document.querySelector('#graph table[id]')
    if (!root)
      return
    const links = root.querySelectorAll('a[href]')
    const uris = Array.from(new Set(Array.from(links).map(e => e.href)))
    ldvAddLabelsForUris(uris, links)
  }

  const isShowLabels = () => {
    return window.localStorage.getItem('/ldv/loadlabels') === null
  }

  const renderLdvLabelConfig = () => {
    const labelConfigHtml = document.getElementById('loadlabels')
    const checked = isShowLabels()
    labelConfigHtml.innerHTML = `<input type="checkbox" onclick="ldvChangeLabelConfig(this)" id="loadlabelsx"${checked ? ' checked' :''} />` +
      `<label for="loadlabelsx">Resolve labels</label>`
  }

  const ldvChangeLabelConfig = (elem) => {
    if (elem.checked)
      window.localStorage.removeItem('/ldv/loadlabels')
    else
      window.localStorage.setItem('/ldv/loadlabels', false)
    window.location.reload()
  }

  window.renderLdvLabelConfig = renderLdvLabelConfig
  window.ldvChangeLabelConfig = ldvChangeLabelConfig
  window.ldvAddLabels = ldvAddLabels
  window.ldvAddLabelsForUris = ldvAddLabelsForUris
})()
