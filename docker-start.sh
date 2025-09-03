#!/bin/sh
set -e

c=./my-
d=.
if [ ! -d ./_ ]; then
    c=/usr/local/apache2/conf/
    d=
fi

httpd_conf=${c}httpd.conf
js_conf=$d/_/js2/config.js
res_html=$d/_/resource.html

if [ -z "${IRI_SCHEME+x}" ]; then
    export IRI_SCHEME='%{REQUEST_SCHEME}'
fi

if [ -z "${IRI_PORT+x}" ] || [ "$IRI_PORT" = yes ]; then
    export _IRI_PORT=':%{SERVER_PORT}'
elif [ "$IRI_PORT" = "" ] || [ "$IRI_PORT" = no ] || [ "$IRI_PORT" = 443 ] || [ "$IRI_PORT" = 80 ]; then
    export _IRI_PORT=''
else
    export _IRI_PORT=":$IRI_PORT"
fi

error=0
if [ "${GRAPH_LOOKUP+set}" = set ] && [ "${GRAPH_LOOKUP}" != yes ] && [ "${GRAPH_LOOKUP}" != no ]; then
    echo "GRAPH_LOOKUP is set to \`${GRAPH_LOOKUP}' but must be yes or no"
    ((error+=1))
fi
export GRAPH_LOOKUP=${GRAPH_LOOKUP-no}

if [ "${USE_CREDS+set}" = set ] && [ "${USE_CREDS}" != yes ] && [ "${USE_CREDS}" != no ]; then
    echo "USE_CREDS is set to \`${USE_CREDS}' but must be yes or no"
    ((error+=1))
fi

if [ "${SHOW_INVERSE+set}" = set ] && [ "${SHOW_INVERSE}" != yes ] && [ "${SHOW_INVERSE}" != no ]; then
    echo "SHOW_INVERSE is set to \`${SHOW_INVERSE}' but must be yes or no"
    ((error+=1))
fi
export SHOW_INVERSE=${SHOW_INVERSE-yes}

if [ "${STARTPAGE+set}" = set ] && [ "${STARTPAGE}" != yes ] && [ "${STARTPAGE}" != no ]; then
    echo "STARTPAGE is set to \`${STARTPAGE}' but must be yes or no"
    ((error+=1))
fi
export STARTPAGE=${STARTPAGE-no}

if [ "${USE_CREDS-yes}" = yes ]; then
    export FETCH_CREDENTIALS=include
else
    export FETCH_CREDENTIALS=same-origin
fi

if [ "$error" -gt 0 ]; then
    exit 1
fi

for src in "$js_conf" "$httpd_conf"; do
    perl -p -e 's|@(\w+)@|$ENV{$1}//$&|ge' "$src".tpl > "$src"
done

perl -i -p -e 's|"(/_/(?:css\|js2)/[\w-]+\.\w+)\?\K[^"]+|`openssl dgst -binary "'"$d/"'$1" \| basenc --base64url --wrap=0`|ge' "$d"/_/*.html

echo "
ENDPOINT_URL = ${ENDPOINT_URL}
USE_CREDS    = ${USE_CREDS-yes}
EXPLORE_URL  = ${EXPLORE_URL}
GRAPH_LOOKUP = ${GRAPH_LOOKUP}
SHOW_INVERSE = ${SHOW_INVERSE}
STARTPAGE    = ${STARTPAGE}
IRI_SCHEME   = ${IRI_SCHEME}
IRI_PORT     = ${_IRI_PORT#:}
"

if [ -f /.dockerenv ]; then
    exec httpd-foreground
else
    docker compose up "$@"
fi
