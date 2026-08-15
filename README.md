# Belly Monster Bites

> **POS APK status:** version `0.5.2` publicada. El APK descargable usa token seguro desde GitHub Secrets, impresion ESC/POS raw, terminal visible de diagnostico, formato simplificado de ticket, soporte para debug de peticiones, rutas visibles en Config y opcion de campana digital.

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

- Ruta Pedidos DM: https://bellymonsterbites.com/pedidos-dm
- Descargar APK de impresora POS v0.5.2: https://github.com/Bonynew52/vue-app/raw/main/public/downloads/belly-imin-print-test.apk

Para actualizar la terminal Parrot, descarga otra vez `belly-imin-print-test.apk`
desde el mismo link e instalala encima de la version anterior. El archivo en
`public/downloads/belly-imin-print-test.apk` debe ser siempre la version vigente.

Si una peticion aparece en Convex como `printJobs.status = pending` y no cambia
a `printing`/`printed`, la app instalada no la esta tomando. En ese caso
reinstala el APK vigente v0.5.2 en la terminal y confirma que el receptor este
encendido. La app POS debe escuchar la ruta estable `/printer/claim-next`; la
web de Pedidos DM ya crea pedidos normales para esa misma cola.

En **Config** puedes apagar o prender la opcion **Campana digital**. Cuando esta
encendida, la terminal reproduce un aviso sonoro al tomar una peticion antes de
imprimirla.

Formato vigente del ticket POS: `BELLY MONSTER BITES`, `COMANDA AVISOS LOCAL`,
`NOMBRE`, folio, fecha y texto del pedido. No imprime `MESA`, `CLIENTE`,
`DESTINO`, `ITEMS` ni `1x TEXTO LIBRE`.

Estandar de actualizacion de APK: cada cambio incrementa `versionName` y
`versionCode`, recompila `native/imin-print-test`, reemplaza
`public/downloads/belly-imin-print-test.apk`, actualiza este README y sube todo
a `main`.

Estandar de actualizacion Pedidos DM: cada cambio mantiene el link
`/pedidos-dm`, corre `npm run build` y sube los cambios a `main`.

En el boton **Config** de la app POS usa:

```txt
Backend URL:
https://wonderful-basilisk-515.convex.site

Token:
configurar en la app POS; debe coincidir con `PRINTER_AGENT_TOKEN` en Convex.

Rutas visibles en Config:
POST /printer/claim-next
POST /printer/complete
POST /printer/heartbeat
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
