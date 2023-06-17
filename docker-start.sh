#!/bin/sh
set -e

d=.
if [ ! -d ./_ ]; then
    d=/usr/local/apache2/htdocs
fi

js_conf=$d/_/js2/config.js
httpd_conf=/usr/local/apache2/conf/httpd.conf

if [ -z ${IRI_SCHEME+x} ]; then
    export IRI_SCHEME='%{REQUEST_SCHEME}'
fi

if [ -z ${IRI_PORT+x} ] || [ "$IRI_PORT" = yes ]; then
    export _IRI_PORT=':%{SERVER_PORT}'
elif [ "$IRI_PORT" = "" ] || [ "$IRI_PORT" = no ] || [ "$IRI_PORT" = 443 ] || [ "$IRI_PORT" = 80 ]; then
    export _IRI_PORT=''
else
    export _IRI_PORT=":$IRI_PORT"
fi

for tpl in "$js_conf" "$httpd_conf"; do
    perl -p -e 's|@(\w+)@|$ENV{$1}//$&|ge' "$tpl".tpl > "$tpl"
done

perl -i -p -e 's|"/_/js2/config\.js\?\K[^"]+|'"$(openssl dgst -binary "$js_conf" | basenc --base64url)"'|' $d/_/resource.html

echo "
ENDPOINT_URL = ${ENDPOINT_URL}
EXPLORE_URL  = ${EXPLORE_URL}
IRI_SCHEME   = ${IRI_SCHEME}
IRI_PORT     = ${_IRI_PORT#:}
"

exec httpd-foreground
