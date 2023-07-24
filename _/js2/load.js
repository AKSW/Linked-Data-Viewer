/* global jsonld, makeMap, renderLd, renderBlankNodeSub, renderMoreResults, renderLdvLabelConfig, isLdvShowLabels, getLdvLabelLang, ldvResolveBnodes, ldvQueries, ldvConfig, ldvDef */

(() => {
  const xGeo = "http://www.opengis.net/ont/geosparql#"
  const pGeoAsWKT = xGeo + "asWKT"
  const pGeoHasGeometry = xGeo + "hasGeometry"
  const tGeoWktLiteral = xGeo + "wktLiteral"

  const ldvFetchTypeQuery = (type, query) => {
    return fetch(ldvConfig.endpointUrl, {
      ...ldvConfig.endpointOptions,
      headers: {
	Accept: type,
	'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'query=' + encodeURIComponent(query)
    })
  }

  const fetchPlain = (query) => {
    return ldvFetchTypeQuery('text/plain', query)
      .then((response) => response.status == 401 ? window.location.replace('/_/unauthorized') : response.text())
  }

  const fetchJsonLd = (query) => {
    return ldvFetchTypeQuery('application/ld+json', query)
      .then((response) => response.json())
  }

  const fetchJson = (query) => {
    return ldvFetchTypeQuery('application/json', query)
      .then((response) => response.json())
  }

  const findGeo = (iri) => {
    const infer = ldvConfig.infer
    const geoQuery = ldvQueries.geoQuery(iri, infer)
    fetchJsonLd(geoQuery)
      .then((json) => findMap(iri, json))
  }

  const findMap = (base, json) => {
    jsonld.promises.expand(json)
      .then((expanded) => {
	const root = expanded.find(e => e["@id"] == base)
	if (!root) {
	  return
	}
	if (root[pGeoHasGeometry]) {
	  const geomId = root[pGeoHasGeometry][0]["@id"]
	  if (geomId) {
	    findGeo(geomId)
	  }
	} else if (root[pGeoAsWKT]) {
	  if (root[pGeoAsWKT][0]["@type"] == tGeoWktLiteral) {
	    makeMap(root[pGeoAsWKT][0]["@value"])
	  }
	} else if (root['http://www.wikidata.org/prop/direct/P625']) {
	  if (root['http://www.wikidata.org/prop/direct/P625'][0]["@type"] === tGeoWktLiteral) {
	    makeMap(root['http://www.wikidata.org/prop/direct/P625'][0]["@value"])
	  }
	}
      })
  }

  const loadResource = (iri) => {
    const infer = ldvConfig.infer
    const askQuery = ldvQueries.askQuery(iri)
    const describeQuery = ldvQueries.describeQuery(iri, infer)
    const bIri = iri.startsWith('_:') ? 'bnode://' + iri.slice(2) : iri
    fetchPlain(askQuery)
      .then((text) => {
	if (text.trim() === 'yes') {
	  fetchJsonLd(describeQuery)
	    .then((json) => {
	      document.getElementById('data').innerHTML = JSON.stringify(json)
	      renderLd(bIri, ldvConfig.datasetBase, ldvConfig.localMode, json)
	      findMap(bIri, json)
	      renderLdvLabelConfig()
	    })
	} else {
	  window.location.replace('/_/not_found')
	}
      })
  }

  const ldvLoadSubResource = (iri) => {
    const infer = ldvConfig.infer
    const askQuery = ldvQueries.askQuery(iri)
    const describeQuery = ldvQueries.describeQuery(iri, infer)
    const bIri = iri.startsWith('_:') ? 'bnode://' + iri.slice(2) : iri
    return new Promise((resolve, reject) => {
      fetchPlain(askQuery)
	.then((text) => {
	  if (text.trim() === 'yes') {
	    fetchJsonLd(describeQuery)
	      .then((json) => {
		renderBlankNodeSub(bIri, json)
		  .then(resolve)
	      })
	  } else {
	    reject('not_found')
	  }
	})
    })
  }

  const doUrlConfig = () => {
    let config = window.location.pathname.split('*')
    let result = {}
    config.shift()
    config.forEach((e) => {
      switch (e) {
      case "infer1":
	window.localStorage.setItem('/ldv/infer', true)
	break
      case "infer0":
	window.localStorage.removeItem('/ldv/infer')
	break
      case "label1":
	window.localStorage.removeItem('/ldv/loadlabels')
	break
      case "label0":
	window.localStorage.setItem('/ldv/loadlabels', false)
	break
      case "":
	result.localMode = true
	break
      default:
	if (e.slice(0, 4) === "lang") {
	  const value = e.slice(4)
	  if (value !== ldvConfig.labelLang && ldvConfig.labelLangChoice.includes(value))
	    window.localStorage.setItem('/ldv/labellang', value)
	  else
	    window.localStorage.removeItem('/ldv/labellang')
	}
      }
    })

    const origin = ldvConfig.datasetBase
    const iri = window.location.search.substring(1) + window.location.hash

    var navigate

    if (result.localMode)
      navigate = '/*?' + iri
    else if (iri.slice(0, origin.length) === origin)
      navigate = iri.slice(origin.length)
    else
      navigate = '/?' + iri

    window.location.replace(navigate)
  }

  const ldvUpdateConfigLink = () => {
    const configLink = document.getElementById('configlink')
    const link = configLink.querySelector('a[href]')
    let parsed = new URL(link.href)
    parsed.pathname = `/` +
      `*infer${ ldvConfig.infer ? 1 : 0 }` +
      `*label${ isLdvShowLabels() ? 1 : 0 }` +
      `*lang${ getLdvLabelLang() }` +
      (ldvConfig.localMode ? '*' : '')
    link.href = parsed
  }

  const addUILinks = (resourceIri) => {
    const switchInfer = document.getElementById('inferswitch')
    switchInfer.innerHTML =
      `<input type="checkbox" onclick="ldvChangeInferConfig(this)" ` +
      `id="inferx"${ldvConfig.infer ? ' checked' :''} />` +
      `<label for="inferx">Calculate inferences</label>`

    const switchLink = document.getElementById('localswitch')
    switchLink.innerHTML =
      (ldvConfig.localMode ?
       `<a href="` +
       (resourceIri.slice(0, ldvConfig.datasetBase.length) === ldvConfig.datasetBase ?
	resourceIri.slice(ldvConfig.datasetBase.length) : `/?${resourceIri}`) +
       `">Global Browsing</a>` :
       `<a href="/*?${resourceIri}">Local Browsing</a>`)

    const configLink = document.getElementById('configlink')
    configLink.innerHTML = `<a href="/` +
      `*infer${ ldvConfig.infer ? 1 : 0 }` +
      `*label${ isLdvShowLabels() ? 1 : 0 }` +
      `*lang${ getLdvLabelLang() }` +
      (ldvConfig.localMode ? '*' : '') +
      `?${resourceIri}">Link</a>`

    const exploreLink = document.getElementById('explorelink')
    if (ldvConfig.exploreUrl.slice(0, 1) !== '@')
      exploreLink.innerHTML = `<a href="${ ldvConfig.exploreUrl }#r=${ resourceIri }" target="_blank">Explore</a>`
  }

  const loadWindowResource = () => {
    if (window.location.pathname.substring(0, 2) === '/_') // internal files
      return

    if (window.location.pathname.slice(0, 2) === '/*' && window.location.pathname.length > 2) {
      doUrlConfig()
      return
    }

    var resourceIri

    ldvConfig.infer = !! window.localStorage.getItem('/ldv/infer')
    ldvConfig.localMode = (window.location.pathname === '/*')

    if ((window.location.pathname === '/' || window.location.pathname === '/*') &&
	window.location.search)
      resourceIri = window.location.search.substring(1) + window.location.hash
    else
      resourceIri = ldvConfig.datasetBase + document.URL.slice(window.location.origin.length)

    if (ldvConfig.endpointUrl.slice(0, 1) !== '@') {
      loadResource(resourceIri)
      addUILinks(resourceIri)
    } else {
      alert("You need to configure ENDPOINT_URL in your config")
    }
  }

  const ldvChangeInferConfig = (elem) => {
    if (elem.checked)
      window.localStorage.setItem('/ldv/infer', true)
    else
      window.localStorage.removeItem('/ldv/infer')
    window.location.reload()
  }

  const ldvLoadMore = (elem) => {
    const cell = elem.closest('td')
    const row = cell.closest('tr')
    const property = row.querySelector('a[href]')
    const table = row.closest('table[id]')

    if (!cell || !row || !property || !table)
      return !false

    const infer = ldvConfig.infer
    const reverse = row.classList.contains('rdf-inverse')
    const s = table.id
    const p = reverse ? 'urn:x-arq:reverse:' + property.href : property.href

    const loadMoreQuery = reverse ?
	  ldvQueries.loadMoreReverseQuery(s, property.href, 10, cell.childElementCount - 1, infer) :
	  ldvQueries.loadMoreQuery(s, property.href, 10, cell.childElementCount - 1, infer)
    fetchJsonLd(loadMoreQuery)
      .then((json) => {
	const graph = JSON.parse(document.getElementById('data').innerHTML)
	if (graph['@id'] === json['@id']) {
	  const p = Object.keys(json).find(prop => !prop.startsWith('@'))
	  graph[p].splice(
	    graph[p].findIndex(
	      e => typeof e === 'object' && e['@type'] === 'urn:x-arq:more-results'
	    ), 1)
	  graph[p].push(...(Array.isArray(json[p]) ? json[p] : [json[p]]))
	}
	document.getElementById('data').innerHTML = JSON.stringify(graph)
	return renderMoreResults(json, s, p, elem, cell)
      })

    return !true
  }

  const loadInline = (iri, elem) => {
    const e = document.getElementById(iri)
    if (e) {
      e.parentElement.parentElement.scrollIntoView()
    } else {
      ldvResolveBnodes([iri], [elem])
    }
  }

  const ldvNavigate = (elem, event) => {
    const origin = ldvConfig.datasetBase
    const iri = elem.href

    var navigate

    if (iri.slice(0, 8) === 'bnode://')
      navigate = (ldvConfig.localMode ? '/*?_:' : '/?_:') + iri.slice(8)
    else if (event.shiftKey != ldvConfig.localMode)
      navigate = (ldvConfig.localMode ? '/*?' : '/?') + iri
    else if (iri.slice(0, origin.length) === origin)
      navigate = iri.slice(origin.length)

    if (!navigate && !event.altKey)
      return !false

    if (event.ctrlKey) {
      window.open(navigate, '_blank')
    } else if (event.altKey) {
      const expandButton = elem.nextElementSibling
      loadInline(iri, elem)
      if (expandButton && expandButton.textContent === ldvDef.expandButtonText)
	expandButton.textContent = ldvDef.collapseButtonText
    } else {
      window.location = navigate
    }
    return !true
  }

  const ldvLoadInlinePlus = (elem) => {
    const target = elem.previousElementSibling
    if (target === null)
      return

    if (target.href) {
      loadInline(target.href, target)
      elem.textContent = ldvDef.collapseButtonText
    } else {
      const graph = target.querySelector(':scope > div > table[id]')
      const node = target.querySelector(':scope > div > a[href]')
      if (graph && node) {
	elem.previousElementSibling.replaceWith(node)
	elem.textContent = ldvDef.expandButtonText
	// undo expansion steps done in bnodes.js:ldvResolveBnodes
	const p = elem.previousElementSibling.parentElement

	if (p.style.maxHeight === ldvDef.objMaxHeightExpanded) {
	  p.style.maxHeight = ldvDef.objMaxHeight
	}
      }
    }
  }

  const ldvLookupGraph = (elem) => {
    const s = `<${elem.closest('table[id]').id}>`

    const pParent = elem.closest('tr')
    const pLink = pParent.querySelector('.table-predicate a[href]')
    if (pLink === null)
      return

    const inverse = pParent.classList.contains('rdf-inverse')
    const p = `<${pLink.getAttribute('href')}>`

    let o
    const oParent = elem.closest('div[style*=max-height]')
    const opfec = oParent.firstElementChild
    if (opfec instanceof HTMLAnchorElement) {
      o = `<${opfec.getAttribute('href')}>`
    } else if (opfec instanceof HTMLDivElement) { // expanded entity
      o = `<${opfec.querySelector(':scope > div > a[href]').getAttribute('href')}>`
    } else {
      const text = oParent.querySelector(':scope > span > span:nth-of-type(1)').firstChild.nodeValue
      const escaped = text
	  .replace(/\\/g, '\\\\')
	  .replace(/\t/g, '\\t')
	  .replace(/\n/g, '\\n')
	  .replace(/\r/g, '\\r')
	  .replace(/\"/g, '\\"')
      o = `"${escaped}"`
      const langQuery = oParent.querySelector(':scope > span > span:nth-of-type(2)')
      if (langQuery !== null && langQuery.firstElementChild !== null) {
	const typeQuery = langQuery.querySelector(':scope > span > a[href]')
	if (typeQuery !== null) {
	  o += `^^<${typeQuery.getAttribute('href')}>`
	} else if (langQuery.firstChild.nodeValue === '@') {
	  o += `@${langQuery.firstElementChild.firstChild.nodeValue}`
	}
      }
    }
    const pattern = inverse ? `${o} ${p} ${s}` : `${s} ${p} ${o}`
    fetchJsonLd(`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        CONSTRUCT {
          ?id <urn:x-meta:originatingGraph> ?graph .
        } WHERE {
          BIND(<urn:x-meta:source-graph-lookup> as ?id) .
          VALUES (?s ?p ?o) { ( ${pattern} ) }
          GRAPH ?graph { ?s ?p ?o }
        }`)
      .then((json) => renderBlankNodeSub('urn:x-meta:source-graph-lookup', json))
      .then((res) => {
	const popup = document.getElementById('graphLookupPopup')
	const closePopup = (e) => {
	  // in link or popup
	  if (e && (e.target.closest('a') || e.target.closest('*[onclick]') || e.target.closest(`#${popup.id}`)))
	    return

	  popup.style.visibility = 'hidden'
	  document.body.removeEventListener('click', closePopup, true)
	}
	popup.innerHTML = res ? res : '?'
	popup.style.fontSize = '80%'
	popup.style.border = '1px solid'
	popup.style.padding = '5px'
	popup.style.background = 'rgba(255,255,255,0.7)'
	popup.style.visibility = 'visible'
	popup.style.position = 'absolute'
	const root = document.firstElementChild
	const er = elem.getBoundingClientRect()
	popup.style.bottom = (root.clientHeight - er.bottom + er.height / 2 - window.scrollY) + 'px'
	popup.style.right = (root.clientWidth - er.right + er.width / 2 - window.scrollX) + 'px'
	popup.style.maxHeight = Math.min(popup.getBoundingClientRect().bottom, root.clientHeight) + 'px'
	popup.style.maxWidth = Math.min(popup.getBoundingClientRect().right, root.clientWidth) + 'px'
	popup.style.overflow = 'auto'
	//popup.style.resize = 'both'
	popup.style.zIndex = 1000 // for leaflet
	document.body.addEventListener('click', closePopup, true)
      })
  }

  window.addEventListener('hashchange', (event) => window.location.reload())
  window.addEventListener('DOMContentLoaded', (event) => loadWindowResource())

  window.ldvFetchTypeQuery = ldvFetchTypeQuery
  window.ldvNavigate = ldvNavigate
  window.ldvLoadMore = ldvLoadMore
  window.ldvLoadSubResource = ldvLoadSubResource
  window.ldvChangeInferConfig = ldvChangeInferConfig
  window.ldvUpdateConfigLink = ldvUpdateConfigLink
  window.ldvLookupGraph = ldvLookupGraph
  window.ldvLoadInlinePlus = ldvLoadInlinePlus
})()
