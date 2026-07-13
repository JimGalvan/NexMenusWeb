import { PublicMenu } from '../../models/menu.model';

/**
 * Seeded storefront shown in the generator's preview device before a real
 * draft exists. Rendered through PublicMenuPageComponent so the example is
 * pixel-identical to what the generator actually produces — same restaurant
 * as the "What you enter" sample copy further down the page.
 */
export const EXAMPLE_MENU: PublicMenu = {
  id: 'example',
  name: 'Oak & Ember',
  slug: 'oak-and-ember',
  description: 'Slow smoke. California produce. Dinner worth gathering for.',
  market: 'US',
  currency: 'USD',
  phone: null,
  address: '1212 Olive Ave, Fresno, CA 93728',
  operatingHours: 'Wed–Sun · 11:00 AM – 9:00 PM',
  email: null,
  logoUrl: null,
  properties: [
    { name: 'accentColor', type: 'TEXT', value: '#37412f' },
    { name: 'cuisines', type: 'JSON', value: JSON.stringify(['Barbecue', 'Californian']) },
    {
      name: 'highlights',
      type: 'JSON',
      value: JSON.stringify(['Family-owned', 'Outdoor seating', 'Takeout']),
    },
    {
      name: 'about',
      type: 'TEXT',
      value:
        'Oak & Ember is a family-run barbecue spot in Fresno. Everything is smoked over local oak and paired with produce from Central Valley farms.',
    },
  ],
  categories: [
    { id: 'smoker', name: 'From the Smoker', position: 0 },
    { id: 'sides', name: 'Sides', position: 1 },
    { id: 'drinks', name: 'Drinks', position: 2 },
  ],
  items: [
    {
      id: 'brisket',
      categoryId: 'smoker',
      name: 'Oak-smoked brisket',
      description: 'Twelve-hour smoked beef brisket with house pickles.',
      priceAmount: '18.00',
      soldOut: false,
      position: 0,
      imageUrl: null,
    },
    {
      id: 'ribs',
      categoryId: 'smoker',
      name: 'St. Louis ribs',
      description: 'Dry-rubbed pork ribs finished over live oak.',
      priceAmount: '22.00',
      soldOut: false,
      position: 1,
      imageUrl: null,
    },
    {
      id: 'chicken',
      categoryId: 'smoker',
      name: 'Half smoked chicken',
      description: 'Brined overnight, smoked to order, with alabama white sauce.',
      priceAmount: '16.00',
      soldOut: false,
      position: 2,
      imageUrl: null,
    },
    {
      id: 'squash',
      categoryId: 'sides',
      name: 'Charred market squash',
      description: 'Seasonal squash, smoked chile, and herb vinaigrette.',
      priceAmount: '12.00',
      soldOut: false,
      position: 0,
      imageUrl: null,
    },
    {
      id: 'beans',
      categoryId: 'sides',
      name: 'Pit beans',
      description: 'Slow-cooked beans with burnt ends and molasses.',
      priceAmount: '7.00',
      soldOut: false,
      position: 1,
      imageUrl: null,
    },
    {
      id: 'slaw',
      categoryId: 'sides',
      name: 'Citrus slaw',
      description: 'Crisp cabbage with orange and toasted cumin.',
      priceAmount: '6.00',
      soldOut: false,
      position: 2,
      imageUrl: null,
    },
    {
      id: 'sweet-tea',
      categoryId: 'drinks',
      name: 'Sweet tea',
      description: 'Brewed daily, lightly sweetened.',
      priceAmount: '4.00',
      soldOut: false,
      position: 0,
      imageUrl: null,
    },
    {
      id: 'lemonade',
      categoryId: 'drinks',
      name: 'Smoked lemonade',
      description: 'Fresh lemonade with a whisper of oak smoke.',
      priceAmount: '5.00',
      soldOut: false,
      position: 1,
      imageUrl: null,
    },
  ],
  uncategorizedItems: [],
};
