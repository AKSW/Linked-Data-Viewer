#!/bin/sh
set -eu

./clean.sh
docker build . -t aksw/ldv
