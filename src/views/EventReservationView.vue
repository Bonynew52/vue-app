<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const reservationFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSf6t4oeY86rwgtwKo8nDSC5zUPcWYpJFRlxtlBIazYuolePbQ/viewform'
const router = useRouter()

const eventPackages = [
  {
    id: 'desayuno-1',
    title: 'Desayuno',
    subtitle: 'Paquete 1',
    tone: 'green',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu de desayunos: Sandwiches, Egg Drop Sandwich, Toast, Waffle o Pan Frances a elegir.',
      },
      {
        title: 'Bebida Grande',
        text: 'Cofy caliente, helado o frappe 20oz; Chillers 20oz; tes y coldbrews 20oz; o malteada 16oz.',
      },
      {
        title: 'Sweet Bite',
        text: 'Una galleta, brownie, cheesecake o roll.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$252', '$257'],
      ['Sabado y Domingo', '$263', '$268'],
    ],
    priceColumns: ['08:30 - 10:00', '10:00 - 12:30'],
  },
  {
    id: 'desayuno-2',
    title: 'Desayuno',
    subtitle: 'Paquete 2',
    tone: 'blue',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu de desayunos: Sandwiches, Egg Drop Sandwich, Toast, Waffle o Pan Frances a elegir.',
      },
      {
        title: 'Bebida Grande',
        text: 'Cofy caliente, helado o frappe 20oz; Chillers 20oz; tes y coldbrews 20oz; o malteada 16oz.',
      },
      {
        title: 'Kuky',
        text: 'Una galleta.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$237', '$242'],
      ['Sabado y Domingo', '$247', '$252'],
    ],
    priceColumns: ['08:30 - 10:00', '10:00 - 12:30'],
  },
  {
    id: 'desayuno-3',
    title: 'Desayuno',
    subtitle: 'Paquete 3',
    tone: 'purple',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu de desayunos: Sandwiches, Egg Drop Sandwich, Toast, Waffle o Pan Frances a elegir.',
      },
      {
        title: 'Bebida Mediana',
        text: 'Cofy caliente, helado o frappe 16oz; Chillers 16oz; tes y coldbrews 16oz; o malteada 12oz.',
      },
      {
        title: 'Kuky',
        text: 'Una galleta.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$230', '$235'],
      ['Sabado y Domingo', '$240', '$245'],
    ],
    priceColumns: ['08:30 - 10:00', '10:00 - 12:30'],
  },
  {
    id: 'comida-1',
    title: 'Comida',
    subtitle: 'Paquete 1',
    tone: 'purple',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu: Sandwiches, hamburguesas, toast, waffle o pan frances.',
      },
      {
        title: '1/2 Ensalada o Sopa',
        text: 'Media ensalada o sopa a elegir.',
      },
      {
        title: 'Bebida Grande',
        text: 'Cofy caliente, helado o frappe 20oz; Chillers 20oz; tes y coldbrews 20oz; o malteada 16oz.',
      },
      {
        title: 'Postre + Gelato',
        text: 'Cualquier producto de reposteria: galleta, brownie, roll o cheesecake, mas 1 bolita de gelato.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$355', '$363'],
      ['Sabado y Domingo', '$370', '$378'],
    ],
    priceColumns: ['12:00 - 16:00', '16:00 - 20:30'],
  },
  {
    id: 'comida-2',
    title: 'Comida',
    subtitle: 'Paquete 2',
    tone: 'cyan',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu: Sandwiches, hamburguesas, toast, waffle o pan frances.',
      },
      {
        title: '1 Side a elegir',
        text: 'French fries, Mac & Cheese, Sweet Potato Fries o Cream Corn.',
      },
      {
        title: 'Bebida Grande',
        text: 'Cofy caliente, helado o frappe 20oz; Chillers 20oz; tes y coldbrews 20oz; o malteada 16oz.',
      },
      {
        title: 'Kuky o Brauny + Gelato',
        text: 'Galleta o brownie, mas 1 bolita de gelato.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$320', '$326'],
      ['Sabado y Domingo', '$333', '$340'],
    ],
    priceColumns: ['12:00 - 16:00', '16:00 - 20:30'],
  },
  {
    id: 'comida-3',
    title: 'Comida',
    subtitle: 'Paquete 3',
    tone: 'pink',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu: Sandwiches, hamburguesas, toast, waffle, pan frances, ensalada o sopa.',
      },
      {
        title: 'Bebida Mediana',
        text: 'Cofy caliente, helado o frappe 16oz; Chillers 16oz; tes y coldbrews 16oz; o malteada 12oz.',
      },
      {
        title: 'Kuky + Gelato',
        text: 'Galleta y 1 bolita de gelato.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$268', '$274'],
      ['Sabado y Domingo', '$279', '$285'],
    ],
    priceColumns: ['12:00 - 16:00', '16:00 - 20:30'],
  },
  {
    id: 'comida-4',
    title: 'Comida',
    subtitle: 'Paquete 4',
    tone: 'brown',
    includes: [
      {
        title: 'Platillo Principal',
        text: 'Cualquier platillo de nuestro menu: Sandwiches, hamburguesas, toast, waffle, pan frances, ensalada o sopa.',
      },
      {
        title: 'Bebida Mediana',
        text: 'Cofy caliente, helado o frappe 16oz; Chillers 16oz; tes y coldbrews 16oz; o malteada 12oz.',
      },
      {
        title: 'Kuky',
        text: 'Galleta.',
      },
    ],
    prices: [
      ['Martes a Viernes', '$240', '$245'],
      ['Sabado y Domingo', '$250', '$255'],
    ],
    priceColumns: ['12:00 - 16:00', '16:00 - 20:30'],
  },
  {
    id: 'waffle-party',
    title: 'Waffle Party',
    subtitle: '',
    tone: 'purple',
    intro:
      'Eventos para ninos de 4 a 14 anos. Se sirven charolas de waffles con toppings para que cada nino prepare su waffle como mas le guste.',
    includes: [
      {
        title: 'Waffles',
        text: '1 waffle, 4 triangulos, por nino.',
      },
      {
        title: 'Toppings',
        text: 'Jarabe de chocolate, caramelo, miel de maple, Nutella, peanut butter, cajeta, platano, fresa, frambuesa, mora azul, chispas, chocolate blanco y bombones.',
      },
      {
        title: 'Bebidas y Postre',
        text: 'Bebida mediana, 1 galleta y 1 bolita de gelato por nino.',
      },
    ],
    prices: [
      ['10:00 a 12:30', '$281', '$270', '$258', '$247'],
      ['12:30 a 16:00', '$287', '$276', '$264', '$253'],
    ],
    priceColumns: ['5-10 ninos', '11-16 ninos', '17-21 ninos', '21-26 ninos'],
    notes: [
      'Para adultos se puede ofrecer uno de los paquetes anteriores.',
      'Puede traer pastel para sus invitados.',
      'Se puede decorar el espacio cuidando que no se dane la pintura o estructura del local.',
    ],
  },
  {
    id: 'sweet-details',
    title: 'Sweet Details',
    subtitle: '',
    tone: 'sweet',
    intro:
      'Productos empaquetados individualmente en bolsita de celofan con sticker personalizado para tu evento o detallito.',
    includes: [
      { title: 'Kukys', text: '1 galleta de tamano normal (60 gr).' },
      { title: 'Mini Kukys', text: '1 galleta de la mitad del tamano (30 gr).' },
      { title: '2 Mini Kukys', text: '2 galletas de la mitad del tamano (30 gr).' },
      { title: 'Braunys', text: '1 brownie de tamano normal (6x6 cm).' },
      { title: 'Mini Braunys', text: '1 brownie de tamano mediano (4.5x4.5 cm).' },
      { title: '3 Brauny Bites', text: '3 brownies de tamano chico (3x3 cm).' },
      { title: 'Mini Kuky & Brauny', text: '1 brownie mediano (3x3 cm) y 1 mini kuky (30 gr).' },
      { title: 'Chiskay', text: '1 cheesecake paleta.' },
    ],
    prices: [
      ['Kuky Normal', '$38', '$37', '$36', '$34'],
      ['Mini Kukys', '$21', '$20', '$19', '$18'],
      ['2 Mini Kuky', '$38', '$37', '$36', '$34'],
      ['Brauny', '$57', '$56', '$54', '$52'],
      ['Mini Brauny', '$37', '$36', '$35', '$33'],
      ['3 Brauny Bites', '$45', '$44', '$43', '$42'],
      ['Mini Kuky & Mini Brauny', '$55', '$54', '$53', '$51'],
      ['Chiskay', '$59', '$58', '$57', '$56'],
    ],
    priceColumns: ['10-20', '21-30', '31-40', '+40'],
  },
]

