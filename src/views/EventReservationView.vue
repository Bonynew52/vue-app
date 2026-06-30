<script setup>
const reservationFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSf6t4oeY86rwgtwKo8nDSC5zUPcWYpJFRlxtlBIazYuolePbQ/viewform'
</script>

<template>
  <main class="event-reservation-view">
    <section class="event-reservation-view__sheet" aria-label="Catalogo de eventos">
      <img
        src="/images/events/catalogo-eventos-2026-pagina-2.png"
        alt="Catalogo de paquetes y eventos 2026, pagina de desayunos y comidas"
        draggable="false"
        @contextmenu.prevent
      />
      <div class="event-reservation-view__action">
        <a :href="reservationFormUrl" target="_blank" rel="noreferrer">Solicita tu reservacion</a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.event-reservation-view {
  min-height: 100svh;
  background: #101114;
  padding: 0;
}

.event-reservation-view__sheet {
  width: min(100%, 760px);
  margin: 0 auto;
  background: #ffffff;
}

.event-reservation-view img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

.event-reservation-view__action {
  display: flex;
  justify-content: center;
  padding: 24px 18px 34px;
  background: #ffffff;
}

.event-reservation-view__action a {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border: 2px solid #399ba4;
  border-radius: 999px;
  background: #399ba4;
  color: #ffffff;
  font-family: 'Fredoka', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 28px;
  text-decoration: none;
  text-transform: uppercase;
}

.event-reservation-view__action a:focus-visible {
  outline: 3px solid rgba(57, 155, 164, 0.34);
  outline-offset: 3px;
}
</style>
