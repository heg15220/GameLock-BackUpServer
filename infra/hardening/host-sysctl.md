# Endurecimiento del host (defensa L3/L4 — SYN flood y agotamiento de conexiones)

Estos ajustes viven en el **kernel del host**, no dentro de un contenedor Docker.
Docker no puede aplicarlos por contenedor porque no están namespaced (afectan a
toda la máquina). Cópialos en la VM que ejecuta `docker compose`.

> Recordatorio: esto mitiga floods de **capa de red/transporte** que llegan a la
> VM. NO protege contra un DDoS **volumétrico** que sature el ancho de banda de
> tu enlace antes de llegar al servidor — eso solo lo para una capa upstream
> (Cloudflare / scrubbing del proveedor). Ver `deploy/nginx/` para la capa L7.

## Aplicar de forma persistente

Crea `/etc/sysctl.d/99-plataforma-juegos-hardening.conf` en el host:

```conf
# ── Defensa SYN flood ────────────────────────────────────────────────────────
# Cookies SYN: permiten completar el handshake sin reservar estado, de modo que
# un flood de SYN no agota la cola de conexiones a medio abrir.
net.ipv4.tcp_syncookies = 1
# Cola de conexiones SYN a medio abrir (mas grande = mas margen ante picos).
net.ipv4.tcp_max_syn_backlog = 4096
# Reintentos de SYN-ACK: menos reintentos = las conexiones falsas se descartan antes.
net.ipv4.tcp_synack_retries = 2

# ── Encolado de conexiones aceptadas ─────────────────────────────────────────
# Debe ser >= net.core.somaxconn del contenedor web (1024 en docker-compose).
net.core.somaxconn = 1024
# Backlog de la NIC: paquetes en cola antes de que el kernel los procese.
net.core.netdev_max_backlog = 5000

# ── Reciclado de sockets bajo muchas conexiones cortas ───────────────────────
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1

# ── Rango de puertos efimeros (mas puertos para conexiones salientes/upstream) ─
net.ipv4.ip_local_port_range = 1024 65535
```

Aplícalo sin reiniciar:

```bash
sudo sysctl --system
# Verificar un par de valores:
sysctl net.ipv4.tcp_syncookies net.core.somaxconn
```

## Firewall — cerrar puertos internos

Solo deben estar expuestos a Internet **80** y **443** (los publica el contenedor
`web`). Los puertos de los backends (8791/8792/8793), Postgres (5432) y Redis
(6379) viven en la red interna de Docker `app-net` y **no** deben abrirse en el
firewall del host. Con UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH — ajusta o restringe por IP si puedes
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> Nota Docker + UFW: Docker manipula iptables directamente y puede saltarse UFW
> para puertos publicados. Como en este stack los backends usan `expose` (no
> `ports`), no quedan publicados en el host, así que no hay exposición accidental.
> Mantén los backends con `expose` y nunca los pases a `ports:`.

## Opcional — banear IPs abusivas automáticamente (fail2ban)

nginx responde `429` a quien supera los límites (ver `deploy/nginx/`). Puedes
banear a nivel de firewall a las IPs que acumulen muchos 429/405:

1. Instala fail2ban en el host: `sudo apt install fail2ban`
2. Filtro `/etc/fail2ban/filter.d/nginx-limit.conf`:
   ```
   [Definition]
   failregex = ^<HOST> .* "(GET|POST|HEAD).*" (429|405) 
   ```
3. Jail en `/etc/fail2ban/jail.d/nginx-limit.conf` apuntando al
   `access.log` del contenedor web (móntalo a un path del host si lo quieres
   accesible), con `maxretry` y `bantime` a tu gusto.

Es un extra: los límites de nginx ya rechazan el tráfico abusivo; fail2ban solo
evita que ese tráfico siga tocando nginx al banearlo en el firewall.