const selectedPackageId = ref('')

const selectedPackage = computed(
  () => eventPackages.find((eventPackage) => eventPackage.id === selectedPackageId.value) || null,
)

function openPackage(eventPackage) {
  selectedPackageId.value = eventPackage.id
}

function closePackage() {
  selectedPackageId.value = ''
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push({ name: 'home' })
}
</script>

<template>
  <main class="event-reservation-view">
    <section class="event-reservation-view__sheet" aria-label="Paquetes de eventos">
      <header class="event-reservation-view__hero">
        <h1>Reserva tu evento</h1>
        <p>Echa un vistazo a nuestros paquetes</p>
      </header>

      <div class="event-reservation-view__packages">
        <button
          v-for="eventPackage in eventPackages"
          :key="eventPackage.id"
          class="event-package-card"
          :class="`event-package-card--${eventPackage.tone}`"
          type="button"
          @click="openPackage(eventPackage)"
        >
          <span>{{ eventPackage.title }}</span>
          <small v-if="eventPackage.subtitle">{{ eventPackage.subtitle }}</small>
        </button>
      </div>

      <div class="event-reservation-view__footer-action">
        <button type="button" @click="goBack">Volver</button>
      </div>
    </section>

    <Transition name="package-detail">
      <section
        v-if="selectedPackage"
        class="package-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
      >
        <button
          class="package-detail-modal__backdrop"
          type="button"
          aria-label="Cerrar paquete"
          @click="closePackage"
        ></button>

        <article class="package-detail-card" :class="`package-detail-card--${selectedPackage.tone}`">
          <button class="package-detail-card__close" type="button" aria-label="Cerrar paquete" @click="closePackage">
            x
          </button>

          <header class="package-detail-card__header">
            <p>To eat&nbsp;&nbsp; to share&nbsp;&nbsp; to enjoy</p>
            <h2 id="package-detail-title">
              {{ selectedPackage.title }}
              <small v-if="selectedPackage.subtitle">{{ selectedPackage.subtitle }}</small>
            </h2>
            <span v-if="selectedPackage.intro">{{ selectedPackage.intro }}</span>
          </header>

          <div class="package-detail-card__body">
            <section class="package-detail-section">
              <h3>Incluye</h3>
              <ul>
                <li v-for="item in selectedPackage.includes" :key="item.title">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.text }}</span>
                </li>
              </ul>
            </section>

            <section class="package-detail-section">
              <h3>Precio persona</h3>
              <div class="package-price-table" :style="{ '--price-column-count': selectedPackage.priceColumns.length }">
                <span class="package-price-table__corner"></span>
                <strong v-for="column in selectedPackage.priceColumns" :key="column">{{ column }}</strong>
                <template v-for="row in selectedPackage.prices" :key="row[0]">
                  <span>{{ row[0] }}</span>
                  <b v-for="value in row.slice(1)" :key="`${row[0]}-${value}`">{{ value }}</b>
                </template>
              </div>
            </section>

            <section v-if="selectedPackage.notes?.length" class="package-detail-section">
              <h3>Notas</h3>
              <ul>
                <li v-for="note in selectedPackage.notes" :key="note">
                  <span>{{ note }}</span>
                </li>
              </ul>
            </section>
          </div>

          <a class="package-detail-card__action" :href="reservationFormUrl" target="_blank" rel="noreferrer">
            Solicita tu reservacion
          </a>
        </article>
      </section>
    </Transition>
  </main>
