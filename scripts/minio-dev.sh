#!/usr/bin/env bash
# Local object storage for dashboard uploads (page photos, strip videos).
#
# MinIO's own Docker image is no longer pullable without an account, so this
# runs the Homebrew build instead: `brew install minio minio-mc`.
#
# TLS is not optional here. The API only accepts an https URL for a photo
# (packages/core/src/image-src.ts), so a plain-http store would upload fine
# and then be refused on save. The certificate in infra/minio/certs is
# self-signed and local only — in production S3_ENDPOINT points at a real
# MinIO or S3 behind its own certificate and none of this applies.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${S3_BUCKET:=mon-uploads}"
: "${S3_ACCESS_KEY_ID:=monminio}"
: "${S3_SECRET_ACCESS_KEY:=monminio-secret}"
: "${MINIO_PORT:=9100}"
: "${MINIO_CONSOLE_PORT:=9101}"

CERTS="$PWD/infra/minio/certs"
DATA="$PWD/infra/minio/data"
[ -f "$CERTS/public.crt" ] || { echo "missing $CERTS/public.crt — see README"; exit 1; }
mkdir -p "$DATA"

case "${1:-start}" in
  start)
    if curl -sk "https://localhost:$MINIO_PORT/minio/health/live" >/dev/null 2>&1; then
      echo "minio already running on $MINIO_PORT"
    else
      MINIO_ROOT_USER="$S3_ACCESS_KEY_ID" MINIO_ROOT_PASSWORD="$S3_SECRET_ACCESS_KEY" \
        nohup minio server "$DATA" --certs-dir "$CERTS" \
          --address ":$MINIO_PORT" --console-address ":$MINIO_CONSOLE_PORT" \
          >/tmp/mon-minio.log 2>&1 &
      for _ in $(seq 1 40); do
        curl -sk "https://localhost:$MINIO_PORT/minio/health/live" >/dev/null 2>&1 && break
        sleep 0.5
      done
    fi
    mc alias set --insecure mon-local "https://localhost:$MINIO_PORT" "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" >/dev/null
    mc mb --insecure --ignore-existing "mon-local/$S3_BUCKET" >/dev/null
    # Objects are read straight from the bucket by <img src>, so they must be
    # public; writing them stays behind the API's credentials.
    mc anonymous --insecure set download "mon-local/$S3_BUCKET" >/dev/null
    echo "minio up — S3 https://localhost:$MINIO_PORT  console https://localhost:$MINIO_CONSOLE_PORT  bucket $S3_BUCKET (public read)"
    ;;
  stop)   pkill -f "minio server $DATA" && echo "minio stopped" || echo "minio was not running" ;;
  status) curl -sk "https://localhost:$MINIO_PORT/minio/health/live" >/dev/null 2>&1 && echo "running" || echo "stopped" ;;
  *) echo "usage: $0 {start|stop|status}"; exit 1 ;;
esac
