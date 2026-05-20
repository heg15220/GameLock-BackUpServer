#!/bin/sh
set -eu

: "${DOMAIN:=localhost}"

cert_dir="/etc/letsencrypt/live/${DOMAIN}"
cert_file="${cert_dir}/fullchain.pem"
key_file="${cert_dir}/privkey.pem"

if [ ! -s "${cert_file}" ] || [ ! -s "${key_file}" ]; then
  mkdir -p "${cert_dir}"
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 1 \
    -keyout "${key_file}" \
    -out "${cert_file}" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
fi
