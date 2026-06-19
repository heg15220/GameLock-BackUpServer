# Despliegue Docker

Infraestructura base para produccion futura de la plataforma. El frontend se construye en un contenedor Nginx independiente y los backends de juegos se levantan como servicios separados.

## Servicios

- `web`: build de Vite servido por Nginx, con proxy a APIs internas.
- `wikipedia-gacha-backend`: Node en el puerto interno `8791`, con Postgres y Redis.
- `penalty-shootout-backend`: Node en el puerto interno `8792`.
- `cosmic-vanguard-backend`: Node en el puerto interno `8793`.
- `db`: Postgres 16 para estado persistente.
- `redis`: cache compartida para backends que lo soporten.
- `certbot`: renovacion periodica de certificados.

## Puesta en marcha

```bash
cp deploy/.env.example deploy/.env
```

Edita `deploy/.env` y cambia `DOMAIN`, `SITE_URL`, `LETSENCRYPT_EMAIL`, `POSTGRES_PASSWORD` y `WIKIPEDIA_GACHA_TOKEN_SECRET`.

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

El contenedor `web` crea un certificado autofirmado temporal en una ruta separada si todavia no hay certificados de Let's Encrypt, para que Nginx pueda arrancar desde el primer `up`. La ruta `/etc/letsencrypt` queda reservada exclusivamente para Certbot.

## Renovacion y continuidad HTTPS

- Certbot comprueba la renovacion dos veces al dia, antes de que el certificado se acerque a su caducidad.
- Si una comprobacion falla por un problema temporal de red, DNS o proveedor, vuelve a intentarlo cada 15 minutos hasta que funcione.
- El contenedor `web` vigila el volumen de certificados. Cuando Certbot instala uno nuevo, valida la configuracion con `nginx -t` y hace una recarga gradual de Nginx sin cortar las conexiones activas.
- El certificado anterior sigue sirviendose mientras la renovacion o la validacion del nuevo certificado falla.

Let's Encrypt es gratuito y sus certificados se solicitan con margen antes de caducar. Un retraso de unos minutos u horas en una renovacion no deberia interrumpir HTTPS con esta configuracion.

Esta proteccion no puede mantener la web disponible si el proveedor suspende o apaga por completo el VPS, el dominio o la red por un pago rechazado. Para ese caso se debe activar renovacion automatica, un metodo de pago alternativo y alertas de facturacion en el proveedor.

## Emitir el certificado real

Con el DNS apuntando al servidor y los puertos `80` y `443` abiertos:

```bash
DOMAIN="$(sed -n 's/^DOMAIN=//p' deploy/.env)"
LETSENCRYPT_EMAIL="$(sed -n 's/^LETSENCRYPT_EMAIL=//p' deploy/.env)"

docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  --cert-name "$DOMAIN" \
  -d "$DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email

docker compose --env-file deploy/.env -f deploy/docker-compose.yml restart web
```

## Notas

- No se incluyen tests, resultados de pruebas, `node_modules`, `tmp`, `output` ni bases SQLite de benchmark en el contexto Docker.
- `wikipedia-gacha-backend` inicializa su esquema Postgres al arrancar.
- Los backends no publican puertos al host; solo `web` expone `80` y `443`.
- Si `POSTGRES_PASSWORD` contiene caracteres reservados de URL como `@`, `/`, `:` o `#`, usa una version URL-encoded o limita el secreto a caracteres alfanumericos largos.
