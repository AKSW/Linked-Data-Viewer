/* global renderTitleAgain, ldvQueries, ldvConfig */

(() => {
  const labels = { '': {} }

  const fetchLabelsJson = (query) => {
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
    const lang = getLdvLabelLang()

    getLdvLabelsForUris(uris, lang).then(() => {
      links.forEach(e => {
	const labelBox = e.querySelector('.ldv-label')
	if (!labelBox)
	  return

	if (!e.classList.contains('isLabelled')) {
	  e.classList.add('isLabelled')
	  labels[''][e.href] = labelBox.innerHTML
	} else {
	  e.removeAttribute('title')
	  labelBox.innerHTML = labels[''][e.href]
	}

	if (!labels[lang][e.href] || !('label' in labels[lang][e.href])) {
	  e.classList.remove('isLabelled')
	  return
	}

	const label = labels[lang][e.href].label
	const llang = labels[lang][e.href].lang

	if (showLabels)
	  labelBox.innerHTML = `<em>${label}` +
	    (llang ?
	     `&nbsp;<span style="font-weight: lighter; font-size: smaller"><span>@</span><span style="font-size: smaller">${llang}</span></span>` :
	     '') + `</em>`
	else
	  e.title = label + (llang ? ' @' + llang : '')
      })
    })
  }

  const getLdvLabelsForUris = (uris, lang) => {
    const infer = ldvConfig.infer

    labels[lang] ||= {}
    const newUris = Array.from(new Set(Array.from(uris).filter(e => !(e in labels[lang]))))
    newUris.sort()

    if (!newUris.length)
      return Promise.resolve([])

    const values = uris.map(e => `<${ e.startsWith('bnode://') ? '_:' + e.slice(8) : e }>`).join(' ')
    const query = ldvQueries.fetchLabelsQuery(values, lang, infer)

    return fetchLabelsJson(query).then((json) => {
      json.forEach(e => {
	labels[lang][e.uri] = e
      })
    })
  }

  const getLdvLabelsOf = (iri) => {
    const lang = getLdvLabelLang()
    return getLdvLabelsForUris([iri], lang).then(() => labels[lang][iri])
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

  const redoLabels = () => {
    renderTitleAgain()
    ldvAddLabels()
  }

  const ldvChangeLabelConfig = (elem) => {
    if (elem.checked)
      window.localStorage.removeItem('/ldv/loadlabels')
    else
      window.localStorage.setItem('/ldv/loadlabels', false)
    redoLabels()
  }

  const ldvChangeLabelLanguage = (elem) => {
    if (elem.value === ldvConfig.labelLang)
      window.localStorage.removeItem('/ldv/labellang')
    else
      window.localStorage.setItem('/ldv/labellang', elem.value)
    redoLabels()
  }

  window.renderLdvLabelConfig = renderLdvLabelConfig
  window.isLdvShowLabels = isLdvShowLabels
  window.getLdvLabelLang = getLdvLabelLang
  window.ldvChangeLabelLanguage = ldvChangeLabelLanguage
  window.ldvChangeLabelConfig = ldvChangeLabelConfig
  window.ldvAddLabels = ldvAddLabels
  window.getLdvLabelsOf = getLdvLabelsOf
})()
