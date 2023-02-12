// SPDX-License-Identifier: MIT
// based on https://github.com/zazuko/trifid-renderer-simple

/* global jsonld, ldvAddLabels, ldvAddLabelsForUris */

(() => {
  const termRegEx = new RegExp('(#|/)([^#/]*)$')
  const titlePredicates = ['http://schema.org/name', 'http://schema.org/headline', 'http://purl.org/dc/terms/title', 'http://www.w3.org/2000/01/rdf-schema#label']
  const globals = {}

  const hashCode = (s) => {
    var black = '000000'
    var hash = s.split('').reduce(function(a, b) {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    hash = (hash & 16777215)
    hash = hash.toString(16)
    return black.substring(0, black.length - hash.length) + hash
  }

  const compareShortestValue = (map) => (a, b) => {
    if (map[a].length < map[b].length)
      return -1
    if (map[b].length < map[a].length)
      return 1
    if (map[a] === map[b])
      return (a < b) ? -1 : 1
    if (map[a] < map[b])
      return -1
    if (map[b] < map[a])
      return 1
    return 0
  }

  const iriLabel = (iri) => {
    const parts = termRegEx.exec(iri)

    if (!parts || parts.length === 0 || parts[parts.length - 1].length === 0) {
      return null
    }

    const localpart = parts[parts.length - 1]
    const begin = iri.substring(0, iri.length - localpart.length + 1)
    if (globals.prefixMap) {
      const prefixes = Object.keys(globals.prefixMap)
      prefixes.sort(compareShortestValue(globals.prefixMap))
      for (var i = 0; i < prefixes.length; ++i) {
	var p = prefixes[i]
	const pFull = globals.prefixMap[p]
	if (p === '@vocab')
	  p = ''
	if (iri.substring(0, pFull.length) === pFull) {
	  return `<span style="font-size: smaller; vertical-align: text-bottom; color:#${hashCode(pFull)}'">&#9640;</span> `
	    + `<span class="ldv-label"><span style="font-size: smaller; font-weight: 300; padding-right: 2pt"><span style="font-size: smaller">${p}</span><span>:</span></span>${iri.substring(pFull.length)}</span>`
	}
      }
    }
    return `<span style="font-size: smaller; vertical-align: text-bottom; color:#${hashCode(begin)}">&#9640;</span> <span class="ldv-label">${localpart}</span>`
  }

  const subjectLabel = (subject, titlePredicates) => {
    return titlePredicates.reduce(function (label, titlePredicate) {
      return label || (titlePredicate in subject ? subject[titlePredicate][0]['@value'] : null)
    }, null)
  }

  const subjectSortId = (subject, titlePredicates) => {
    const label = subjectLabel(subject, titlePredicates) || subject['@id']

    if (subject['@id'].slice(0, 2) !== '_:') {
      return '0' + label // IRIs
    } else {
      return '1' + label // blank nodes
    }
  }

  const subjectSort = (myIri, titlePredicates) => (a, b) => {
    if (a['@id'] === b['@id'])
      return 0
    if (a['@id'] === myIri)
      return -1
    if (b['@id'] === myIri)
      return 1
    return subjectSortId(a, titlePredicates).localeCompare(subjectSortId(b, titlePredicates), undefined, { sensitivity: 'base', numeric: true })
  }

  const renderNodeLabelOrPlain = (node) => {
    if (typeof node === 'object') {
      if ('@type' in node && node['@type'] === 'urn:x-arq:more-results')
	return String.fromCodePoint(0x10fff)
      return renderNode(node, '@id' in node ? iriLabel(node['@id']) : '')
    }
    return node
  }

  const nodeSort = (a, b) => {
    return renderNodeLabelOrPlain(a).localeCompare(renderNodeLabelOrPlain(b), undefined, { sensitivity: 'base', numeric: true })
  }

  const predicateLabel = (iri, vocab) => {
    const predicate = 'http://www.w3.org/2000/01/rdf-schema#label'
    const language = navigator.language || navigator.userLanguage

    for (var i = 0; i < vocab.length; i++) {
      const subject = vocab[i]

      if (subject['@id'] === iri && predicate in subject) {
	const objects = subject[predicate]

	for (var j = 0; j < objects.length; j++) {
          if (!('@language' in objects[j]) || objects[j]['@language'] === language) {
            return objects[j]['@value']
          }
	}
      }
    }

    return iriLabel(iri)
  }

  const render = (elementId, html) => {
    const element = document.getElementById(elementId)

    if (element) {
      element.innerHTML = html
    }
  }

  const renderLink = (iri, label) => {
    const origin = globals.datasetBase

    const loadMore = (iri === 'urn:x-arq:more-results') ? ' onclick="return ldvLoadMore(this)"' : ''
    var navigate

    if (iri.slice(0, origin.length) === origin)
      navigate = iri.slice(origin.length)

    return `<a href="${iri}" title="${iri}"` +
      (loadMore ? loadMore : ' onclick="return ldvNavigate(this,event)"') +
      (navigate ? '' : ' target="_blank"') + // open IRIs with the same origin in the same tab, all others in a new tab
      `>${label}</a>`
  }

  const renderTitle = (myIri, graph, titlePredicates) => {
    const subject = graph.filter(function (subject) {
      return subject['@id'] === myIri
    }).shift()

    if (!subject)
      return ''

    const title = subjectLabel(subject, titlePredicates)

    if (!title)
      return ''

    return `<h1>${title}</h1>`
  }

  const renderSticky = (myIri, graph) => {
    const resource = `<h4><a href="${myIri}">${myIri}</a></h4>`

    const subject = graph.filter(function (subject) {
      return subject['@id'] === myIri
    }).shift()

    var typeElements = ''

    if (subject && subject['@type']) {
      typeElements = 'a ' + subject['@type'].map(function (type) {
	return renderLink(type, iriLabel(type))
      }).join(', ')
    }

    const type = '<p>' + typeElements + '</p>'

    return '<span>' + resource + type + '</span>'
  }

  const renderPredicate = (iri, label) => {
    return renderLink(iri, '<b>' + (label || iri) + '</b>')
  }

  const renderIri = (iri, label) => {
    return renderLink(iri, label || iri)
  }

  const renderBlankNode = (blankNode) => {
    return `<a href="#${blankNode}">${blankNode}</a>`
  }

  const renderLiteral = (literal) => {
    if (typeof literal === 'string') {
      return `<span>${literal}</span>`
    } else {
      if ('@language' in literal) {
	return `<span><span>${literal['@value']}</span> ` +
	  `<span>@<span>${literal['@language']}</span></span></span>`
      } else if ('@type' in literal) {
	return `<span><span>${literal['@value']}</span> ` +
	  `<span style="font-size: smaller">(<span>` +
	  renderIri(literal['@type'], iriLabel(literal['@type'])) +
	  `</span>)</span></span>`
      } else {
	return `<span><span>${literal['@value']}</span></span>`
      }
    }
  }

  const renderNode = (node, label) => {
    if (typeof node === 'object') {
      if ('@id' in node) {
	if (node['@id'].indexOf('_:') !== 0) {
          return renderIri(node['@id'], label)
	} else {
          return renderBlankNode(node['@id'])
	}
      } else {
	return renderLiteral(node)
      }
    } else {
      return renderLiteral(node)
    }
  }

  const renderObjectElements = (objects) => {
    return objects.map(function (object) {
      return '<div style="max-height: 23ex; overflow: auto; text-overflow: ellipsis">' +
	renderNode(object, '@id' in object ? iriLabel(object['@id']) : '') +
	'</div>'
    }).join('')
  }

  const renderTable = (myIri, subject, vocab) => {
    var head = '<thead class="table-subject"></thead>'

    if (subject['@id'] !== myIri)
      head = `<thead><tr><th colspan="2">${renderNode(subject)}</th></tr></thead>`

    const predicates = Object.keys(subject).slice()
    predicates.sort()
    var rows = predicates.map(function (predicate) {
      var objects = subject[predicate]
      if (Array.isArray(objects)) {
	objects = objects.slice()
	objects.sort(nodeSort)
      }

      if (predicate.slice(0, 1) === '@') {
	if (predicate === '@type') {
          predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

          objects = objects.map(function (type) {
            return {'@id': type}
          })
	} else {
          return ''
	}
      }

      var isReverse = (predicate.slice(0, 18) === 'urn:x-arq:reverse:')
      if (isReverse)
	predicate = predicate.slice(18)

      return `<tr${isReverse ? ' class="rdf-inverse"' : ''}>` +
	`<td class="table-predicate col-lg-4"${isReverse ? ' style="padding-left: 1.5em"': ''}>` +
	(predicate === 'urn:x-meta:originatingGraph' ? '<b style="text-variant: small-caps">source graph</b>' :
	 (isReverse ? "is " : "") +
	 renderPredicate(predicate, predicateLabel(predicate, vocab)) +
	 (isReverse ? " of" : "")) +
	`</td>` +
	`<td class="table-object col-lg-8">${renderObjectElements(objects)}</td>` +
	`</tr>`
    }).join('')

    return `<table id="${subject['@id']}" class="table table-striped table-graph">` +
      head +
      `<tbody>${rows}</tbody></table>`
  }

  const renderTables = (myIri, graph, vocab, titlePredicates) => {
    const subjects = graph.sort(subjectSort(myIri, titlePredicates))

    return subjects.map(function (subject) {
      return renderTable(myIri, subject, vocab)
    }).join('')
  }

  const embeddedGraph = (json /*elementId*/) => {
    /*
    var element = document.getElementById(elementId)

    if (!element) {
      return Promise.resolve({})
    }

    var json = JSON.parse(element.innerHTML)
    */

    return jsonld.promises.flatten(json, {}).then(function (flat) {
      return jsonld.promises.expand(flat).then(function (json) {
	// if data contains quads, merge them all together
	return json.reduce(function (json, item) {
          if (item['@graph']) {
            return json.concat(item['@graph'])
          }

          return json.concat(item)
	}, [])
      })
    })
  }

  const renderLd = (iri, datasetBase, localMode, json) => {
    globals.prefixMap = json['@context']
    Promise.all([
      embeddedGraph({} /*'vocab'*/),
      embeddedGraph(json /*'data'*/)
    ]).then(function (results) {
      const vocab = results[0]
      const graph = results[1]

      globals.datasetBase = datasetBase
      globals.localMode = localMode

      render('title', renderTitle(iri, graph, titlePredicates))
      render('subtitle', renderSticky(iri, graph))
      render('graph', renderTables(iri, graph, vocab, titlePredicates))

      ldvAddLabels()
    }).catch(function (error) {
      console.error(error)
    })
  }

  const renderMoreResults = (json, s, p, elem, cell) => {
    return embeddedGraph(json)
      .then(graph => {
	const subject = graph.find(elem => elem['@id'] === s)
	if (!subject)
	  return

        if (p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
	  p = '@type'

	var objects = subject[p]
	if (Array.isArray(objects)) {
	  objects = objects.slice()
	  objects.sort(nodeSort)
	}

	if (p === '@type') {
          p = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

          objects = objects.map(function (type) {
	    return {'@id': type}
          })
	}

	const newUris = objects.filter(e => e['@id']).map(e => e['@id'])

	const moreHtml = renderObjectElements(objects)
	cell.insertAdjacentHTML('beforeend', moreHtml)
	elem.closest('div').remove()

	ldvAddLabelsForUris(newUris, cell.querySelectorAll('a[href]'))
      })
  }

  window.renderMoreResults = renderMoreResults
  window.renderLd = renderLd
})()
