# Belly Monster Bites Context

This note captures Pedro's raw business context for Belly Monster Bites so future
implementation decisions stay grounded in the actual conversation and customer
concerns.

## Customer

- Belly Monster Bites is a cafeteria in Nuevo Laredo.
- The owner is around 60 years old.
- Her children also help in the business.
- Pedro believes the owner likely has money to pay for this work.

## Meeting Context And IP Concern

Pedro spoke with the owner about building software for pickup ordering and a
`mesero` flow for in-person customers.

The owner said she did not want the ideas or software sold to competitors. After
discussion, including input from Pedro's mom, the clearer interpretation is:

- She does not want the exact same thing repackaged and sold to another
  restaurant.
- She is not trying to prevent Pedro from serving other restaurants.
- The analogy is tailoring: she does not want her specific suit resold, but it is
  acceptable for Pedro to tailor different suits for other restaurants.
- This is not mainly about enabling competition. It is about avoiding a clone of
  her specific version.

Pedro's working model should therefore be tailored deployments, not a copied
product install.

## Current Tech Setup

- Belly Monster Bites tried Squarespace and gave up.
- They currently have the domain.
- They use Parrot as their POS system.

## Requested Work

The owner wants three things.

1. Website
   - Pedro makes the site.
   - She wants to tell her story.
   - Pedro currently finds the story emphasis a little strange, but it matters to
     her and should be preserved as a customer requirement.

2. Pickup software
   - The website should let customers place an order.
   - The likely first implementation opens WhatsApp with a drafted order message.
   - Follow-ups can then happen through WhatsApp.
   - The business goal is to sell more.

3. Waiter / `mesero` software
   - In-person customers should be able to self-serve from the website.
   - This may draft a WhatsApp message and support follow-ups, or may eventually
     become a different website-native flow.
   - The business goal is to encourage more purchases from people already sitting
     in the restaurant instead of letting them sit without ordering more.

## Pedro's Working Frame

Pedro is not trying to build a generic software product here. The goal is to
build knowledge, skills, and reusable patterns that can be adapted for future
restaurants.

Each deployment should be its own slightly different application. The business
model is closer to a tailor than a product company: do tailored work for one
customer, learn from it, then move to the next customer with a different fit.

Pedro wants to serve more restaurants, but not by selling the exact same Belly
Monster Bites implementation to them.

## Staff Dashboard Design Notes

- The staff dashboard is an internal operational surface, not a public customer
  page.
- It should not inherit the public website header, social links, or broad
  navigation when those do not help employees process orders.
- The PWA install prompt is expected browser behavior, but the dashboard design
  should account for kiosk/tablet usage where install affordances may appear.
- A future Claude-led UI pass should treat the staff dashboard as a separate
  operational workflow from the public website and QR ordering experience.
- The current `Actualizar` button manually refreshes the orders list. This may
  be useful as a fallback, but it should not be the primary employee workflow.
- The dashboard likely wants a Linear-style state model for each order: clear
  states, explicit transitions, and a visual sense of where every order is in
  the workflow.
- The staff dashboard will be hard to design in isolation. It should be
  iterated alongside the actual employees because they will be the daily drivers
  of the system and will reveal the real workflow constraints.
- The internal system does not need to feel whimsical just because the public
  brand does. Employees need speed, legibility, confidence, and low-friction
  order handling more than brand expression.
- Moving orders to Convex means order data can be handled through Convex
  realtime queries and mutations instead of Vercel API routes.
- The remaining backend edge case is staff authentication/authorization. If
  Better Auth stays on Vercel, Vercel functions may still be needed for auth or
  as a protected proxy. If Convex becomes auth-aware, the staff dashboard can
  talk directly to Convex while preserving backend authorization.
