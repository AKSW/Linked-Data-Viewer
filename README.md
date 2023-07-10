# Linked Data Viewer

Simple RDF/Linked Data Viewer for remote Jena Fuseki/SPARQL endpoints

Usage:

```sh
docker run --rm \
  -p 8001:80 \
  -e ENDPOINT_URL=http://localhost:3030/geods \
  --init \
  aksw/ldv
```

If you have an existing deployment of Ontodia Graph Explorer that you want to link to:

```sh
... \
  -e EXPLORE_URL=http://localhost:8002/ \  
...
```

Or in docker compose:

```yml
services:
  ldv:
    image: aksw/ldv
	init: true
    environment:
     - ENDPOINT_URL=http://localhost:3030/geods
     - EXPLORE_URL=http://localhost:8002/
```

![Screenshot](https://github.com/AKSW/Linked-Data-Viewer/assets/10867832/b00c17e8-1a2e-4ca9-82df-3be28727da17)
