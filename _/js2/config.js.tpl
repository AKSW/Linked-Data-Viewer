(() => {
  const ldvConfig = {
    endpointUrl: '@ENDPOINT_URL@',
    endpointOptions: {
      mode: 'cors',
      credentials: 'include',
      method: 'POST',
    },
    datasetBase: window.location.origin,
    exploreUrl: '@EXPLORE_URL@',
    graphLookup: '@GRAPH_LOOKUP@',
    labelLang: 'en',
    labelLangChoice: ['en', 'de', 'nl', 'fr'],
    infer: false,
  }

  window.ldvConfig = ldvConfig
})()
