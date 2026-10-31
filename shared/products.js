// Ready-made catalog. `shape` names a procedural model in src/three/shapes.js, so every product
// has a real, rotatable 3D preview. Add `photos: ['/products/<file>.jpg']` to show real photos too.

export const CATEGORIES = [
  { id: 'home', name: 'Home and decor' },
  { id: 'desk', name: 'Desk and tech' },
  { id: 'toys', name: 'Toys and figures' },
  { id: 'maker', name: 'Maker parts' },
]

export const PRODUCTS = [
  {
    id: 'p-spiral-vase', slug: 'spiral-vase', name: 'Spiral vase', category: 'home', price: 599,
    shape: 'spiralVase', color: 'silk-gold', colors: ['silk-gold', 'white', 'black', 'blue'], material: 'pla',
    size: '110 × 110 × 200 mm', printHours: 7,
    summary: 'A twisted hexagon vase that catches light along every layer.',
    description: 'Printed in a single continuous spiral, so there are no seams. Watertight with a sealed base when ordered in PETG; use it for dried flowers in PLA.',
    tags: ['bestseller'],
  },
  {
    id: 'p-hex-planter', slug: 'hex-planter', name: 'Hex planter', category: 'home', price: 449,
    shape: 'hexPlanter', color: 'white', colors: ['white', 'grey', 'green', 'black'], material: 'petg',
    size: '120 × 104 × 95 mm', printHours: 5,
    summary: 'Six-sided planter with a drainage hole and a matching drip tray.',
    description: 'Fits a 9 cm nursery pot. PETG by default, so it handles watering without warping.',
    tags: [],
  },
  {
    id: 'p-ribbed-lamp', slug: 'ribbed-lamp-shade', name: 'Ribbed lamp shade', category: 'home', price: 899,
    shape: 'ribbedLamp', color: 'white', colors: ['white', 'silk-gold', 'orange'], material: 'pla',
    size: '160 × 160 × 180 mm', printHours: 11,
    summary: 'Wavy shade that throws soft stripes of light. Fits E27 lamp kits.',
    description: 'Use with LED bulbs only (max 9 W). The thin walls glow evenly in white and turn amber in silk gold.',
    tags: ['new'],
  },
  {
    id: 'p-phone-stand', slug: 'phone-stand', name: 'Phone stand', category: 'desk', price: 249,
    shape: 'phoneStand', color: 'black', colors: ['black', 'white', 'blue', 'orange'], material: 'pla-plus',
    size: '80 × 95 × 110 mm', printHours: 3,
    summary: 'Holds any phone upright or sideways, with a cable slot for charging.',
    description: 'A 65° viewing angle works for video calls and recipes. Rubber-free base grips well on wood and glass.',
    tags: ['bestseller'],
  },
  {
    id: 'p-headphone-stand', slug: 'headphone-stand', name: 'Headphone stand', category: 'desk', price: 699,
    shape: 'headphoneStand', color: 'black', colors: ['black', 'grey', 'white'], material: 'pla-plus',
    size: '120 × 120 × 260 mm', printHours: 9,
    summary: 'Weighted base and a wide curved top so headbands keep their shape.',
    description: 'Prints in three parts that twist-lock together. Room for a cable to wrap around the post.',
    tags: [],
  },
  {
    id: 'p-desk-tray', slug: 'desk-organiser', name: 'Desk organiser', category: 'desk', price: 549,
    shape: 'deskTray', color: 'grey', colors: ['grey', 'white', 'black', 'blue'], material: 'pla',
    size: '200 × 120 × 45 mm', printHours: 6,
    summary: 'Five compartments for pens, cards, cables and the small stuff.',
    description: 'Rounded inner corners so you can scoop out coins and SIM pins easily.',
    tags: [],
  },
  {
    id: 'p-pen-hive', slug: 'honeycomb-pen-holder', name: 'Honeycomb pen holder', category: 'desk', price: 299,
    shape: 'penHive', color: 'yellow', colors: ['yellow', 'black', 'white', 'green'], material: 'pla',
    size: '90 × 80 × 100 mm', printHours: 4,
    summary: 'Seven hexagonal cells at staggered heights.',
    description: 'Each cell holds 4–6 pens. Felt pads included for the base.',
    tags: [],
  },
  {
    id: 'p-pi-case', slug: 'raspberry-pi-case', name: 'Raspberry Pi 4/5 case', category: 'maker', price: 349,
    shape: 'piCase', color: 'black', colors: ['black', 'white', 'red'], material: 'petg',
    size: '95 × 66 × 32 mm', printHours: 4,
    summary: 'Vented snap-fit case with cut-outs for every port.',
    description: 'Mount for a 30 mm fan in the lid. PETG keeps its shape near warm boards.',
    tags: ['bestseller'],
  },
  {
    id: 'p-gear-set', slug: 'gear-set', name: 'Spur gear set', category: 'maker', price: 349,
    shape: 'gear', color: 'blue', colors: ['blue', 'black', 'white', 'orange'], material: 'pla-plus',
    size: 'Ø 70 mm, 20 teeth', printHours: 3,
    summary: 'Module 1.5 spur gears for robotics and science projects.',
    description: 'Set of 3 gears (20, 30, 40 teeth) with 5 mm bores. Ask us for custom tooth counts.',
    tags: [],
  },
  {
    id: 'p-cable-clips', slug: 'cable-clips', name: 'Cable clips (pack of 10)', category: 'maker', price: 149,
    shape: 'cableClip', color: 'white', colors: ['white', 'black', 'grey'], material: 'tpu',
    size: '24 × 20 × 12 mm each', printHours: 2,
    summary: 'Flexible TPU clips for 3–6 mm cables. Stick on with the included tape.',
    description: 'Flex enough to snap cables in and out hundreds of times without cracking.',
    tags: [],
  },
  {
    id: 'p-tobor-figure', slug: 'tobor-robot-figure', name: 'TOBOR robot figure', category: 'toys', price: 399,
    shape: 'robot', color: 'blue', colors: ['blue', 'orange', 'white', 'black'], material: 'pla',
    size: '70 × 50 × 110 mm', printHours: 5,
    summary: 'Our mascot. Posable arms, glowing amber eyes in silk gold.',
    description: 'Prints in 5 parts and snaps together without glue. Suitable for ages 6 and up.',
    tags: ['new'],
  },
  {
    id: 'p-chess-king', slug: 'chess-set', name: 'Classic chess set', category: 'toys', price: 1499,
    shape: 'chessKing', color: 'white', colors: ['white', 'black'], material: 'pla',
    size: 'King 95 mm tall', printHours: 30,
    summary: 'Full 32-piece set, weighted bases. Choose the colour of one side.',
    description: 'Pieces are hollow with a pocket for washers, so they feel weighty on the board. The other side ships in black.',
    tags: [],
  },
]

export const productBySlug = (slug) => PRODUCTS.find((p) => p.slug === slug)
export const productById = (id) => PRODUCTS.find((p) => p.id === id)
