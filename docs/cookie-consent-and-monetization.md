# Sistema de cookies y monetizacion

Este documento describe la implementacion actual del consentimiento de cookies, la preparacion para analitica/publicidad/afiliacion y la compuerta manual que impide mostrar vinetas de monetizacion hasta que existan IDs, enlaces y autorizaciones reales.

## Objetivo

La plataforma no usa cuentas de usuario. Todo el estado persistente vive en el navegador del cliente: cookies tecnicas, `localStorage`, partidas, records y preferencias locales.

El sistema de cookies debe:

- Mostrar el aviso en la primera entrada del usuario, tanto en home como entrando directo a un juego por URL/hash.
- Permitir aceptar todo, configurar categorias o rechazar las no necesarias.
- Permitir reabrir la configuracion desde el footer.
- Guardar la decision del usuario sin backend.
- Preparar futuras integraciones de Google Analytics, Google AdSense/GTM y Amazon Afiliados.
- No cargar scripts ni mostrar vinetas de publicidad/afiliacion hasta que exista consentimiento y la compuerta manual de monetizacion este activada.

## Archivos principales

- `src/components/ConsentContext.jsx`
  - Provider global de consentimiento.
  - Expone `useConsent()` y `useOptionalConsent()`.
  - Sincroniza scripts externos segun consentimiento.

- `src/components/CookieConsentManager.jsx`
  - Modal global de cookies.
  - Aviso inicial y panel de configuracion.
  - Textos ES/EN, finalidades, propositos obligatorios y tabla de cookies/almacenamientos.

- `src/utils/cookieConsent.js`
  - Lectura, normalizacion y guardado del consentimiento.
  - Cookie tecnica `playforge_cookie_consent`.
  - Copia en `localStorage` con clave `playforge.cookieConsent.v1`.
  - Integracion base con Google Consent Mode si existe `window.gtag`.

- `src/utils/ScriptManager.js`
  - Carga scripts externos una sola vez.
  - Inserta scripts inline controlados.
  - Descarga scripts por clave o prefijo.

- `src/config/monetizationGate.js`
  - Compuerta manual de monetizacion.
  - Valor por defecto:

```js
export const ENABLE_MONETIZATION_PREVIEW = false;
```

- `src/config/adPreview.js`
  - Configuracion de slots/espacios publicitarios.
  - Aplica la compuerta manual a cualquier lector antiguo del estado de vinetas.

- `src/components/AdPreviewCard.jsx`
  - Componente visual de vineta publicitaria.
  - Consulta consentimiento y compuerta antes de mostrarse como publicidad activa.

- `src/App.jsx`
  - Monta `CookieConsentManager`.
  - Footer con boton de configuracion de cookies.
  - Sincroniza internamente el estado `platform-games-ad-preview-enabled`.
  - Ya no muestra el boton publico "Mostrar/Ocultar publicidad".

- `src/main.jsx`
  - Envuelve la aplicacion con `<ConsentProvider>`.

## Categorias de consentimiento

Definidas en `src/utils/cookieConsent.js`:

- `necessary`
  - Siempre activa.
  - Necesaria para guardar el consentimiento y funciones basicas.

- `preferences`
  - Preferencias locales de experiencia, idioma o visualizacion.

- `analytics`
  - Preparada para analitica futura, por ejemplo GA4.

- `advertising`
  - Preparada para publicidad, por ejemplo AdSense/GTM.

- `affiliate`
  - Preparada para afiliacion, por ejemplo Amazon Afiliados.

`Aceptar` todas las cookies activa todas las categorias no necesarias. `Rechazar` deja activas solo las necesarias.

## Persistencia

El consentimiento se guarda en dos sitios:

### Cookie tecnica

Nombre:

```text
playforge_cookie_consent
```

Duracion:

```text
180 dias
```

Contenido resumido:

```json
{
  "v": 1,
  "d": true,
  "t": "fecha ISO",
  "p": {
    "necessary": true,
    "preferences": false,
    "analytics": false,
    "advertising": false,
    "affiliate": false
  }
}
```

### LocalStorage

Clave:

```text
playforge.cookieConsent.v1
```

Contenido:

```json
{
  "version": 1,
  "decided": true,
  "updatedAt": "fecha ISO",
  "preferences": {
    "necessary": true,
    "preferences": false,
    "analytics": false,
    "advertising": false,
    "affiliate": false
  }
}
```

Nota tecnica: la cookie caduca a los 180 dias, pero `localStorage` no caduca por si solo. Si se necesita forzar la reaparicion exacta del aviso a los 180 dias aunque exista `localStorage`, hay que validar `updatedAt` en `readCookieConsent()`.

