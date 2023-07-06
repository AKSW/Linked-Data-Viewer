<!DOCTYPE html>
<html>
<head>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <script id="data" type="application/ld+json">{}</script>

  <link href="//cdnjs.cloudflare.com/ajax/libs/bootswatch/3.3.7/paper/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous" />
  <link href="/_/css/style.css?g1" rel="stylesheet" />
  <link href="/_/css/fonts.css?g2" rel="stylesheet" />

  <script src="https://cdn.jsdelivr.net/g/es6-promise@1.0.0"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsonld/0.4.12/jsonld.js"></script>
  <script src="https://unpkg.com/wellknown@0.5.0/wellknown.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" integrity="sha256-kLaT2GOSpHechhsozzB+flnD+zUyjE2LlfWPgU04xyI=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js" integrity="sha256-WBkoXOwTeyKclOHuWtc+i2uENFpDZ9YPdf5Hf+D7ewM=" crossorigin=""></script>
  <script src="/_/js2/config.js?g4"></script>
  <script src="/_/js2/queries.js?g1"></script>
  <script src="/_/js2/labels.js?g3"></script>
  <script src="/_/js2/bnodes.js?g4"></script>
  <script src="/_/js2/render-ld.js?g7"></script>
  <script src="/_/js2/map2.js?g1"></script>
  <script src="/_/js2/load.js?g4"></script>

</head>
<body>

<nav class="navbar navbar-default">
  <div class="container">
    <div class="navbar-header"><a class="navbar-brand"><img style="display: inline-block; height: 17px; vertical-align: baseline" src='/_/img/logo.svg'> Linked Data Viewer</a>
    </div>
  </div>
</nav>

<div class="container">

  <div class="row">
    <div class="col-xs-12">
      <div id="title"></div>
      <div id="subtitle"></div>
      <div id="graph">Loading...</div>
<noscript>
  <p>
    The Linked Data Viewer only works with Javascript &#128577;
  </p>
</noscript>
    </div>
  </div>

<footer>
  <div class="row">
    <div class="col-lg-12">
      <ul class="list-unstyled">
      </ul>
    </div>
  </div>
  <div class="row">
    <div class="col-lg-12">
      <ul class="pull-right text-right list-unstyled">
        <li><button class="link" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">Back to top</button></li>
      </ul>
      <p>
        <a href="//aksw.org"><img style="height: 60px;" src='/_/img/logo.svg'></a>
      </p>

      <p style="margin-top: 100px; text-align: center">
      </p>
    </div>
  </div>
</footer>

<header class="float">
  <div class="row">
    <div class="col-lg-12" style="font-size: smaller">
      <ul class="text-right list-unstyled">
        <li id="loadlabels"></li>
        <li id="inferswitch"></li>
        <li><span id="localswitch"></span><span id="explorelink"></span><span id="configlink"></span></li>
      </ul>
    </div>
  </div>
</header>

</div>

</body>
</html>