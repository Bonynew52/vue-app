<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="history-view">
    <section class="history-view__sheet" aria-labelledby="history-title">
      <h1 id="history-title">Quienes somos</h1>

      <article>
        <h2>Misión</h2>
        <p>
          En Belly Monster Bites ofrecemos un espacio de felicidad libre de estrés donde las personas se
          desconecten de sus preocupaciones diarias a través de repostería, gelatos, bebidas y cafés de
          especialidad excepcionales. Creamos una transición perfecta entre un mundo divertido y la rutina
          humana, colocando siempre al cliente al centro de cada experiencia y para el disfrute de nuestros
          productos que son elaborados con absoluta pasión.
        </p>
        <strong>TO EAT, TO SHARE, TO ENJOY</strong>
      </article>

      <article>
        <h2>Visión</h2>
        <p>
          Posicionarnos como la marca de repostería y cafetería temática más querida y reconocida en el
          noreste de Mexico y el sur de Texas. Buscamos expandir nuestro modelo de franquicia de manera
          sostenible, llevando innovación constante a nuestra familia de productos y contagiando la alegría
          de nuestros personajes a cada nueva comunidad que visitemos.
        </p>
      </article>

      <article>
        <h2>Valores Corporativos</h2>
        <ul>
          <li>
            <strong>Legado y Union Familiar:</strong>
            Trabajamos con el mismo cariño, confianza y apoyo mutuo con el que jugábamos en nuestra niñez.
          </li>
          <li>
            <strong>Calidez en la Experiencia:</strong>
            Recibimos a cada cliente como a un invitado de honor en nuestra propia casa.
          </li>
          <li>
            <strong>Pasión Artesanal:</strong>
            Horneamos y creamos cada producto desde cero con el orgullo y la dedicación de nuestra receta
            original.
          </li>
          <li>
            <strong>Transparencia e Integridad:</strong>
            Actuamos con total honestidad en nuestros procesos, finanzas y relaciones comerciales para
            generar confianza a largo plazo.
          </li>
          <li>
            <strong>Alegría Colectiva:</strong>
            Promovemos un ambiente de trabajo divertido donde el éxito se comparte y se celebra en equipo.
          </li>
          <li>
            <strong>Innovacion con Identidad:</strong>
            Buscamos evolucionar y adaptarnos a nuevos mercados sin perder nunca la esencia que nos vio nacer.
          </li>
        </ul>
      </article>

      <div class="history-view__action">
        <RouterLink :to="{ name: 'home' }">Volver al inicio</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.history-view {
  min-height: 100svh;
  background: #101114;
  padding: 0;
}

.history-view__sheet {
  display: grid;
  width: 100%;
  gap: 28px;
  margin: 0;
  padding: 42px 24px 38px;
  background: #ffffff;
  color: #101114;
  text-align: center;
}

.history-view h1,
.history-view h2 {
  margin: 0;
  font-family: var(--font-display);
  line-height: 0.95;
  text-transform: uppercase;
}

.history-view h1 {
  color: #399ba4;
  font-size: clamp(2rem, 8vw, 3.8rem);
}

.history-view h2 {
  color: #b47bb9;
  font-size: clamp(1.25rem, 5vw, 2rem);
}

.history-view article {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.history-view p,
.history-view li {
  max-width: 62ch;
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.98rem;
  line-height: 1.55;
}

.history-view strong {
  font-family: var(--font-body);
  font-weight: 900;
}

.history-view ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style-position: inside;
}

.history-view__action {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.history-view__action a {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border: 2px solid #399ba4;
  border-radius: 999px;
  background: #399ba4;
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 28px;
  text-decoration: none;
  text-transform: uppercase;
}

.history-view__action a:focus-visible {
  outline: 3px solid rgba(57, 155, 164, 0.34);
  outline-offset: 3px;
}
</style>
