#!/bin/bash
# Update proto files from https://github.com/spotware
# Usage: ./scripts/pull-proto.sh

set -euo pipefail

wget "https://github.com/spotware/openapi-proto-messages/archive/master.zip" -O proto.zip
#unzip -o proto.zip
