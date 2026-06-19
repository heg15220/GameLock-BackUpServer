#!/bin/sh
set -eu

: "${DOMAIN:=localhost}"

letsencrypt_dir="/etc/letsencrypt/live/${DOMAIN}"
letsencrypt_cert="${letsencrypt_dir}/fullchain.pem"
letsencrypt_key="${letsencrypt_dir}/privkey.pem"
runtime_dir="/etc/nginx/runtime-certs"
runtime_cert="${runtime_dir}/fullchain.pem"
runtime_key="${runtime_dir}/privkey.pem"

mkdir -p "${runtime_dir}"

if [ -s "${letsencrypt_cert}" ] && [ -s "${letsencrypt_key}" ]; then
  ln -sfn "${letsencrypt_cert}" "${runtime_cert}"
  ln -sfn "${letsencrypt_key}" "${runtime_key}"
else
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 1 \
    -keyout "${runtime_key}" \
    -out "${runtime_cert}" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
fi