</template>

<style scoped>
.event-reservation-view {
  min-height: 100svh;
  background: #f1f1ed;
  padding: 0;
}

.event-reservation-view__sheet {
  width: min(100%, 560px);
  min-height: 100svh;
  margin: 0 auto;
  border-right: 1px solid #101114;
  border-left: 1px solid #101114;
  background: #f8f8f4;
}

.event-reservation-view__hero {
  display: grid;
  min-height: 156px;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 32px 18px 28px;
  border-top: 1px solid #101114;
  border-bottom: 1px solid #101114;
  background: #ffe996;
  color: #6f9fce;
  text-align: center;
  text-transform: uppercase;
}

.event-reservation-view__hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 7vw, 2.3rem);
  font-weight: 900;
  line-height: 0.95;
}

.event-reservation-view__hero p {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.62rem, 2.4vw, 0.86rem);
  font-weight: 900;
  line-height: 1;
}

.event-reservation-view__packages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 16px;
  padding: 64px clamp(28px, 9vw, 58px) 28px;
}

.event-package-card {
  --package-color: #6f9fce;

  display: grid;
  min-height: 112px;
  place-items: center;
  align-content: center;
  gap: 4px;
  padding: 18px 12px;
  border: 0;
  border-radius: 22px;
  background: var(--package-color);
  color: #ffffff;
  font-family: var(--font-display);
  line-height: 1;
  text-decoration: none;
  text-transform: uppercase;
  box-shadow: 0 2px 0 rgb(0 0 0 / 4%);
  cursor: pointer;
}

