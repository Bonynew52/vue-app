# Belly Monster Bites

> **POS APK status:** version `0.4.3` publicada. El APK descargable incluye token default `prueba 123`, terminal visual negra y soporte para debug de peticiones.

Sitio y sistema inicial de pedidos QR para Belly Monster Bites.

## Estructura

```txt
src/
  assets/styles/      Estilos globales y recursos visuales
  components/layout/  Componentes de estructura general
  components/ui/      Componentes reutilizables de interfaz
  composables/        Logica reutilizable con Composition API
  data/               Datos locales y presets
  utils/              Funciones puras de ayuda
  views/              Pantallas principales
convex/               Backend realtime, datos y autenticacion del personal
public/               Manifest, service worker y descargas publicas
scripts/              Scripts operativos locales
```

Los colores base estan centralizados en `src/assets/styles/tokens.css`.

## Docs

- [Belly Monster Bites context](docs/belly-monster-bites-context.md)

## Deployment

- Production: https://bellymonsterbites.com
- Pedidos QR: https://bellymonsterbites.com/ordenar?mesa=1
- Panel del personal: https://bellymonsterbites.com/ordenes

## Operacion

- App iPhone Pedidos DM: https://bellymonsterbites.com/pedidos-dm
- Guia iPhone/PWA: [docs/iphone-dm-pwa.md](docs/iphone-dm-pwa.md)
- Descargar APK de impresora POS v0.4.3: https://github.com/Bonynew52/vue-app/raw/main/public/downloads/belly-imin-print-test.apk

Para actualizar la terminal Parrot, descarga otra vez `belly-imin-print-test.apk`
desde el mismo link e instalala encima de la version anterior. El archivo en
`public/downloads/belly-imin-print-test.apk` debe ser siempre la version vigente.

Estandar de actualizacion de APK: cada cambio incrementa `versionName` y
`versionCode`, recompila `native/imin-print-test`, reemplaza
`public/downloads/belly-imin-print-test.apk`, actualiza este README y sube todo
a `main`.

Estandar de actualizacion iPhone/PWA: cada cambio de la app DM mantiene el link
`/pedidos-dm`, actualiza `docs/iphone-dm-pwa.md` si cambia el modo de uso,
corre `npm run build` y sube los cambios a `main`.

En el boton **Config** de la app POS usa:

```txt
Backend URL:
https://wonderful-basilisk-515.convex.site

Token:
prueba 123
```

La app usa Convex para pedidos, eventos, actualizaciones realtime y el
almacenamiento de Better Auth para el login del personal. Clerk se limita al
flujo de clientes Pick&Go. Vercel sirve el frontend Vue/Vite.

Vercel esta configurado para compilar con:

```sh
npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL
```

Asi cada deploy de produccion publica primero las funciones de Convex y despues
construye el frontend apuntando al deployment correcto.

GitHub esta conectado a Vercel con `main` como rama de produccion. No hay un
workflow separado de GitHub Actions para Convex: el flujo correcto es push a
GitHub, deploy automatico de Vercel, y dentro de ese build se ejecuta
`npx convex deploy`. Los preview deploys de Vercel estan ignorados; solo
produccion debe construir y publicar.

Variables principales:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `CONVEX_DEPLOY_KEY` en Vercel para los deploys de produccion
- `CONVEX_DEPLOYMENT`
- `SITE_URL`, `BETTER_AUTH_SECRET` y `CLERK_JWT_ISSUER_DOMAIN` en Convex
- `VITE_CLERK_PUBLISHABLE_KEY` en Vercel para Pick&Go

## Comandos

```sh
npm install
npm run convex:dev
npm run dev
npm run dev:full
npm run build
```
