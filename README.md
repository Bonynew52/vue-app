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
api/                  Endpoints de Vercel para autenticacion y pedidos
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

La app usa Neon Postgres para pedidos, eventos y autenticacion de Better Auth.
Las variables necesarias son `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` y `ALLOW_STAFF_SIGNUP`. El usuario local de staff se crea con
`npm run staff:create` usando `STAFF_EMAIL` y `STAFF_PASSWORD`.

## Comandos

```sh
npm install
npm run dev
npm run dev:full
npm run build
```
