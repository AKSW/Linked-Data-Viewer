#!/bin/sh
set -eu

perl -i -p -e 's|"(/_/(?:css\|js2)/[\w-]+\.\w+)\?\K[^"]+|g0|g' ./_/*.html
