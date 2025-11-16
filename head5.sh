#!/usr/bin/env zsh
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed." >&2
  exit 2
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <url>" >&2
  exit 1
fi

url="$1"

# If the user passed a bare host like example.com, optionally add http://
if [[ ! "$url" =~ ^https?:// ]]; then
  url="http://$url"
fi

# Fetch the response body (GET) and print the first 5 lines of the body
# Use -L to follow redirects and -sS to be silent but show errors
curl -L -sS --max-time 10 "$url" | head -n 15
