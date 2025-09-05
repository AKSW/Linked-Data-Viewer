(() => {
  const ldvConfig = {
    endpointUrl: '@ENDPOINT_URL@',
    endpointOptions: {
      mode: 'cors',
      credentials: '@FETCH_CREDENTIALS@',
      method: 'POST',
    },
    datasetBase: window.location.origin,
    exploreUrl: '@EXPLORE_URL@',
    graphLookup: '@GRAPH_LOOKUP@',
    reverseEnabled: '@SHOW_INVERSE@',
    labelLang: 'en',
    labelLangChoice: ['en', 'de', 'nl', 'fr'],
    infer: false,
    fileOnly: '@STARTPAGE@',
    describeQueryEmulation: 'no',
  }

  window.ldvConfig = ldvConfig
})()
