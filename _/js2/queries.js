/* global ldvDef, ldvStartpageMoreClassesInstQuery, ldvStartpageMoreClassesOntQuery */
(() => {
  const bnodeFn = (from, to) => `bind(if(isblank(${from}),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(${from}))),${from}) as ${to})`
  const bnodeFnInv = (iri, out) => `<${ iri.startsWith('_:') ? 'bnode://' + iri.slice(2) : iri }>`

  const ldvQueries = {
    askQuery: (iri, reverseEnabled) => {
      const altIri = iri.replaceAll('(', '%28').replaceAll(')', '%29')
      const r = reverseEnabled === 'yes'

      return `ASK {
${r ? `{` : ''}
    VALUES ?s { <${altIri}> <${iri}> }
    ?s ?p ?o
${r ? `} UNION {
    VALUES ?o { <${altIri}> <${iri}> }
    ?s ?p ?o
}` : ''}
}
`
    },
    describeQuery: (iri, infer, reverseEnabled) => {
      const altIri = iri.replaceAll('(', '%28').replaceAll(')', '%29')
      return `CONSTRUCT {
  ?s ?p ?o .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    SELECT ?x {
      VALUES ?x { <${altIri}> <${iri}> }
      ?x ?p_ [] .
    } LIMIT 1
  } LATERAL {` +
    [`{
      BIND(?x AS ?s_) .
      LATERAL {
        {
          { SELECT DISTINCT ?s_ ?p ?o {
            VALUES ?p {<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>}
            ?s_ ?p ?o_ .
            ${bnodeFn('?o_', '?o')}
          } }
        } UNION {
          {
            SELECT DISTINCT ?s_ ?p {
              ?s_ ?p []
              FILTER(?p != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
            } LIMIT 1000
          } LATERAL {
            {
              SELECT ?s_ ?p ?o {
                ?s_ ?p ?o_ .
                ${bnodeFn('?o_', '?o')}
              } LIMIT 10
            } UNION {
              { SELECT ?s_ ?p (count(?ox) AS ?oCnt) {
                  SELECT ?s_ ?p ?ox {
                    ?s_ ?p ?ox
                  } LIMIT 11
                } GROUP BY ?s_ ?p
              }
              FILTER(?oCnt > 10)
              BIND(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?o)
            }
          }
        } UNION {
          { SELECT DISTINCT ?s_ ?p ?o {
              VALUES ?p { <${ldvDef.sourceGraphPropId}> }
              GRAPH ?o {
                ?s_ a ?ox
              }
            }
          }
        }
      }
      ${bnodeFn('?s_', '?s')}
    }`, ... reverseEnabled === 'yes' ? [`{
      bind(?x AS ?s_) .
      LATERAL {
        {
          SELECT DISTINCT ?s_ ?rp {
            { SELECT ?s_ ?rp {
                [] ?rp ?s_
              } LIMIT 10000
            }
          } LIMIT 100
        } LATERAL {
          {
            SELECT ?s_ ?rp ?o {
              ?o_ ?rp ?s_ .
              ${bnodeFn('?o_', '?o')}
            } LIMIT 10
          } UNION {
            { SELECT ?s_ ?rp (count(?ox) AS ?oCnt) {
                SELECT ?s_ ?rp ?ox {
                  ?ox ?rp ?s_
                } LIMIT 11
              } GROUP BY ?s_ ?rp
            }
            FILTER(?oCnt > 10)
            BIND(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?o)
          }
        }
      }
      bind(uri(concat('${ldvDef.reversePropPrefix}:',str(?rp))) AS ?p)
      ${bnodeFn('?s_', '?s')}
    }`] : [] ].join(` UNION `) + `
  }
  ${ infer ? '}' : '' }
}
`
    },
    loadMoreQuery: (s, p, limit, offset, infer) => p === ldvDef.classesInstPropId ? ldvStartpageMoreClassesInstQuery(limit, offset)
      : p === ldvDef.classesOntPropId ? ldvStartpageMoreClassesOntQuery(limit, offset)
      : `CONSTRUCT {
  ${bnodeFnInv(s)} <${p}> ?o .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?o {
      <${s}> <${p}> ?o_ .
      ${bnodeFn('?o_', '?o')}
    } LIMIT ${limit} OFFSET ${offset}
  } UNION {
    { SELECT (count(?ox) AS ?oCnt) {
        {
          SELECT ?ox {
            <${s}> <${p}> ?ox
          } LIMIT ${limit + 1} OFFSET ${offset}
        }
      }
    }
    FILTER(?oCnt > 10)
    bind(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?o)
  }
  ${ infer ? '}' : '' }
}
`,
    loadMoreReverseQuery: (o, p, limit, offset, infer) => `CONSTRUCT {
  ${bnodeFnInv(o)} <${ldvDef.reversePropPrefix}:${p}> ?s .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?s {
      ?s_ <${p}> <${o}> .
      ${bnodeFn('?s_', '?s')}
    } LIMIT ${limit} OFFSET ${offset}
  } UNION {
    { SELECT (count(?sx) AS ?sCnt) {
        {
          SELECT ?sx {
            ?sx <${p}> <${o}>
          } LIMIT ${limit + 1} OFFSET ${offset}
        }
      }
    }
    FILTER(?sCnt > 10)
    bind(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?s)
  }
  ${ infer ? '}' : '' }
}
`,
    fetchLabelsQuery: (uris, lang, infer) => `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

CONSTRUCT {
  ?uri <urn:x-ldv:label> ?label .
  ?uri <urn:x-ldv:labelFetched> true .
} WHERE {
  VALUES ?uri_ { ${uris} }
  ${bnodeFn('?uri_', '?uri')}
  LATERAL { OPTIONAL {
    ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
    SELECT ?uri ?uri_ ?label {
      {
        ?uri_ rdfs:label|skos:prefLabel ?label .
        FILTER(lang(?label) = "${lang}") .
      } UNION {
        ?uri_ rdfs:label|skos:prefLabel ?label .
        FILTER(lang(?label) = "") .
      }
    } LIMIT 1
    ${ infer ? '}' : '' }
  } }
}
`,
    geoQuery: (iri, infer) => `CONSTRUCT {
  <${iri}> <http://www.opengis.net/ont/geosparql#asWKT> ?wktLiteral
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  <${iri}> <http://www.opengis.net/ont/geosparql#asWKT> ?wktLiteral
  ${ infer ? '}' : '' }
}
`,
    featAllGeoQuery: (iri, infer) => `CONSTRUCT {
  <${iri}#featAllGeo> <http://www.opengis.net/ont/geosparql#asWKT> ?wktLiteral
} WHERE {
  SELECT (<http://www.opengis.net/def/function/geosparql/collect>(?wktLiteral_) as ?wktLiteral) WHERE {
    ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
    <${iri}> <http://www.opengis.net/ont/geosparql#hasGeometry> ?geom .
    ?geom <http://www.opengis.net/ont/geosparql#asWKT> ?wktLiteral_ .
    ${ infer ? '}' : '' }
  }
}
`,
    graphLookupQuery: (lookupId, pattern) => `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
CONSTRUCT {
  ?id <${ldvDef.sourceGraphPropId}> ?graph .
} WHERE {
  VALUES ?id { <${lookupId}> }
  GRAPH ?graph {  ${pattern} }
}`,

    describeQueryEmuS: (iri, infer, reverseEnabled) => {
      const altIri = iri.replaceAll('(', '%28').replaceAll(')', '%29')
      const r = reverseEnabled === 'yes'

      return `CONSTRUCT {
  ?s <urn:x-var:p> <urn:x-var:o> .
  ?s a ?type .
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    {
      SELECT ?s_ {
${r ? `{` : ''}
        VALUES ?s_ { <${altIri}> <${iri}> }
        ?s_ ?p [] .
${r ? `} UNION {
        VALUES ?s_ { <${altIri}> <${iri}> }
        ?ox ?p ?s_
}` : ''}
      } LIMIT 1
    } UNION {
      SELECT ?s_ ?type {
        VALUES ?s_ { <${altIri}> <${iri}> }
        ?s_ a ?type .
      }
    }
  }
  ${bnodeFn('?s_', '?s')}
  ${ infer ? '}' : '' }
}
`
    },
    describeQueryEmuListP: (iri, infer, reverseEnabled) => {
      return `CONSTRUCT {
  ?s <urn:x-var:p-list> ?p .
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    SELECT DISTINCT ?s_ ?p {
      VALUES ?s_ { <${iri}> }
      ?s_ ?p [] .
      filter(?p != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
    } LIMIT 1000
  }
  ${bnodeFn('?s_', '?s')}
  ${ infer ? '}' : '' }
}
`
    },
    describeQueryEmuListPReverse: (iri, infer, reverseEnabled) => {
      return `CONSTRUCT {
  ?s <urn:x-var:p-reverse-list> ?rp .
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    SELECT DISTINCT ?s_ ?rp {
      VALUES ?s_ { <${iri}> }
      ?o ?rp ?s_ .
    } LIMIT 1000
  }
  ${bnodeFn('?s_', '?s')}
  ${ infer ? '}' : '' }
}
`
    },
    describeQueryEmuListPObjs: (iri, pName, infer, reverseEnabled, prefixes) => {
      return `${prefixes}
CONSTRUCT {
  ?s ?p ?o .
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    {
      SELECT ?s_ ?p ?o {
        VALUES (?s_ ?p) { (<${iri}> ${pName}) }
        ?s_ ?p ?o_ .
        ${bnodeFn('?o_', '?o')}
      } LIMIT 10
    } UNION {
      {
        SELECT ?s_ ?p (count(?ox) AS ?oCnt) {
          {
            SELECT ?s_ ?p ?ox {
              VALUES (?s_ ?p) { (<${iri}> ${pName}) }
              ?s_ ?p ?ox
            } LIMIT 11
          }
        } GROUP BY ?s_ ?p
      }
      FILTER(?oCnt > 10)
      bind(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?o)
    }
  }
  ${bnodeFn('?s_', '?s')}
  ${ infer ? '}' : '' }
}`
    },
    describeQueryEmuListPReverseObjs: (iri, pIri, infer, reverseEnabled) => {
      return `CONSTRUCT {
  ?s ?p ?o .
} WHERE {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    {
      SELECT ?s_ ?rp ?o {
        VALUES (?s_ ?rp) { (<${iri}> <${pIri}>) }
        ?o_ ?rp ?s_ .
        ${bnodeFn('?o_', '?o')}
      } LIMIT 10
    } UNION {
      {
        SELECT ?s_ ?rp (count(?ox) AS ?oCnt) {
          {
            SELECT ?s_ ?rp ?ox {
              VALUES (?s_ ?rp) { (<${iri}> <${pIri}>) }
              ?ox ?rp ?s_
            } LIMIT 11
          }
        } GROUP BY ?s_ ?rp
      }
      FILTER(?oCnt > 10)
      bind(strdt('...',<${ldvDef.moreResultsObjId}>) AS ?o)
    }
  }
  bind(uri(concat('${ldvDef.reversePropPrefix}:',str(?rp))) AS ?p)
  ${bnodeFn('?s_', '?s')}
  ${ infer ? '}' : '' }
}`
    },
  }

  window.ldvQueries = ldvQueries
})()
