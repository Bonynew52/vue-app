# Belly Monster Bites

> **POS APK status:** version `0.4.1` publicada. El APK descargable ya incluye boton `Config`, backend visible y botones verde/rojo.

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
public/               Manifest y service worker de la PWA
scripts/              Scripts operativos locales
```

Los colores base estan centralizados en `src/assets/styles/tokens.css`.

## Docs

- [Belly Monster Bites context](docs/belly-monster-bites-context.md)

## Deployment

- Production: https://bellymonsterbites.com
- Pedidos QR: https://bellymonsterbites.com/ordenar?mesa=1
- Panel del personal: https://bellymonsterbites.com/ordenes

## App de impresora POS

**NEW:** la app POS ya esta en version `0.4.1` con boton `Config`, backend
visible y botones verde/rojo. El APK descargable ya fue recompilado y publicado.

El APK para instalar en la tableta o terminal Android del punto de venta esta en:

- [Descargar APK de impresora POS](https://raw.githubusercontent.com/Bonynew52/vue-app/main/public/downloads/belly-imin-print-test.apk)

Desde la tableta, abre ese link directo para descargar el APK. Despues abre el
archivo, permite instalar apps desconocidas si Android lo solicita, instala la
app y presiona **Encender receptor**.

En el boton **Config** de la app POS usa:

```txt
Backend URL:
https://wonderful-basilisk-515.convex.site

Token:
el mismo valor configurado en Convex como PRINTER_AGENT_TOKEN
```

Nota: el APK debe recompilarse y reemplazarse cuando cambie el codigo en
`native/imin-print-test`.

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

## APK nuevo POS 0.4.1

- [Descargar APK POS 0.4.1](https://raw.githubusercontent.com/Bonynew52/vue-app/main/public/downloads/belly-imin-print-test-0.4.1.apk)

Este link apunta al archivo separado de la version nueva. El link anterior
`belly-imin-print-test.apk` tambien fue reemplazado con esta misma compilacion.
