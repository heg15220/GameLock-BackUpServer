#!/bin/sh
set -eu

: "${DOMAIN:=localhost}"

cert_file="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
key_file="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
runtime_dir="/etc/nginx/runtime-certs"
runtime_cert="${runtime_dir}/fullchain.pem"
runtime_key="${runtime_dir}/privkey.pem"
fingerprint_file="/tmp/gamelock-certificate-fingerprint"
check_interval="${CERTIFICATE_RELOAD_INTERVAL_SECONDS:-300}"

certificate_fingerprint() {
  openssl x509 -in "${cert_file}" -noout -fingerprint -sha256 2>/dev/null || true
}

activate_letsencrypt_certificate() {
  mkdir -p "${runtime_dir}"
  ln -sfn "${cert_file}" "${runtime_cert}"
  ln -sfn "${key_file}" "${runtime_key}"
}

reload_when_certificate_changes() {
  while :; do
    if [ -s "${cert_file}" ] && [ -s "${key_file}" ]; then
      current_fingerprint="$(certificate_fingerprint)"
      previous_fingerprint="$(cat "${fingerprint_file}" 2>/dev/null || true)"

      if [ -n "${current_fingerprint}" ] && [ "${current_fingerprint}" != "${previous_fingerprint}" ]; then
        activate_letsencrypt_certificate
        if nginx -t >/dev/null 2>&1; then
          if nginx -s reload; then
            printf '%s\n' "${current_fingerprint}" >"${fingerprint_file}"
            echo "Nginx reloaded after installing a new or renewed certificate for ${DOMAIN}."
          else
            echo "Nginx reload failed. The watcher will retry without replacing the active workers." >&2
          fi
        else
          echo "Certificate changed, but the Nginx configuration test failed. Keeping the current workers active." >&2
        fi
      fi
    fi

    sleep "${check_interval}"
  done
}

if [ -s "${cert_file}" ] && [ -s "${key_file}" ]; then
  activate_letsencrypt_certificate
fi
certificate_fingerprint >"${fingerprint_file}" || true
reload_when_certificate_changes &
