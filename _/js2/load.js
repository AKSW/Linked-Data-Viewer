/* global jsonld, makeMap, renderLd, renderMoreResults, renderLdvLabelConfig, ldvConfig */

(() => {
  const xGeo = "http://www.opengis.net/ont/geosparql#"
  const pGeoAsWKT = xGeo + "asWKT"
  const pGeoHasGeometry = xGeo + "hasGeometry"
  const tGeoWktLiteral = xGeo + "wktLiteral"

  const fetchPlain = (query) => {
    return fetch(ldvConfig.endpointUrl, {
      ...ldvConfig.endpointOptions,
      headers: {
	Accept: 'text/plain',
	'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'query=' + encodeURIComponent(query)
    }).then((response) => response.status == 401 ? window.location.replace('/_/unauthorized') : response.text())
  }

  const fetchJsonLd = (query) => {
    return fetch(ldvConfig.endpointUrl, {
      ...ldvConfig.endpointOptions,
      headers: {
	Accept: 'application/ld+json',
	'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'query=' + encodeURIComponent(query)
    }).then((response) => response.json())
  }

  const findGeo = (iri) => {
    const geoQuery = `CONSTRUCT WHERE {
  <${iri}> <${pGeoAsWKT}> ?wktLiteral
}
`
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
    const askQuery = ldvConfig.askQuery(iri)
    const describeQuery = ldvConfig.describeQuery(iri)
    fetchPlain(askQuery)
      .then((text) => {
	if (text.trim() === 'yes') {
	  fetchJsonLd(describeQuery)
	    .then((json) => {
	      document.getElementById('data').innerHTML = JSON.stringify(json)
	      renderLd(iri, ldvConfig.datasetBase, ldvConfig.localMode, json)
	      findMap(iri, json)
	      renderLdvLabelConfig()
	    })
	} else {
	  window.location.replace('/_/not_found')
	}
      })
  }

  const loadWindowResource = () => {
    if (window.location.pathname.substring(0, 2) === '/_')
      return

    var resourceIri
    var localRedir

    ldvConfig.localMode = (window.location.pathname === '/*')

    if ((window.location.pathname === '/' || window.location.pathname === '/*') &&
	window.location.search)
      resourceIri = window.location.search.substring(1) + window.location.hash
    else
      resourceIri = ldvConfig.datasetBase + document.URL.slice(window.location.origin.length)

    loadResource(resourceIri)

    const switchLink = document.getElementById('localswitch')
    switchLink.innerHTML =
      (ldvConfig.localMode ?
       `<a href="` +
       (resourceIri.slice(0, ldvConfig.datasetBase.length) === ldvConfig.datasetBase ?
	resourceIri.slice(ldvConfig.datasetBase.length) : resourceIri) +
       `">Global Browsing</a>` :
       `<a href="/*?${resourceIri}">Local Browsing</a>`)
  }

  const ldvLoadMore = (elem) => {
    var cell = elem.closest('td')
    var row = cell.closest('tr')
    var property = row.querySelector('a[href]')
    var table = row.closest('table[id]')

    if (!cell || !row || !property || !table)
      return !false

    const reverse = row.classList.contains('rdf-inverse')
    const s = table.id
    const p = reverse ? 'urn:x-arq:reverse:' + property.href : property.href

    const loadMoreQuery = reverse ?
	  ldvConfig.loadMoreReverseQuery(s, property.href, 10, cell.childElementCount - 1) :
	  ldvConfig.loadMoreQuery(s, property.href, 10, cell.childElementCount - 1)
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

  const ldvNavigate = (elem, event) => {
    const origin = ldvConfig.datasetBase
    const iri = elem.href

    var navigate

    if (event.shiftKey != ldvConfig.localMode)
      navigate = (ldvConfig.localMode ? '/*?' : '/?') + iri
    else if (iri.slice(0, origin.length) === origin)
      navigate = iri.slice(origin.length)

    if (!navigate)
      return !false

    if (event.ctrlKey)
      window.open(navigate, '_blank').focus()
    else
      window.location = navigate
    return !true
  }

  window.addEventListener('hashchange', (event) => window.location.reload())
  window.addEventListener('DOMContentLoaded', (event) => loadWindowResource())

  window.ldvNavigate = ldvNavigate
  window.ldvLoadMore = ldvLoadMore
})()
