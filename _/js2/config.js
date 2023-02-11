(() => {
  const ldvConfig = {
    endpointUrl: 'https://skynet.coypu.org/coypu-internal',
    endpointOptions: {
      mode: 'cors',
      credentials: 'include',
      method: 'POST',
    },
    datasetBase: window.location.origin,
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
    describeQuery: iri => `CONSTRUCT {
  ?s ?p ?o .
} {
  {
    SELECT ?x {
      {
        bind(iri(replace(replace("${iri}", '\\\\(', '%28'), '\\\\)', '%29')) AS ?x) 
      } UNION {
        bind(<${iri}> AS ?x) 
      } 
    } 
  } SERVICE <loop:> {
    {
      bind(?x AS ?s) .
      SERVICE <loop:> {
        {
          {
            SELECT ?p {
              ?s ?p [] 
            } GROUP BY ?p LIMIT 100 
          } SERVICE <loop:> {
            {
              SELECT ?o {
                ?s ?p ?o 
              } LIMIT 10 
            } UNION {
              SERVICE <loop:> {
                SELECT (count(?ox) AS ?oCnt) {
                  {
                    SELECT ?ox {
                      ?s ?p ?ox 
                    } LIMIT 11 
                  } 
                } 
              } bind(if(?oCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?o) 
            } 
          } 
        } UNION {
          optional {
            graph ?o {
              ?s a ?ox 
            } 
          } bind(if(bound(?o),<urn:x-meta:originatingGraph>,coalesce()) AS ?p) 
        } 
      }
    } UNION {
      bind(?x AS ?s) .
      SERVICE <loop:> {
        {
          SELECT ?rp {
            [] ?rp ?s 
          } GROUP BY ?rp LIMIT 100 
        } SERVICE <loop:> {
          {
            SELECT ?o {
              ?o ?rp ?s 
            } LIMIT 10 
          } UNION {
            SERVICE <loop:> {
              SELECT (count(?ox) AS ?oCnt) {
                {
                  SELECT ?ox {
                    ?ox ?rp ?s
                  } LIMIT 11 
                } 
              } 
            } bind(if(?oCnt>10,strdt('...',<urn:x-arq:more-results>),coalesce()) AS ?o) 
          } 
        } 
      }
   bind(uri(concat('urn:x-arq:reverse:',str(?rp))) AS ?p) }
  }
}
`,
    loadMoreQuery: (s, p, limit, offset) => `CONSTRUCT {
  <${s}> <${p}> ?o .
} {
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
}
`,
    loadMoreReverseQuery: (o, p, limit, offset) => `CONSTRUCT {
  <${o}> <urn:x-arq:reverse:${p}> ?s .
} {
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
}
`,
  }

  window.ldvConfig = ldvConfig
})()
