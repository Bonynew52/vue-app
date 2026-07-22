export const customerMenuSections = [
  {
    name: 'Waffles y Pan Frances',
    products: [
      {
        sourceName: 'Just a Waffle (Waffle)',
        name: 'Waffle',
        description: 'Haz la combinacion perfecta de waffle con tus toppings a elegir.',
      },
      {
        sourceName: 'French Toast (Pan Frances)',
        description: 'Haz la combinacion perfecta de pan frances con tus toppings a elegir.',
      },
      { sourceName: 'Wafflete (Waffle)', description: 'Frijoles, chorizo y queso.' },
      {
        sourceName: 'American Breakfast Waffle (Waffle)',
        description: 'Waffle con huevo, tocino, jamon, queso cheddar, tomate, arugula y aderezo chipotle.',
      },
      {
        sourceName: "Spicy Chick'n'Waffle (Waffle)",
        description: 'Pollo empanizado banado en sriracha maple syrup.',
      },
      { sourceName: "S'mores French Toast (PF)", description: 'Chocolate, bombon, graham crackers.' },
    ],
  },
  {
    name: 'Sandwich',
    products: [
      { sourceName: 'Phily Cheese Brisket (Sandwich)', description: 'Brisket, queso mozzarella, lechuga, aderezo jalapeno.' },
      { sourceName: 'Buffalo Chicken (Sandwich)', description: 'Pollo buffalo, tomate, lechuga, aderezo ranch.' },
      { sourceName: 'Chicken Jalapeño (Sandwich)', description: 'Pollo empanizado, lechuga, tomate y aderezo jalapeno.' },
      { sourceName: 'BBQ Sandwich (Sandwich)', description: 'Brisket, salsa BBQ, ensalada de col y pepinillos.' },
      { sourceName: 'Grilled Cheese (Sandwich)', description: 'Pan de papa dorado con una mezcla de tres quesos.' },
      {
        sourceName: 'Chicken BLT (Sandwich)',
        description: 'Pollo, jamon, tocino, queso cheddar, aguacate, tomate, lechuga, aderezo chipotle.',
      },
      { sourceName: 'Tuna Melt (Sandwich)', description: 'Atun, queso suizo, aderezo de albahaca, cebolla y apio.' },
      { sourceName: 'Pavo y Panela (Sandwich)', description: 'Jamon de pavo, queso panela, espinaca, tomate, aderezo chipotle.' },
      { sourceName: 'The Sandwich (Sandwich)', description: 'Jamon de pavo, queso cheddar, tocino, lechuga, tomate, aderezo chipotle.' },
    ],
  },
  {
    name: 'Burgers',
    products: [
      {
        sourceName: 'Belly Burger (Burger)',
        description: 'Carne de res, aguacate, tomate, lechuga, queso cheddar, tocino, pepinillos y aderezo de la casa.',
      },
      { sourceName: 'Party Melt (Burger)', description: 'Carne de res, queso cheddar, queso suizo, tocino, cebolla caramelizada y aderezo de la casa.' },
      { sourceName: 'Jalapeño Burger (Burger)', description: 'Carne de res, queso suizo, chile jalapeno, cebolla caramelizada, tocino y aderezo jalapeno.' },
    ],
  },
  {
    name: 'Toast',
    products: [
      { sourceName: 'Avocado Panela (Toast)', description: 'Laminas de aguacate, queso panela y chile quebrado.' },
      { sourceName: 'Serrano Caprese (Toast)', description: 'Jamon serrano, tomate cherry, queso mozzarella, espinaca, vinagre balsamico.' },
      { sourceName: 'Pizza Deluxe (Toast)', description: 'Salsa de tomate, pepperoni, queso mozzarella, cebolla, pimiento y aceitunas.' },
      { sourceName: 'Avocado Scramble (Toast)', description: 'Guacamole y huevo cremoso.' },
      { sourceName: 'Mollete con Huevo (Toast)', description: 'Frijoles, queso manchego, chorizo de cerdo y 2 huevos estrellados.' },
      { sourceName: 'Serrano Parmesano (Toast)', description: 'Jamon serrano dorado, queso parmesano, huevo cremoso.' },
      { sourceName: 'Bacon Spinach (Toast)', description: 'Huevo estrellado, tocino spicy, espinacas y pico de gallo.' },
    ],
  },
  {
    name: 'Ensalada',
    products: [
      { sourceName: 'Cesar Salad (Ensalada)', description: 'Pollo a la parrilla, lechuga, queso parmesano, aderezo cesar.' },
      { sourceName: 'Goat Cheese Mango (Ensalada)', description: 'Pollo a la parrilla, queso de cabra, durazno, blueberry, lechuga, kale y aderezo spicy mango.' },
      { sourceName: 'Chicken Orange (Ensalada)', description: 'Pollo a la parrilla, lechuga, espinaca, kale, tomate cherry, cacahuate, aderezo oriental de naranja.' },
      {
        sourceName: 'Taco Salad (Ensalada)',
        description: 'Brisket, lechuga, arugula, aguacate, queso cheddar, tomate cherry, elote, jalapeno, cebolla, aceitunas, aderezo de cilantro y jalapeno, tiras de tortilla.',
      },
      { sourceName: "Buffalo Chick'n Salad (Ensalada)", description: 'Pollo buffalo, lechuga, zanahoria, pepino, col morada, elote, tomate y aderezo ranch.' },
    ],
  },
  {
    name: 'Sides',
    products: [
      { sourceName: 'French Fries (Sides)', description: 'Papas a la francesa.' },
      { sourceName: 'Camote Fries (Sides)', description: 'Camote fries.' },
      { sourceName: 'Cream Corn (Sides)', description: 'Elotes dulces con crema, queso y cilantro.' },
      { sourceName: "Mac'n Cheese (Sides)", description: 'Macarrones con queso.' },
      { sourceName: 'Smash Hashbrown (Sides)', description: 'Hashbrown crujiente de papa rallada.' },
      { sourceName: 'Special Bacon (Sides)', description: 'Tocino preparado con salsa dulce.' },
    ],
  },
  {
    name: 'Sopas',
    products: [
      {
        name: 'Sopa del mes',
        description: 'Pregunta por nuestra sopa del mes.',
        sku: 'pdf-sopa-del-mes',
      },
    ],
  },
  {
    name: 'Kids Menu',
    products: [
      { sourceName: 'Chicken n Fries (Kids)', description: 'Pollo empanizado con papas a la francesa.' },
      { sourceName: 'Mac N Chicken (Kids)', description: "Mac n' cheese con tiritas de pollo empanizado." },
      { sourceName: 'Pepperoni Toast (Kids)', description: 'Toast estilo pizza con pepperoni.' },
      { sourceName: 'Kids Burger', description: 'Hamburguesa simple.' },
      { sourceName: 'Egg Drop Kids (Kids)', description: 'Sandwich de huevo revuelto con jamon de pavo, queso cheddar.' },
      { sourceName: 'Sandwichito (Kids)', description: 'Jamon de pavo, queso cheddar y mayonesa.' },
    ],
  },
  {
    name: 'Egg Drop',
    products: [
      { sourceName: 'Simple Egg Drop (Sandwich)', description: 'Huevo cremoso, aguacate, aderezo chipotle.' },
      { sourceName: 'Ham N Cheese E.D. (Sandwich)', description: 'Huevo cremoso, jamon de pavo, queso cheddar, aderezo chipotle.' },
      { sourceName: 'Bacon Egg Drop (Sandwich)', description: 'Huevo cremoso, tocino, queso cheddar, aguacate, aderezo chipotle.' },
      { sourceName: 'Machaca Egg Drop (Sandwich)', description: 'Huevo cremoso, brisket, pico de gallo, queso manchego, aderezo jalapeno.' },
      { sourceName: 'Egg Drop Deluxe (Sandwich)', description: 'Huevo cremoso, jamon de pavo, tocino, queso suizo, tomate, espinaca, aderezo chipotle.' },
    ],
  },
  { name: 'Bowl', products: [{ sourceName: 'Acai Bowl (Bowl)', description: 'Acai con platano, fresas, frambuesas, mora azul, zarzamora, almendras y ajonjoli.' }] },
  {
    name: 'Chilaquiles',
    products: [
      { sourceName: 'Chilaquiles solos' },
      { sourceName: 'Chilaquiles con Pollo' },
      { sourceName: 'Chilaquiles con Huevo' },
      { sourceName: 'Chilaquiles con Brisket' },
    ].map((product) => ({
      ...product,
      description:
        'Salsa a elegir. Todos vienen con aguacate, queso panela, crema y cebolla morada. Acompanados de frijoles refritos.',
    })),
  },
]

export const customerMenuCopyBySourceName = new Map(
  customerMenuSections
    .flatMap((section) => section.products)
    .filter((product) => product.sourceName)
    .map((product) => [
      product.sourceName,
      {
        name: product.name,
        description: product.description,
      },
    ]),
)
