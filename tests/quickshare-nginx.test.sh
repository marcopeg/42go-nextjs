#!/usr/bin/env sh
set -eu

test_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
container_name="quickshare-nginx-test-$$"
port="18088"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run -d --rm --name "$container_name" -p "$port:8080" \
  -v "$test_root/infra/quickshare-nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$test_root/tests/fixtures/quickshare-static:/srv/quickshare-public:ro" \
  nginx:1.27-alpine >/dev/null

attempt=0
until curl --silent --fail -H 'Host: s.42go.dev' "http://127.0.0.1:$port/alpha42" >/tmp/quickshare-nginx-fixture.html; do
  attempt=$((attempt + 1))
  test "$attempt" -lt 20
  sleep 1
done

grep -q 'QuickShare fixture' /tmp/quickshare-nginx-fixture.html
curl --silent --show-error --fail -D /tmp/quickshare-nginx-text-headers.txt \
  -o /tmp/quickshare-nginx-fixture.txt \
  -H 'Host: s.42go.dev' "http://127.0.0.1:$port/plain42"
grep -q 'QuickShare plain-text fixture' /tmp/quickshare-nginx-fixture.txt
grep -qi 'Content-Type: text/plain' /tmp/quickshare-nginx-text-headers.txt
curl --silent --show-error --fail -D /tmp/quickshare-nginx-headers.txt -o /dev/null \
  -H 'Host: s.42go.dev' "http://127.0.0.1:$port/_quickshare/releases/quickshare/resource-42/release-01/assets/site.a1b2c3d4.css"
grep -qi 'Cache-Control: public, max-age=31536000, immutable' /tmp/quickshare-nginx-headers.txt
grep -qi 'Service-Worker-Allowed: /_quickshare/releases/quickshare/resource-42/release-01/' /tmp/quickshare-nginx-headers.txt
test "$(curl --silent -o /dev/null -w '%{http_code}' -H 'Host: s.42go.dev' "http://127.0.0.1:$port/nope")" = '404'
test "$(curl --silent -o /dev/null -w '%{http_code}' -H 'Host: s.42go.dev' "http://127.0.0.1:$port/.quickshare/entries/secret")" = '404'
