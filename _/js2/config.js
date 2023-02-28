(() => {
  const ldvConfig = {
    endpointUrl: 'https://skynet.coypu.org/coypu-internal',
    endpointOptions: {
      mode: 'cors',
      credentials: 'include',
      method: 'POST',
    },
    datasetBase: window.location.origin,
    exploreUrl: 'https://explore.skynet.coypu.org/coypu-internal',
    labelLang: 'en',
    labelLangChoice: ['en', 'de', 'fr'],
    infer: false,
    askQuery: iri => `ASK {
 {
    bind(iri(replace(replace("${iri}", '\\\\(', '%28'), '\\\\)', '%29')) AS ?s) .
    ?s ?p ?o
 } UNION {
    bind(<${iri}> as ?s) .
    ?s ?p ?o
 } UNION {
    bind(iri(replace(replace("${iri}", '\\\\(', '%28'), '\\\\)', '%29')) AS ?o) .
    ?s ?p ?o
 } UNION {
    bind(<${iri}> as ?o) .
    ?s ?p ?o
 }
}
`,
    describeQuery: (iri, infer) => `CONSTRUCT {
  ?s ?p ?o .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  {
    SELECT ?x {
      {
        bind(iri(replace(replace("${iri}", '\\\\(', '%28'), '\\\\)', '%29')) AS ?x)
      } UNION {
        bind(<${iri}> AS ?x)
      }
    }
  } LATERAL {
    {
      bind(?x AS ?s) .
      LATERAL {
        {
          OPTIONAL {
            bind(<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> as ?p)
            ?s ?p ?o
          }
        } UNION {
          {
            SELECT ?s ?p {
              ?s ?p []
              filter(?p != <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>)
            } GROUP BY ?s ?p LIMIT 1000
          } LATERAL {
            {
              SELECT ?s ?p ?o {
                ?s ?p ?o
              } LIMIT 10
            } UNION {
              LATERAL {
                SELECT ?s ?p (count(?ox) AS ?oCnt) {
                  {
                    SELECT ?s ?p ?ox {
                      ?s ?p ?ox
                    } LIMIT 11
                  }
                }  GROUP BY ?s ?p
              } bind(if(?oCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?o)
            }
          }
        } UNION {
          OPTIONAL {
            GRAPH ?o {
              ?s a ?ox
            }
          } bind(if(bound(?o),<urn:x-meta:originatingGraph>,coalesce()) AS ?p)
        }
      }
    } UNION {
      bind(?x AS ?s) .
      LATERAL {
        {
          SELECT ?s ?rp {
            [] ?rp ?s
          } GROUP BY ?s ?rp LIMIT 100
        } LATERAL {
          {
            SELECT ?s ?rp ?o {
              ?o ?rp ?s
            } LIMIT 10
          } UNION {
            LATERAL {
              SELECT ?s ?rp (count(?ox) AS ?oCnt) {
                {
                  SELECT ?s ?rp ?ox {
                    ?ox ?rp ?s
                  } LIMIT 11
                }
              } GROUP BY ?s ?rp
            } bind(if(?oCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?o)
          }
        }
      }
   bind(uri(concat('urn:x-arq:reverse:',str(?rp))) AS ?p) }
  }
  ${ infer ? '}' : '' }
}
`,
    loadMoreQuery: (s, p, limit, offset, infer) => `CONSTRUCT {
  <${s}> <${p}> ?o .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?o {
      <${s}> <${p}> ?o .
    } LIMIT ${limit} OFFSET ${offset}
  } UNION {
    { SELECT (count(?ox) AS ?oCnt) {
        {
          SELECT ?ox {
            <${s}> <${p}> ?ox
          } LIMIT ${limit + 1} OFFSET ${offset}
        }
      }
    } bind(if(?oCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?o)
  }
  ${ infer ? '}' : '' }
}
`,
    loadMoreReverseQuery: (o, p, limit, offset, infer) => `CONSTRUCT {
  <${o}> <urn:x-arq:reverse:${p}> ?s .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?s {
      ?s <${p}> <${o}> .
    } LIMIT ${limit} OFFSET ${offset}
  } UNION {
    { SELECT (count(?sx) AS ?sCnt) {
        {
          SELECT ?sx {
            ?sx <${p}> <${o}>
          } LIMIT ${limit + 1} OFFSET ${offset}
        }
      }
    } bind(if(?sCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?s)
  }
  ${ infer ? '}' : '' }
}
`,
    fetchLabelsQuery: (uris, lang, infer) => `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

JSON {
    "uri": ?uri,
    "label": ?label,
    "lang": ?lang
  } WHERE {
    VALUES ?uri { ${uris} }
    LATERAL {
      ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
      SELECT ?uri ?label ?lang {
        {
          ?uri rdfs:label|skos:prefLabel ?label .
          FILTER(lang(?label) = "${lang}") .
          BIND(lang(?label) AS ?lang) .
        } UNION {
          ?uri rdfs:label|skos:prefLabel ?label .
          FILTER(lang(?label) = "") .
          BIND(lang(?label) AS ?lang) .
        }
      } LIMIT 1
      ${ infer ? '}' : '' }
    }
  }
`,
  }

  window.ldvConfig = ldvConfig
})()
