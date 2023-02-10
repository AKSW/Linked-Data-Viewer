/* global jsonld, makeMap, renderLd, ldvConfig */

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

    if (window.location.pathname === '/' && window.location.search) {
      resourceIri = window.location.search.substring(1) + window.location.hash
    } else if (window.location.pathname === '/*' && window.location.search) {
      resourceIri = window.location.search.substring(1) + window.location.hash
      ldvConfig.localMode = true
    }
    else {
      resourceIri = document.URL

      const localModeSwitch = '&*local'
      if (resourceIri.endsWith(localModeSwitch)) {
	resourceIri = resourceIri.substring(0, resourceIri.length - localModeSwitch.length)
	localRedir = true
      }
    }

    if (ldvConfig.datasetBase)
      resourceIri = resourceIri.replace(window.location.origin, ldvConfig.datasetBase)
    else
      ldvConfig.datasetBase = window.location.origin

    if (localRedir) {
      window.location.replace('/*?' + resourceIri)
      return
    }

    loadResource(resourceIri)

    const switchLink = document.getElementById('localswitch')
    switchLink.innerHTML =
      (ldvConfig.localMode ?
       `<a href="` +
       (resourceIri.slice(0, ldvConfig.datasetBase.length) === ldvConfig.datasetBase ?
	resourceIri.slice(ldvConfig.datasetBase.length) : resourceIri) +
       `">Global Browsing</a>` :
       `<a href="` + document.URL + '&*local' + `">Local Browsing</a>`)
  }

  window.addEventListener('hashchange', (event) => window.location.reload())
  window.addEventListener('DOMContentLoaded', (event) => loadWindowResource())
})()
