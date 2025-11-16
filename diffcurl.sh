#!/usr/bin/env zsh
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed." >&2
  exit 2
fi

if [ $# -ne 2 ]; then
  echo "Usage: $0 <url1> <url2>" >&2
  exit 1
fi

url1="$1"
url2="$2"

# Default Accept header; override by setting ACCEPT_HEADER env var before running
: ${ACCEPT_HEADER:="accept: application/xml"}

if [[ ! "$url1" =~ ^https?:// ]]; then
  url1="http://$url1"
fi
if [[ ! "$url2" =~ ^https?:// ]]; then
  url2="http://$url2"
fi

TMPDIR=$(mktemp -d 2>/dev/null || mktemp -d -t diffcurl)
cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

fetch() {
  local url="$1" prefix="$2" headers body code
  headers="$TMPDIR/${prefix}.headers"
  body="$TMPDIR/${prefix}.body"
  # Fetch and write headers (last response) and body; capture HTTP code
  code=$(curl -L -sS --max-time 30 -D "$headers" -o "$body" -w '%{http_code}' -H "$ACCEPT_HEADER" "$url")
  echo "$code" > "$TMPDIR/${prefix}.code"
  # Normalize headers: ensure first line is status line
  # (curl -D writes final response headers including the HTTP/... status line)
  # Also trim trailing blank lines
  awk 'BEGIN{p=1} {print}' "$headers" > "$headers.tmp" && mv "$headers.tmp" "$headers"
  echo "$headers|$body|$code"
}

echo "Comparing:\n  1) $url1\n  2) $url2\n"

res1=$(fetch "$url1" a)
res2=$(fetch "$url2" b)

headers1="$TMPDIR/a.headers"
body1="$TMPDIR/a.body"
code1=$(cat "$TMPDIR/a.code")

headers2="$TMPDIR/b.headers"
body2="$TMPDIR/b.body"
code2=$(cat "$TMPDIR/b.code")

echo "=== Summary ==="
if [ "$code1" = "$code2" ]; then
  echo "HTTP status: both $code1"
else
  echo "HTTP status: url1 -> $code1    url2 -> $code2"
fi

ct1=$(awk 'BEGIN{IGNORECASE=1} /^Content-Type:/ {print substr($0, index($0,$2))}' "$headers1" | tr -d '\r')
ct2=$(awk 'BEGIN{IGNORECASE=1} /^Content-Type:/ {print substr($0, index($0,$2))}' "$headers2" | tr -d '\r')
size1=$(wc -c < "$body1" | tr -d '[:space:]')
size2=$(wc -c < "$body2" | tr -d '[:space:]')
md51=$(shasum -a 256 "$body1" | awk '{print $1}')
md52=$(shasum -a 256 "$body2" | awk '{print $1}')

echo "Content-Type: url1 -> ${ct1:-(none)}    url2 -> ${ct2:-(none)}"
echo "Body size: url1 -> ${size1} bytes    url2 -> ${size2} bytes"
echo "Body SHA256: url1 -> ${md51}    url2 -> ${md52}"

echo "\n=== Header diff ==="
if diff -u "$headers1" "$headers2" >/dev/null; then
  echo "Headers identical"
else
  diff -u "$headers1" "$headers2" || true
fi

is_text() {
  local ct="$1"
  if [ -z "$ct" ]; then
    return 1
  fi
  ct=$(echo "$ct" | tr '[:upper:]' '[:lower:]')
  case "$ct" in
    *text*|*json*|*xml*|*html*|*javascript*|*x-www-form-urlencoded*) return 0;;
    *) return 1;;
  esac
}

echo "\n=== Body diff ==="
if is_text "$ct1" || is_text "$ct2"; then
  if diff -u --label "url1 body" --label "url2 body" "$body1" "$body2" >/dev/null; then
    echo "Bodies identical (text-aware)"
  else
    diff -u --label "url1 body" --label "url2 body" "$body1" "$body2" || true
  fi
else
  if [ "$md51" = "$md52" ]; then
    echo "Bodies identical (binary)"
  else
    echo "Binary bodies differ. Showing size and SHA256 above."
    echo "First 200 bytes of url1 (hex):"
    hexdump -C -n 200 "$body1" || true
    echo "\nFirst 200 bytes of url2 (hex):"
    hexdump -C -n 200 "$body2" || true
  fi
fi

echo "\n=== End of comparison ==="
