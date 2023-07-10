#!/bin/sh
set -eu

[ -d ./_ ]
./clean.sh
chmod -R g+rwX . || : ; chmod -R o+rX . || :
docker build . -t aksw/ldv
