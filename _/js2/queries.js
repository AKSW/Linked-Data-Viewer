/* global ldvDef */
(() => {
  const ldvQueries = {
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
      bind(?x AS ?s_) .
      LATERAL {
        {
          OPTIONAL {
            bind(<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> as ?p)
            ?s_ ?p ?o_ .
            bind(if(isblank(?o_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?o_))),?o_) as ?o)
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
                bind(if(isblank(?o_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?o_))),?o_) as ?o)
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
      bind(if(isblank(?s_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?s_))),?s_) as ?s)
    } UNION {
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
              bind(if(isblank(?o_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?o_))),?o_) as ?o)
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
      bind(if(isblank(?s_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?s_))),?s_) as ?s)
    }
  }
  ${ infer ? '}' : '' }
}
`,
    loadMoreQuery: (s, p, limit, offset, infer) => `CONSTRUCT {
  <${ s.startsWith('_:') ? 'bnode://' + s.slice(2) : s }> <${p}> ?o .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?o {
      <${s}> <${p}> ?o_ . bind(if(isblank(?o_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?o_))),?o_) as ?o) .
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
  <${ o.startsWith('_:') ? 'bnode://' + o.slice(2) : o }> <${ldvDef.reversePropPrefix}:${p}> ?s .
} {
  ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
  { SELECT ?s {
      ?s_ <${p}> <${o}> . bind(if(isblank(?s_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?s_))),?s_) as ?s)
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

JSON {
    "uri": ?uri,
    "label": ?label,
    "lang": ?lang
  } WHERE {
    VALUES ?uri_ { ${uris} }
    bind(if(isblank(?uri_),iri(concat("bnode://",<http://jena.apache.org/ARQ/function#bnode>(?uri_))),?uri_) as ?uri)
    OPTIONAL { LATERAL {
      ${ infer ? 'SERVICE <sameAs+rdfs:> {' : '' }
      SELECT ?uri ?uri_ ?label ?lang {
        {
          ?uri_ rdfs:label|skos:prefLabel ?label .
          FILTER(lang(?label) = "${lang}") .
          BIND(lang(?label) AS ?lang) .
        } UNION {
          ?uri_ rdfs:label|skos:prefLabel ?label .
          FILTER(lang(?label) = "") .
          BIND(lang(?label) AS ?lang) .
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
    graphLookupQuery: (lookupId, pattern) => `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
CONSTRUCT {
  ?id <${ldvDef.sourceGraphPropId}> ?graph .
} WHERE {
  BIND(<${lookupId}> as ?id) .
  VALUES (?s ?p ?o) { ( ${pattern} ) }
  GRAPH ?graph { ?s ?p ?o }
}`,
  }

  window.ldvQueries = ldvQueries
})()
