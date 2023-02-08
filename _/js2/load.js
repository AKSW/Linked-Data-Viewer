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
	      renderLd(iri, json)
	      findMap(iri, json)
	    })
	} else {
	  window.location.replace('/_/not_found')
	}
      })
  }

  window.loadResource = loadResource
})()
