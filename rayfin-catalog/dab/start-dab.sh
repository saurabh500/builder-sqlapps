#!/bin/sh
set -eu
export ASPNETCORE_URLS="http://0.0.0.0:${PORT:-8080}"
# Use Builder's dotnet on PATH rather than the shim's default runtime lookup.
entry=$(find .store -name Microsoft.DataApiBuilder.dll)
if [ -z "$entry" ] || [ "$(printf '%s\n' "$entry" | wc -l)" -ne 1 ]; then
  echo "Expected exactly one packaged DAB entry point." >&2
  exit 1
fi
exec dotnet "$entry" start --config dab-config.json --no-https-redirect