## Compuerta manual de monetizacion

La plataforma tiene una compuerta de codigo para impedir mostrar vinetas o activar publicidad antes de tener configuraciones reales y autorizaciones.

Archivo:

```text
src/config/monetizationGate.js
```

Linea unica:

```js
export const ENABLE_MONETIZATION_PREVIEW = false;
```

Comportamiento con `false`:

- No aparece el boton publico "Mostrar/Ocultar publicidad".
- No se muestran vinetas publicitarias aunque el usuario acepte cookies.
- `platform-games-ad-preview-enabled` se sincroniza como `false`.
- `AdPreviewCard` no queda en estado publicitario activo.

Comportamiento con `true`:

- La plataforma queda habilitada internamente para mostrar vinetas.
- Aun asi, las vinetas solo se muestran si el usuario ha aceptado `advertising`.
- Los enlaces o creatividades futuras solo deben activarse si existe consentimiento valido.

Para activar manualmente:

```js
export const ENABLE_MONETIZATION_PREVIEW = true;
```

Este cambio debe hacerse editando codigo. No hay control visible para usuarios.

## Relacion entre consentimiento y vinetas

Condicion efectiva para mostrar publicidad visual:

```text
ENABLE_MONETIZATION_PREVIEW === true
AND
consent.preferences.advertising === true
```

Si cualquiera de esas dos condiciones falla, no deben aparecer vinetas.

`AdPreviewCard` tambien aplica la compuerta:

- `data-ad-consent="granted"` solo si compuerta y consentimiento estan activos.
- `data-ad-consent="denied"` si falta consentimiento o la compuerta esta cerrada.
- No convierte slots en enlaces si publicidad no esta permitida.

## Scripts externos

`ConsentContext.jsx` prepara dos integraciones por variables de entorno:

```text
VITE_GA_MEASUREMENT_ID
VITE_GTM_CONTAINER_ID
```

### Analitica

Si `analytics === true` y existe `VITE_GA_MEASUREMENT_ID`, se carga:

```text
https://www.googletagmanager.com/gtag/js?id=<id>
```

Si `analytics === false`, se descargan scripts con prefijo `analytics:` y se intentan borrar cookies de Google Analytics (`_ga`, `_gid`, `_gat`, `_gac_`, `_gcl_`).

### Publicidad/GTM

Si `advertising === true` y existe `VITE_GTM_CONTAINER_ID`, se carga:

```text
https://www.googletagmanager.com/gtm.js?id=<id>
```

Si `advertising === false`, se descargan scripts con prefijo `ads:`.

La compuerta manual actual controla las vinetas y el estado visual de monetizacion. Antes de activar servicios reales, revisar si tambien conviene condicionar la carga de GTM/AdSense a `ENABLE_MONETIZATION_PREVIEW`.

## Google Consent Mode

`applyGoogleConsentMode()` actualiza `window.gtag` si existe:

- `ad_storage`
- `ad_user_data`
- `ad_personalization`
- `analytics_storage`
- `functionality_storage`
- `personalization_storage`
- `security_storage`

Si `window.gtag` no existe, la funcion no hace nada.

## Footer

El footer incluye un boton para reabrir configuracion:

```text
Configuracion de cookies
Cookie settings
```

Internamente llama a `openSettings()` desde `useConsent()`.

## Reglas funcionales actuales

- Primera visita sin consentimiento: se muestra modal.
- Entrada directa a juego sin consentimiento: se muestra modal.
- Aceptar todo: guarda todas las categorias en `true`.
- Configurar ajustes: permite activar/desactivar cada categoria.
- Rechazar: guarda solo `necessary: true`.
- Footer: reabre configuracion en cualquier momento.
- Publicidad visual: requiere consentimiento `advertising` y compuerta manual `true`.
- Afiliacion: se guarda como categoria independiente `affiliate`; preparada para futuras integraciones.

## Pendiente antes de activar monetizacion real

- Conseguir IDs reales de Google/AdSense/GTM o enlaces de afiliacion.
- Revisar requisitos actuales de Google AdSense para EEE/Reino Unido/Suiza.
- Integrar CMP certificada por Google/IAB TCF si aplica.
- Completar politica legal publica de cookies/privacidad con proveedores reales, finalidades y duraciones.
- Decidir si GTM/AdSense debe quedar tambien bloqueado por `ENABLE_MONETIZATION_PREVIEW`.
- Validar borrado/revocacion de cookies reales de terceros tras retirar consentimiento.
- Implementar caducidad estricta de 180 dias sobre `localStorage` si se necesita que el aviso reaparezca aunque el navegador conserve almacenamiento local.
