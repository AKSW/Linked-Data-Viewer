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
    }
  } LATERAL {` +
    [`{
      bind(?x AS ?s_) .
      LATERAL {
        {
          OPTIONAL {
            VALUES ?p {<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>}
            ?s_ ?p ?o_ .
            ${bnodeFn('?o_', '?o')}
          }
        } UNION {
          {
            SELECT ?s_ ?p {
              ?s_ ?p []
              filter(?p != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
            } GROUP BY ?s_ ?p LIMIT 1000
          } LATERAL {
            {
              SELECT ?s_ ?p ?o {
                ?s_ ?p ?o_ .
                ${bnodeFn('?o_', '?o')}
              } LIMIT 10
            } UNION {
              LATERAL {
                SELECT ?s_ ?p (count(?ox) AS ?oCnt) {
                  {
                    SELECT ?s_ ?p ?ox {
                      ?s_ ?p ?ox
                    } LIMIT 11
                  }
                }  GROUP BY ?s_ ?p
              } bind(if(?oCnt>10,strdt('...',<${ldvDef.moreResultsObjId}>),coalesce()) AS ?o)
            }
          }
        } UNION {
          OPTIONAL {
            GRAPH ?o {
              ?s_ a ?ox
            }
          } bind(if(bound(?o),<${ldvDef.sourceGraphPropId}>,coalesce()) AS ?p)
        }
      }
      ${bnodeFn('?s_', '?s')}
    }`, ... reverseEnabled === 'yes' ? [`{
      bind(?x AS ?s_) .
      LATERAL {
        {
          SELECT ?s_ ?rp {
            [] ?rp ?s_
          } GROUP BY ?s_ ?rp LIMIT 100
        } LATERAL {
          {
            SELECT ?s_ ?rp ?o {
              ?o_ ?rp ?s_ .
              ${bnodeFn('?o_', '?o')}
            } LIMIT 10
          } UNION {
            LATERAL {
              SELECT ?s_ ?rp (count(?ox) AS ?oCnt) {
                {
                  SELECT ?s_ ?rp ?ox {
                    ?ox ?rp ?s_
                  } LIMIT 11
                }
              } GROUP BY ?s_ ?rp
            } bind(if(?oCnt>10,strdt('...',<${ldvDef.moreResultsObjId}>),coalesce()) AS ?o)
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
    } bind(if(?oCnt>10,strdt('...',<${ldvDef.moreResultsObjId}>),coalesce()) AS ?o)
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
    } bind(if(?sCnt>10,strdt('...',<${ldvDef.moreResultsObjId}>),coalesce()) AS ?s)
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
  VALUES (?id ?s ?p ?o) { ( <${lookupId}> ${pattern} ) }
  GRAPH ?graph { ?s ?p ?o }
}`,
  }

  window.ldvQueries = ldvQueries
})()
