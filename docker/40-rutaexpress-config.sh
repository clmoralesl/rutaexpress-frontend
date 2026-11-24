#!/bin/sh
# Genera /config.js a partir de RUTAEXPRESS_API_URL (issue #125).
# Vacio o sin definir: mismo origen (stack local). Valor invalido: el contenedor no arranca.
set -eu
DESTINO=/usr/share/nginx/html/config.js
valor="${RUTAEXPRESS_API_URL:-}"
while [ "${valor%/}" != "$valor" ]; do valor="${valor%/}"; done
case "$valor" in
  *[!A-Za-z0-9.:/-]*)
    echo "rutaexpress-config: RUTAEXPRESS_API_URL contiene caracteres no permitidos" >&2
    exit 1 ;;
esac
if [ -n "$valor" ] && ! printf '%s' "$valor" | grep -Eqx 'https://[A-Za-z0-9.-]+(:[0-9]{1,5})?|http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?'; then
  echo "rutaexpress-config: RUTAEXPRESS_API_URL invalida; se esperaba https://<host> sin ruta" >&2
  exit 1
fi
printf 'window.__RUTAEXPRESS_CONFIG__ = Object.freeze({ apiUrl: "%s" });\n' "$valor" > "$DESTINO"
echo "rutaexpress-config: apiUrl=${valor:-<mismo origen>}"