.event-package-card span {
  max-width: 100%;
  font-size: clamp(1.05rem, 4.8vw, 1.45rem);
  font-weight: 900;
  line-height: 0.92;
  text-align: center;
}

.event-package-card small {
  font-family: var(--font-body);
  font-size: clamp(0.68rem, 2.8vw, 0.86rem);
  font-weight: 900;
  line-height: 1;
  text-transform: none;
}

.event-package-card--green {
  --package-color: #58b872;
}

.event-package-card--blue,
.event-package-card--sweet {
  --package-color: #6f9fce;
}

.event-package-card--sweet {
  grid-column: 1 / -1;
  justify-self: center;
  width: calc((100% - 16px) / 2);
  min-height: 124px;
}

.event-package-card--purple {
  --package-color: #b07abd;
}

.event-package-card--cyan {
  --package-color: #399ba4;
}

.event-package-card--pink {
  --package-color: #ee94a4;
}

.event-package-card--brown {
  --package-color: #85421e;
}

.event-package-card:focus-visible {
  outline: 3px solid rgb(57 155 164 / 34%);
  outline-offset: 3px;
}

.event-reservation-view__footer-action {
  display: flex;
  justify-content: center;
  padding: 0 clamp(28px, 9vw, 58px) 42px;
}

.event-reservation-view__footer-action button {
  min-height: 44px;
  min-width: 128px;
  padding: 12px 24px;
  border: 1px solid #101114;
  border-radius: 999px;
  background: #ffffff;
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}

.event-reservation-view__footer-action button:focus-visible {
  outline: 3px solid rgb(57 155 164 / 34%);
  outline-offset: 3px;
}

.package-detail-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 18px;
}

.package-detail-modal__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(16 17 20 / 58%);
  backdrop-filter: blur(3px);
}

.package-detail-card {
  --package-color: #6f9fce;

  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 520px);
  max-height: min(88svh, 820px);
  overflow: auto;
  border: 1px solid #101114;
  background: #fffaf0;
  color: #24170e;
  box-shadow: 0 24px 58px rgb(0 0 0 / 28%);
}

