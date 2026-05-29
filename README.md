# Belly Monster Bites

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
api/                  Endpoints de Vercel para autenticacion del personal
convex/               Backend realtime de pedidos QR y panel del personal
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

La app usa Convex para pedidos, eventos y actualizaciones realtime del panel del
personal. Vercel sirve el frontend Vue/Vite y conserva por ahora los endpoints
de Better Auth para el login del personal.

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
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `ALLOW_STAFF_SIGNUP` mientras Better Auth siga usando Postgres.

El usuario local de staff se crea con `npm run staff:create` usando
`STAFF_EMAIL` y `STAFF_PASSWORD`.

## Comandos

```sh
npm install
npm run convex:dev
npm run dev
npm run dev:full
npm run build
```
