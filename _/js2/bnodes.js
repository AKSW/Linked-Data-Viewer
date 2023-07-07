/* global ldvLoadSubResource, ldvAddLabels */

(() => {
  const globals = {}
  
  const ldvBlankNodes = (rootIri) => {
    const root = document.querySelector('#graph table[id]')
    if (!root)
      return

    globals.resolved ||= {}
    if (rootIri)
      globals.resolved[rootIri] = 1

    const links = document.querySelectorAll('#graph table[id] td.table-object a[href]')
    const bnodes = Array.from(
      new Set(
	Array.from(links)
	  .map(e => e.href)
	  .filter(e => e.startsWith('bnode://'))
	  .filter(e => !(e in globals.resolved))
      ))
    bnodes.sort()
    if (!bnodes.length) // no more new blank nodes to resolve, fetch new labels
      ldvAddLabels()
    else
      ldvResolveBnodes(bnodes, links)
  }

  const ldvResolveBnodes = (bnodes, links) => {
    if (!bnodes.length)
      return

    const next = (bnodes, links) => {
      if (bnodes.length === 1)
	ldvBlankNodes() // all current nodes resolved, recurse looking for new blank nodes
      else
	ldvResolveBnodes(bnodes.slice(1), links)
    }

    globals.resolved ||= {}

    const node = bnodes[0]
    if (node in globals.resolved) {
      next(bnodes, links)
      return
    }

    globals.resolved[node] = 0

    const gNode = node.startsWith('bnode://') ? '_:' + node.slice(8) : node

    const es = []
    const heads = []
    let i = 0
    links.forEach(e => {
      if (e.href === node) {
	const head = e.outerHTML
	heads.push(head)
	const id = `bn_${i++}_${e.href}`
	e.outerHTML = `<div id="${id}" style="display: inline-block; padding: 5px; margin: 5px; border: 1px solid silver">` +
	  `<div>${head}</div>` +
	  `<div style="font-size: 90%; font-weight: lighter">Loading...</div>` +
	  `</div>`
	const newE = document.getElementById(id)
	newE.removeAttribute('id')
	es.push(newE)
      }
    })

    ldvLoadSubResource(gNode)
      .then((html) => {
	globals.resolved[node] = 1
	es.forEach(e => {
	  const p = e.parentElement
	  const head = heads.shift()

	  let overflow = ''
	  if (p.style.maxHeight === '23ex') {
	    p.style.maxHeight = '55ex'
	    overflow = 'overflow: auto; max-height: 51ex; '
	  }

	  e.outerHTML = `<div style="${overflow}display: inline-block; padding: 5px; margin: 5px; border: 1px solid silver">` +
	    `<div>${head}</div>` +
	    `<div style="font-size: 90%; font-weight: lighter">${html}</div>` +
	    `</div>`
	  globals.resolved[node] += 1
	})
      })
      .catch((err) => {
	globals.resolved[node] = -1
	console.log(`${node}: ${err}`)
	es.forEach(e => {
	  const head = heads.shift()
	  e.outerHTML = head
	  globals.resolved[node] -= 1
	})
      })
      .finally(() => {
	next(bnodes, links)
      })

  }

  window.ldvBlankNodes = ldvBlankNodes
  window.ldvResolveBnodes = ldvResolveBnodes
})()
