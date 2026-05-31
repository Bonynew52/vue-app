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