.package-detail-card--green {
  --package-color: #58b872;
}

.package-detail-card--blue,
.package-detail-card--sweet {
  --package-color: #6f9fce;
}

.package-detail-card--purple {
  --package-color: #b07abd;
}

.package-detail-card--cyan {
  --package-color: #399ba4;
}

.package-detail-card--pink {
  --package-color: #ee94a4;
}

.package-detail-card--brown {
  --package-color: #85421e;
}

.package-detail-card__close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 60%);
  border-radius: 999px;
  background: rgb(16 17 20 / 20%);
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  cursor: pointer;
}

.package-detail-card__header {
  display: grid;
  gap: 10px;
  padding: 34px 24px 28px;
  background: var(--package-color);
  color: #ffffff;
  text-align: center;
}

.package-detail-card__header p {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.package-detail-card__header h2 {
  display: grid;
  gap: 3px;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.1rem, 10vw, 4rem);
  font-weight: 900;
  line-height: 0.82;
  text-transform: uppercase;
}

.package-detail-card__header h2 small {
  font-family: var(--font-body);
  font-size: clamp(0.9rem, 3.5vw, 1.1rem);
  line-height: 1;
  text-transform: none;
}

.package-detail-card__header span {
  max-width: 420px;
  margin: 0 auto;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.35;
}

.package-detail-card__body {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.package-detail-section {
  display: grid;
  gap: 12px;
}

.package-detail-section h3 {
  margin: 0;
  color: var(--package-color);
  font-family: var(--font-display);
  font-size: 1.55rem;
  font-weight: 900;
  line-height: 0.95;
  text-transform: uppercase;
}

.package-detail-section ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.package-detail-section li {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgb(111 78 55 / 18%);
  border-radius: 12px;
  background: #ffffff;
}

.package-detail-section strong {
  color: #101114;
  font-family: var(--font-body);
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1.15;
}

.package-detail-section span {
  font-family: var(--font-body);
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
}

.package-price-table {
  display: grid;
  grid-template-columns: minmax(94px, 1.05fr) repeat(var(--price-column-count), minmax(58px, 0.75fr));
  overflow: hidden;
  border: 1px solid rgb(16 17 20 / 16%);
  border-radius: 12px;
  background: #ffffff;
  font-family: var(--font-body);
  font-size: clamp(0.72rem, 2.7vw, 0.86rem);
  font-weight: 900;
}

.package-price-table > * {
  display: grid;
  min-height: 38px;
  place-items: center;
  padding: 8px 6px;
  border-right: 1px solid rgb(16 17 20 / 10%);
  border-bottom: 1px solid rgb(16 17 20 / 10%);
  text-align: center;
}

.package-price-table > :nth-last-child(-n + 3) {
  border-bottom: 0;
}

.package-price-table__corner,
.package-price-table strong {
  background: color-mix(in srgb, var(--package-color) 20%, white);
  color: #101114;
}

.package-price-table b {
  color: var(--package-color);
}

.package-detail-card__action {
  justify-self: center;
  margin: 0 24px 28px;
  min-height: 44px;
  padding: 14px 24px;
  border-radius: 999px;
  background: var(--package-color);
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
}

.package-detail-enter-active,
.package-detail-leave-active {
  transition: opacity 180ms ease;
}

.package-detail-enter-from,
.package-detail-leave-to {
  opacity: 0;
}

@media (max-width: 420px) {
  .package-detail-card__body {
    padding: 20px 16px;
  }

  .package-price-table {
    grid-template-columns: minmax(82px, 1fr) repeat(var(--price-column-count), minmax(48px, 0.75fr));
  }
}

@media (max-width: 360px) {
  .event-reservation-view__packages {
    gap: 14px 12px;
    padding-inline: 24px;
  }

  .event-package-card {
    min-height: 102px;
    border-radius: 19px;
  }
}
</style>
