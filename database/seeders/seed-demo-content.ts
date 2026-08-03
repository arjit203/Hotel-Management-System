// ============================================================================
// Demo content seeder — Hotel + Restaurant + Marriage Hall
//
//   cd backend && npx ts-node ../database/seeders/seed-demo-content.ts \
//     --email you@example.com --password yourpassword
//
// Fills every vertical with presentable photography and showcase copy so the
// site looks finished during review.
//
// ── WHY THIS TALKS TO THE API, NOT TO MONGODB ───────────────────────────────
// The obvious design is to connect with Mongoose and write documents directly.
// That version was written first and could not run: a `mongodb+srv://` URI
// needs a DNS SRV lookup, and on this network every new process gets
// `querySrv ECONNREFUSED` — even though the already-running backend, which
// connected before, works fine.
//
// So it goes through `/api/v1/admin/*` instead, reusing the backend process's
// existing database connection. Three things fall out of that, all good:
//   • no DNS lookup, no connection string, no Mongoose in this file
//   • every write passes the real Zod validation and RBAC, so the seed cannot
//     create a document the application itself would reject
//   • it doubles as a live smoke test of the admin API
//
// Requirements: the backend must be running, and you need Super Admin or
// Branch Admin credentials (a `hall_manager` can only seed the hall).
//
// ── WHAT IT TOUCHES ─────────────────────────────────────────────────────────
// REPLACES (media only — these held placeholder URLs):
//   Gallery items · Room.images · MenuItem.imageUrl · DiningArea.images
//
// ADDS ONLY WHAT IS MISSING (your own entries always survive):
//   Hall packages        — matched on slug
//   Hall showcases       — matched on showcaseType + title
//   FAQs and Offers      — added only when that owner has none at all
//   Blank hall fields    — heroImages / eventTypes / features / spaces
//
// NEVER touches, under any circumstance:
//   HotelBooking · TableReservation · HallEnquiry · User · Admin
//   Room pricing/capacity · MenuItem prices · package priceLabel
//   Any hall/hotel/restaurant name, slug, description or contact detail
//
// It uses whichever Hotel / Restaurant / Hall already exists and enriches it.
// It will not create a second one alongside yours.
//
// ── IMAGES ──────────────────────────────────────────────────────────────────
// Pexels, free for commercial use, no attribution required
// (https://www.pexels.com/license/). Served straight from images.pexels.com
// with a width transform, so nothing is uploaded to Cloudinary — swapping in
// real photographs later is just re-uploading through the admin panel, which
// overwrites these URLs.
//
// Every one of the 124 IDs below was checked to return HTTP 200 before being
// written here.
//
// ── PRICING ─────────────────────────────────────────────────────────────────
// Every hall package ships with priceLabel "On request". The owner has not set
// pricing; this script must never invent a figure. Catering carries no price
// field at all.
//
// Idempotent. Safe to run repeatedly.
// ============================================================================

import path from "path";
import dotenv from "dotenv";

// Two jobs, and the second one is not optional:
//
//  1. Picks up PORT from backend/.env so the default API URL is right even if
//     the backend isn't on 5000.
//  2. Gives this file ESM syntax. ts-node here executes a .ts file only when it
//     contains at least one import or export — with none, it treats the file as
//     a plain script and silently runs nothing at all (exit 0, no output, no
//     error). That cost an hour of "why is my database empty". Do not remove
//     these imports just because the values look unused.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/** Pexels delivery URL at a sensible width. `px(id)` reads better than the URL. */
const px = (id: number, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// The branch every property already belongs to — one estate, three verticals
// (RULES.md §11). Only used if no hall exists yet and one has to be created.
const BRANCH_ID = "64a1f9c9e1b2c3d4e5f60789";

// ============================================================================
// IMAGE SETS — every ID verified 200
// ============================================================================

const IMG = {
  hotel: {
    lobby: [2869215, 14036253, 695193, 29532567, 36354489, 29649756],
    rooms: [97083, 237371, 2736384, 2725675, 7507131, 6434592, 22469110, 8082217, 24461266, 5379062],
    classic: [271624, 271618, 164595, 262048, 338504],
    pool: [261181, 2540726, 38127493, 1714976],
    dining: [6466281],
  },
  restaurant: {
    interior: [31071253, 30479386, 10633476, 32568165, 13869876, 37532766, 12638919, 14590691, 32523798],
    veg: [29148133, 5410418, 9738980, 20422123, 2569760, 36854500, 10810650, 36388454, 35985960],
    nonVeg: [37080242, 32023378, 37058644, 36890237, 8104932],
    dessert: [1123252, 33731578, 37219215, 34596964, 18416956],
    chef: [17318176, 17086289, 36904788, 11157601, 36630804],
    drinks: [36630828, 32206893, 36189469, 34902495],
    tables: [265947, 37558714, 10319485, 17057033],
  },
  hall: {
    banquet: [33852468, 12688995, 30311728, 14646749, 33914525, 36028895, 15621210, 4717550],
    halls: [12432504, 33852450, 37240724, 16985130, 3376769, 3376765, 16985135, 36774692],
    /** The bare, undecorated room — the "before" frame of the comparison. */
    bare: 33852660,
    wedding: [33417236, 31307953, 26186201, 19613670, 32060316, 35069916, 8804917, 12584892],
    haldi: [35457633, 29984888, 32500047, 33885298, 27960941, 7153785],
    mehendi: [33469015, 32315685, 9471423, 13273850, 38259809, 37331187],
    sangeet: [20015016, 10454182, 19551686, 19594072],
    decor: [14148087, 12876507, 29040917, 36873712, 31138818, 37828118, 32866206, 47014, 15291907, 5014589, 27499319],
    corporate: [9275222, 3649407, 27263740, 20733081, 15325468],
  },
};

// ============================================================================
// HOTEL
// ============================================================================

/** Room images keyed by the category name the hotel already uses. */
const HOTEL_ROOM_IMAGES: Record<string, number[]> = {
  Deluxe: [IMG.hotel.rooms[0], IMG.hotel.rooms[1], IMG.hotel.classic[0]],
  Executive: [IMG.hotel.rooms[2], IMG.hotel.rooms[3], IMG.hotel.classic[1]],
  Luxury: [IMG.hotel.rooms[4], IMG.hotel.rooms[5], IMG.hotel.classic[2]],
  Suite: [IMG.hotel.rooms[6], IMG.hotel.rooms[7], IMG.hotel.classic[3]],
};

/** Fallback for any room whose category isn't in the map above. */
const HOTEL_ROOM_FALLBACK = [IMG.hotel.rooms[8], IMG.hotel.rooms[9], IMG.hotel.classic[4]];

const HOTEL_GALLERY: { category: string; id: number; title: string }[] = [
  { category: "Exterior", id: IMG.hotel.lobby[0], title: "Arrival lobby" },
  { category: "Exterior", id: IMG.hotel.lobby[5], title: "Entrance at dusk" },
  { category: "Interior", id: IMG.hotel.lobby[1], title: "Chandelier atrium" },
  { category: "Interior", id: IMG.hotel.lobby[2], title: "Residents' lounge" },
  { category: "Interior", id: IMG.hotel.lobby[3], title: "Reading corner" },
  { category: "Interior", id: IMG.hotel.lobby[4], title: "Evening lounge" },
  { category: "Rooms", id: IMG.hotel.rooms[0], title: "Deluxe king" },
  { category: "Rooms", id: IMG.hotel.rooms[3], title: "Executive suite" },
  { category: "Rooms", id: IMG.hotel.rooms[4], title: "Morning light" },
  { category: "Rooms", id: IMG.hotel.rooms[6], title: "Turndown service" },
  { category: "Rooms", id: IMG.hotel.rooms[7], title: "Luxury suite" },
  { category: "Pool", id: IMG.hotel.pool[0], title: "Infinity pool" },
  { category: "Pool", id: IMG.hotel.pool[1], title: "Poolside loungers" },
  { category: "Pool", id: IMG.hotel.pool[2], title: "Garden deck" },
  { category: "Pool", id: IMG.hotel.pool[3], title: "Sunset by the water" },
  { category: "Food", id: IMG.hotel.dining[0], title: "In-room breakfast" },
  { category: "Food", id: IMG.restaurant.tables[0], title: "Breakfast room" },
];

const HOTEL_FAQS = [
  {
    question: "What are the check-in and check-out times?",
    answer:
      "Check-in from 2:00 PM and check-out by 11:00 AM. Early check-in and late check-out are usually possible on request — call us the day before and we will hold the room where we can.",
  },
  {
    question: "How much do I pay when I book online?",
    answer:
      "Only the advance is charged when you book. The balance is settled at the property when you check in. Your booking is confirmed the moment the payment succeeds — there is no waiting for approval.",
  },
  {
    question: "Can I cancel my booking?",
    answer:
      "Yes. Cancel from the confirmation page or from My Bookings. Cancellations made inside the free window are refunded automatically to the original payment method; outside it, call us and we will do what we can.",
  },
  {
    question: "Do I need an account to book?",
    answer:
      "No. You can book as a guest with just your name, email and phone. Creating an account only adds the convenience of seeing all your bookings in one place.",
  },
  {
    question: "Is parking available?",
    answer: "Yes, complimentary on-site parking for resident guests, with valet assistance.",
  },
];

const HOTEL_OFFERS = [
  {
    title: "Stay Longer, Pay Less",
    description: "Book three nights or more and the third night is at half rate.",
    imageId: IMG.hotel.rooms[3],
    days: 90,
  },
  {
    title: "Weekend Escape",
    description: "Friday to Sunday stays include breakfast for two and a late 2 PM checkout.",
    imageId: IMG.hotel.pool[0],
    days: 60,
  },
];

// ============================================================================
// RESTAURANT
// ============================================================================

/** Menu item photos, matched on a keyword in the dish name. First hit wins. */
const MENU_IMAGE_RULES: { match: RegExp; id: number }[] = [
  { match: /biryani|pulao/i, id: IMG.restaurant.veg[0] },
  { match: /kebab|tikka|seekh|galouti/i, id: IMG.restaurant.nonVeg[0] },
  { match: /chicken|murgh|butter chicken/i, id: IMG.restaurant.nonVeg[1] },
  { match: /gosht|mutton|nihari|lamb/i, id: IMG.restaurant.nonVeg[3] },
  { match: /paneer/i, id: IMG.restaurant.veg[2] },
  { match: /dal|lentil/i, id: IMG.restaurant.veg[1] },
  { match: /dosa|uttapam|idli|appam/i, id: IMG.restaurant.veg[3] },
  { match: /halwa|jalebi|rabri|phirni|kheer|rasgulla|mithai|sandwich/i, id: IMG.restaurant.dessert[2] },
  { match: /cake|dessert|brownie|pastry/i, id: IMG.restaurant.dessert[1] },
  { match: /chai|coffee|juice|thandai|panna|mojito|drink|beverage/i, id: IMG.restaurant.drinks[1] },
  { match: /samosa|chaat|pakora|fritter|starter|tandoori/i, id: IMG.restaurant.veg[4] },
  { match: /aloo|subz|sabzi|vegetable|curry/i, id: IMG.restaurant.veg[6] },
  { match: /bread|naan|roti|paratha|kulcha/i, id: IMG.restaurant.veg[7] },
];

const RESTAURANT_FALLBACK_IMAGE = IMG.restaurant.veg[8];

/** Dining area photos, matched on the area name. */
const DINING_AREA_IMAGE_RULES: { match: RegExp; ids: number[] }[] = [
  { match: /family/i, ids: [IMG.restaurant.tables[3], IMG.restaurant.interior[4]] },
  { match: /private|vip|chef/i, ids: [IMG.restaurant.interior[2], IMG.restaurant.interior[5]] },
  { match: /outdoor|terrace|garden|lawn/i, ids: [IMG.restaurant.tables[3], IMG.restaurant.interior[3]] },
  { match: /main|hall|dining/i, ids: [IMG.restaurant.interior[0], IMG.restaurant.interior[1]] },
];

const DINING_AREA_FALLBACK = [IMG.restaurant.interior[6], IMG.restaurant.interior[7]];

const RESTAURANT_GALLERY: { category: string; id: number; title: string }[] = [
  { category: "Interior", id: IMG.restaurant.interior[0], title: "Main dining room" },
  { category: "Interior", id: IMG.restaurant.interior[1], title: "Banquette seating" },
  { category: "Interior", id: IMG.restaurant.interior[2], title: "Chandelier table" },
  { category: "Interior", id: IMG.restaurant.interior[5], title: "The upper room" },
  { category: "Ambience", id: IMG.restaurant.interior[3], title: "Garden corner" },
  { category: "Ambience", id: IMG.restaurant.interior[7], title: "Evening light" },
  { category: "Ambience", id: IMG.restaurant.tables[3], title: "Under the trees" },
  { category: "Bar", id: IMG.restaurant.interior[8], title: "The wine wall" },
  { category: "Bar", id: IMG.restaurant.drinks[0], title: "Bar counter" },
  { category: "Food", id: IMG.restaurant.veg[0], title: "Sadya on banana leaf" },
  { category: "Food", id: IMG.restaurant.veg[2], title: "Sharing platter" },
  { category: "Food", id: IMG.restaurant.nonVeg[0], title: "Seekh from the sigri" },
  { category: "Food", id: IMG.restaurant.nonVeg[2], title: "On the charcoal" },
  { category: "Food", id: IMG.restaurant.dessert[2], title: "Mithai counter" },
  { category: "Food", id: IMG.restaurant.dessert[0], title: "Plated desserts" },
  { category: "Events", id: IMG.restaurant.chef[0], title: "The kitchen at service" },
  { category: "Events", id: IMG.restaurant.chef[2], title: "Plating" },
  { category: "Events", id: IMG.restaurant.tables[1], title: "Set for a party" },
];

const RESTAURANT_FAQS = [
  {
    question: "Do I need to reserve a table?",
    answer:
      "Weekends and festival evenings fill up, so a reservation is worth it. Book online in under a minute — there is no charge and no deposit, and your table is confirmed immediately.",
  },
  {
    question: "Are you pure vegetarian?",
    answer:
      "No, we serve both. The vegetarian and non-vegetarian kitchen lines are entirely separate, with their own equipment and staff, and Jain preparations are available on request.",
  },
  {
    question: "Can you host a private function?",
    answer:
      "Yes. Our private and family dining areas can be reserved for a group, and for anything larger our banquet venue next door handles full celebrations.",
  },
  {
    question: "Do you take large group bookings?",
    answer:
      "Groups up to our maximum party size can book online. For anything larger, call us and we will arrange the seating and a set menu.",
  },
];

const RESTAURANT_OFFERS = [
  {
    title: "Weekday Lunch Thali",
    description: "A full vegetarian thali, Monday to Friday, noon to 3 PM.",
    imageId: IMG.restaurant.veg[0],
    days: 120,
  },
  {
    title: "Chef's Table Evenings",
    description: "A six-course tasting menu served at the pass, Thursday evenings only.",
    imageId: IMG.restaurant.chef[2],
    days: 45,
  },
];

// ============================================================================
// MARRIAGE HALL
// ============================================================================

const HALL = {
  branchId: BRANCH_ID,
  name: "7 Vachan Banquets",
  slug: "7-vachan-banquets",
  tagline: "Where your forever begins",
  description:
    "A pillarless banquet hall and open-air lawn set within the 7 Vachan estate, built for celebrations that deserve room to breathe. Twenty-two foot ceilings, imported chandeliers, a dedicated bridal suite and a service team that has hosted more than four hundred weddings. Every celebration is planned with one event manager from your first visit to the final farewell.",
  seatedCapacity: 800,
  floatingCapacity: 1200,
  spaces: [
    {
      label: "Grand Banquet Hall",
      seated: 600,
      floating: 900,
      description: "Pillarless, air-conditioned, 22ft ceilings with imported chandeliers.",
    },
    {
      label: "Emerald Lawn",
      seated: 400,
      floating: 600,
      description: "Open-air lawn with mature landscaping — ideal for Mehendi and Haldi.",
    },
    {
      label: "Terrace Pavilion",
      seated: 120,
      floating: 200,
      description: "Intimate rooftop space for engagements and sangeet evenings.",
    },
  ],
  eventTypes: [
    "Wedding", "Reception", "Engagement", "Haldi", "Mehendi",
    "Sangeet", "Birthday", "Anniversary", "Corporate Event",
  ],
  features: [
    { name: "Pillarless Hall" }, { name: "Valet Parking" }, { name: "Bridal Suite" },
    { name: "In-house Catering" }, { name: "Power Backup" }, { name: "Air Conditioned" },
    { name: "Dedicated Event Manager" }, { name: "Open-air Lawn" },
    { name: "Live Counters" }, { name: "Baraat Entry Driveway" },
  ],
  parkingCapacity: 250,
  guestRooms: 18,
  address:
    "7 Vachan Marriage Hall, Kothi Road, near Lovedale School, Bagha, Satna, Madhya Pradesh",
  contactPhone: "+91 90000 00000",
  contactEmail: "banquets@7vachan.com",
  minimumNoticeDays: 7,
  heroImages: [
    px(IMG.hall.banquet[0], 2000),
    px(IMG.hall.wedding[0], 2000),
    px(IMG.hall.banquet[2], 2000),
    px(IMG.hall.decor[0], 2000),
  ],
  metaTitle: "7 Vachan Banquets — Luxury Wedding & Banquet Venue in Satna",
  metaDescription:
    "A pillarless banquet hall and open-air lawn for up to 1200 guests. Decoration, catering and floral styling handled in-house. Enquire to schedule a visit.",
};

const HALL_PACKAGES = [
  {
    name: "Silver", slug: "silver", tagline: "An elegant start",
    description:
      "Everything a beautifully run celebration needs, without excess. Suited to intimate weddings and family functions.",
    inclusions: [
      "Grand Banquet Hall for 6 hours",
      "Classic stage decoration",
      "Standard floral entrance",
      "Buffet setup with two live counters",
      "Basic sound and lighting",
      "Valet parking",
      "Dedicated event coordinator",
    ],
    highlights: ["Up to 300 guests", "6-hour slot", "Coordinator included"],
    suitableForMinGuests: 100, suitableForMaxGuests: 300,
    displayOrder: 1, imageId: IMG.hall.halls[3],
  },
  {
    name: "Gold", slug: "gold", tagline: "The complete celebration",
    description:
      "Our most chosen package. Fuller decoration, a wider menu and the lawn included for pre-wedding functions.",
    inclusions: [
      "Grand Banquet Hall + Emerald Lawn for 8 hours",
      "Themed stage and mandap decoration",
      "Full floral entrance and pathway",
      "Extended buffet with four live counters",
      "Professional sound, lighting and DJ console",
      "Bridal suite for the day",
      "Valet parking for 150 cars",
      "Dedicated event manager",
    ],
    highlights: ["Up to 600 guests", "Lawn included", "Bridal suite"],
    suitableForMinGuests: 300, suitableForMaxGuests: 600,
    isFeatured: true, displayOrder: 2, imageId: IMG.hall.banquet[1],
  },
  {
    name: "Premium", slug: "premium", tagline: "Considered in every detail",
    description:
      "For celebrations spanning several functions, with styling and service scaled to match.",
    inclusions: [
      "All venue spaces for a full day",
      "Designer stage, mandap and ceiling installation",
      "Premium imported floral styling",
      "Multi-cuisine buffet with six live counters",
      "Concert-grade sound and architectural lighting",
      "Bridal suite plus six guest rooms",
      "Full valet and guest reception team",
      "Two event managers",
    ],
    highlights: ["Up to 900 guests", "Full-day access", "6 guest rooms"],
    suitableForMinGuests: 500, suitableForMaxGuests: 900,
    displayOrder: 3, imageId: IMG.hall.banquet[3],
  },
  {
    name: "Royal", slug: "royal", tagline: "Nothing held back",
    description:
      "A multi-day wedding hosted end to end — every space, every service, planned around your family.",
    inclusions: [
      "Exclusive multi-day use of the entire estate",
      "Bespoke set design by our creative director",
      "Imported floral installation across all spaces",
      "Bespoke menu curated with our executive chef",
      "Full production: sound, lighting, projection, pyrotechnics",
      "Bridal suite plus eighteen guest rooms",
      "Baraat reception with ceremonial entry",
      "Complete planning team from your first visit onward",
    ],
    highlights: ["Up to 1200 guests", "Multi-day estate hire", "Bespoke design"],
    suitableForMinGuests: 800, suitableForMaxGuests: 1200,
    displayOrder: 4, imageId: IMG.hall.decor[6],
  },
];

const DECORATION_THEMES = [
  {
    category: "Classic", title: "Ivory & Pearl",
    description:
      "Restrained, timeless styling in ivory, champagne and soft pearl. Drapery falls in clean lines, florals stay white and green, and the light does the rest. Photographs beautifully in every season.",
    highlights: ["Ivory drapery", "White and green florals", "Crystal chandeliers", "Candle pathways"],
    colorPalette: ["#faf7f2", "#efe2cb", "#d9be8e", "#b08d57"],
    imageIds: [IMG.hall.decor[4], IMG.hall.banquet[4], IMG.hall.decor[2]],
    withBefore: true, displayOrder: 1,
  },
  {
    category: "Royal", title: "Maharaja Court",
    description:
      "Deep jewel tones, gold leaf detailing and a raised throne stage. Heavy velvet drapes, brass urns and marigold ropes — a setting built for a grand baraat entry.",
    highlights: ["Throne stage", "Velvet and gold drapery", "Brass and marigold", "Ceremonial entry arch"],
    colorPalette: ["#7b1e3a", "#b08d57", "#1f3a2e", "#e8dccb"],
    imageIds: [IMG.hall.halls[0], IMG.hall.banquet[2], IMG.hall.wedding[2]],
    withBefore: true, isFeatured: true, displayOrder: 2,
  },
  {
    category: "Traditional", title: "Marigold & Mango Leaf",
    description:
      "The decoration our grandmothers would recognise. Marigold torans, banana stems at the entrance, brass diyas and a mandap dressed in genuine mango leaf.",
    highlights: ["Marigold torans", "Banana stem entrance", "Brass diyas", "Mango leaf mandap"],
    colorPalette: ["#e08a1e", "#c8102e", "#2e7d32", "#f2ebe0"],
    imageIds: [IMG.hall.wedding[0], IMG.hall.mehendi[5], IMG.hall.wedding[7]],
    displayOrder: 3,
  },
  {
    category: "Modern", title: "Linear Light",
    description:
      "Architectural rather than ornamental. Geometric backdrops, suspended light bars and a monochrome palette lifted by a single accent flower.",
    highlights: ["Geometric backdrop", "Suspended light bars", "Monochrome palette", "Sculptural florals"],
    colorPalette: ["#14120f", "#faf7f2", "#b08d57", "#6f6558"],
    imageIds: [IMG.hall.decor[8], IMG.hall.halls[7], IMG.hall.banquet[6]],
    displayOrder: 4,
  },
  {
    category: "Floral", title: "Garden in Bloom",
    description:
      "Flowers everywhere and unapologetically so — a ceiling canopy of hanging blooms, a floral mandap and pathways lined with fresh arrangements changed the morning of the event.",
    highlights: ["Hanging ceiling canopy", "Full floral mandap", "Fresh daily arrangements", "Petal pathways"],
    colorPalette: ["#f4c2c2", "#efe2cb", "#8ab17d", "#faf7f2"],
    imageIds: [IMG.hall.decor[0], IMG.hall.decor[5], IMG.hall.wedding[1]],
    withBefore: true, displayOrder: 5,
  },
  {
    category: "Luxury", title: "Gilded Evening",
    description:
      "Mirror-topped tables, gold charger plates and a chandelier-lit ceiling. Designed for receptions that begin at dusk and are photographed under warm light.",
    highlights: ["Mirror-top tables", "Gold charger settings", "Chandelier ceiling", "Warm uplighting"],
    colorPalette: ["#b08d57", "#14120f", "#e8dccb", "#8a6a3d"],
    imageIds: [IMG.hall.banquet[5], IMG.hall.decor[3], IMG.hall.halls[2]],
    displayOrder: 6,
  },
  {
    category: "Minimal", title: "Quiet Ceremony",
    description:
      "For families who want the room to feel calm. A single sculptural arch, unbroken drapery and one flower repeated with discipline.",
    highlights: ["Single sculptural arch", "Unbroken drapery", "One repeated bloom", "Natural light"],
    colorPalette: ["#faf7f2", "#e8dccb", "#6f6558", "#ffffff"],
    imageIds: [IMG.hall.decor[7], IMG.hall.halls[5], IMG.hall.decor[10]],
    displayOrder: 7,
  },
  {
    category: "Outdoor", title: "Lawn Under Stars",
    description:
      "The Emerald Lawn dressed for evening: canopy string lights, low seating clusters, fire pits at the edges and a stage set against the tree line.",
    highlights: ["Canopy string lights", "Low seating clusters", "Fire pits", "Tree-line stage"],
    colorPalette: ["#1f3a2e", "#d9be8e", "#14120f", "#efe2cb"],
    imageIds: [IMG.hall.decor[6], IMG.hall.wedding[1], IMG.hall.decor[0]],
    displayOrder: 8,
  },
];

const CATERING = [
  {
    category: "Veg", title: "North Indian Vegetarian",
    description:
      "Our home kitchen's core. Slow-cooked gravies, breads from a live tandoor and seasonal vegetables sourced from the morning market.",
    highlights: ["Live tandoor", "Seasonal produce", "Jain options on request", "Pure-veg kitchen line"],
    sampleItems: ["Paneer Lababdar", "Dal Saat Vachan", "Subz Dum Biryani", "Kashmiri Dum Aloo", "Assorted Tandoori Breads"],
    imageIds: [IMG.restaurant.veg[0], IMG.restaurant.veg[2], IMG.restaurant.veg[6]],
    displayOrder: 1,
  },
  {
    category: "Non-Veg", title: "Awadhi & Mughlai",
    description:
      "Kebabs from the sigri, biryani sealed and finished on dum, and curries built on stocks that start the previous evening.",
    highlights: ["Sigri kebabs", "Dum-sealed biryani", "Halal on request", "Separate kitchen line"],
    sampleItems: ["Galouti Kebab", "Murgh Malai Tikka", "Gosht Dum Biryani", "Nihari", "Butter Chicken"],
    imageIds: [IMG.restaurant.nonVeg[0], IMG.restaurant.nonVeg[1], IMG.restaurant.nonVeg[3]],
    displayOrder: 2,
  },
  {
    category: "Desserts", title: "Mithai & Plated Desserts",
    description:
      "A traditional mithai counter alongside plated desserts, so both grandparents and grandchildren find something they recognise.",
    highlights: ["Live jalebi counter", "Seasonal halwa", "Plated Western desserts", "Sugar-free options"],
    sampleItems: ["Live Jalebi with Rabri", "Gajar ka Halwa", "Malai Sandwich", "Baked Rasgulla", "Kesar Phirni"],
    imageIds: [IMG.restaurant.dessert[2], IMG.restaurant.dessert[0], IMG.restaurant.dessert[3]],
    displayOrder: 3,
  },
  {
    category: "Live Counters", title: "Chef-attended Counters",
    description:
      "Cooked in front of your guests. Counters are chosen with you and staffed by our own chefs, not agency hands.",
    highlights: ["Chaat counter", "Pasta and risotto", "Dosa and appam", "Grill and barbecue", "Pan and mouth freshener"],
    sampleItems: ["Chaat Counter", "Live Pasta", "South Indian Dosa", "Charcoal Grill", "Chinese Wok", "Paan Counter"],
    imageIds: [IMG.restaurant.chef[0], IMG.restaurant.chef[2], IMG.restaurant.chef[4]],
    isFeatured: true, displayOrder: 4,
  },
  {
    category: "Beverages", title: "Welcome Drinks & Mocktails",
    description:
      "A welcome drink station at the entrance and a mocktail bar through the evening, both adjusted to the season.",
    highlights: ["Seasonal welcome drinks", "Mocktail bar", "Filter coffee and masala chai", "Fresh juice station"],
    sampleItems: ["Aam Panna", "Kesar Thandai", "Virgin Mojito", "Masala Chai", "Cold-pressed Juices"],
    imageIds: [IMG.restaurant.drinks[0], IMG.restaurant.drinks[1], IMG.restaurant.drinks[2]],
    displayOrder: 5,
  },
];

const DINING = [
  {
    category: "Buffet", title: "Grand Buffet Service",
    description:
      "Long buffet lines with heated service stations, arranged so two hundred guests can be served without a queue forming.",
    highlights: ["Dual-sided service lines", "Heated stations", "Dedicated service staff", "Separate veg and non-veg lines"],
    imageIds: [IMG.restaurant.veg[0], IMG.restaurant.chef[3]],
    displayOrder: 1,
  },
  {
    category: "Round Tables", title: "Seated Round Tables",
    description:
      "Ten-seat round tables with full linen, charger plates and a floral centrepiece — for receptions where guests stay seated.",
    highlights: ["Ten-seat rounds", "Full linen service", "Charger plates", "Floral centrepieces"],
    imageIds: [IMG.hall.halls[3], IMG.hall.halls[4], IMG.restaurant.tables[1]],
    displayOrder: 2,
  },
  {
    category: "VIP Dining", title: "Private VIP Enclosure",
    description:
      "A screened enclosure beside the main hall for immediate family and honoured guests, with its own service team.",
    highlights: ["Screened enclosure", "Dedicated servers", "Bespoke menu", "Private entrance"],
    imageIds: [IMG.restaurant.interior[2], IMG.hall.decor[3]],
    isFeatured: true, displayOrder: 3,
  },
  {
    category: "Family Dining", title: "Family Seating",
    description:
      "Larger tables set slightly apart, with high chairs and space for elders — so families eat together rather than in shifts.",
    highlights: ["Extended tables", "High chairs", "Step-free access", "Quieter corner placement"],
    imageIds: [IMG.restaurant.tables[3], IMG.restaurant.interior[4]],
    displayOrder: 4,
  },
  {
    category: "Live Counters", title: "Counter Dining",
    description:
      "Standing counters placed through the lawn so guests can graze between functions without sitting down to a full meal.",
    highlights: ["Standing counters", "Distributed through the lawn", "Continuous service", "Chef-attended"],
    imageIds: [IMG.restaurant.chef[1], IMG.restaurant.chef[4]],
    displayOrder: 5,
  },
  {
    category: "Premium Serving", title: "Silver Service",
    description:
      "Plated, served to the table by uniformed staff at a set pace. Reserved for smaller seated dinners where the meal is the event.",
    highlights: ["Plated at the pass", "Uniformed service team", "Coursed timing", "Sommelier-style guidance"],
    imageIds: [IMG.restaurant.chef[2], IMG.restaurant.tables[0]],
    displayOrder: 6,
  },
];

const FLORAL = [
  {
    category: "Entrance", title: "Entrance Arch & Pathway",
    description:
      "The first thing your guests walk through. A full arch over the driveway and a petal-lined pathway to the hall doors.",
    highlights: ["Full driveway arch", "Petal pathway", "Welcome urns", "Fresh daily"],
    imageIds: [IMG.hall.decor[0], IMG.hall.decor[4]],
    displayOrder: 1,
  },
  {
    category: "Stage", title: "Stage & Backdrop",
    description:
      "The most photographed six square metres of the evening. Built as a full floral wall or a sculpted asymmetric arrangement.",
    highlights: ["Floral wall or sculpted arch", "Depth lighting", "Seating for the couple", "Photography-tested"],
    imageIds: [IMG.hall.wedding[1], IMG.hall.halls[0]],
    isFeatured: true, displayOrder: 2,
  },
  {
    category: "Mandap", title: "Mandap Styling",
    description:
      "Four-pillar mandap dressed to your family's tradition — genuine mango leaf and marigold, or imported blooms, or both.",
    highlights: ["Four-pillar structure", "Mango leaf and marigold", "Imported bloom option", "Pandit-approved layout"],
    imageIds: [IMG.hall.wedding[0], IMG.hall.wedding[2]],
    displayOrder: 3,
  },
  {
    category: "Table", title: "Table Arrangements",
    description:
      "Low centrepieces that guests can see over, changed in scale between the ceremony and the reception.",
    highlights: ["Low sightline centrepieces", "Coordinated with linen", "Scaled per table size", "Candle pairing"],
    imageIds: [IMG.hall.decor[2], IMG.hall.decor[1], IMG.hall.decor[3]],
    displayOrder: 4,
  },
  {
    category: "Ceiling", title: "Ceiling Installation",
    description:
      "Hanging canopies and suspended arrangements that use the hall's twenty-two foot height instead of ignoring it.",
    highlights: ["Hanging canopy", "Suspended arrangements", "Uses full ceiling height", "Rigged safely to structure"],
    imageIds: [IMG.hall.banquet[3], IMG.hall.banquet[4]],
    displayOrder: 5,
  },
  {
    category: "Lighting", title: "Floral Lighting",
    description:
      "Warm uplighting through the arrangements and pin-spots on the stage, so the flowers still read after sunset.",
    highlights: ["Warm uplighting", "Stage pin-spots", "Candle pathways", "Sunset-to-night transition"],
    imageIds: [IMG.hall.decor[0], IMG.hall.decor[6]],
    displayOrder: 6,
  },
];

const HALL_GALLERY: { category: string; id: number; title: string }[] = [
  ...IMG.hall.wedding.slice(0, 4).map((id, i) => ({
    category: "Wedding",
    id,
    title: ["Mandap at golden hour", "Reception in bloom", "The bride", "The pheras"][i],
  })),
  ...IMG.hall.banquet.slice(0, 4).map((id, i) => ({
    category: "Reception",
    id,
    title: ["Reception hall", "Chandelier ceiling", "Ballroom at dusk", "Table settings"][i],
  })),
  { category: "Engagement", id: IMG.hall.wedding[4], title: "Ring ceremony" },
  { category: "Engagement", id: IMG.hall.wedding[5], title: "Terrace pavilion" },
  ...IMG.hall.haldi.slice(0, 3).map((id, i) => ({
    category: "Haldi",
    id,
    title: ["Haldi on the lawn", "Turmeric and marigold", "The ceremony"][i],
  })),
  ...IMG.hall.mehendi.slice(0, 3).map((id, i) => ({
    category: "Mehendi",
    id,
    title: ["Mehendi corner", "Henna detail", "The artist at work"][i],
  })),
  ...IMG.hall.sangeet.slice(0, 3).map((id, i) => ({
    category: "Sangeet",
    id,
    title: ["Sangeet evening", "The dance floor", "Petals and celebration"][i],
  })),
  { category: "Birthday", id: IMG.hall.decor[1], title: "Birthday table" },
  { category: "Birthday", id: IMG.hall.decor[8], title: "Neon and blooms" },
  ...IMG.hall.corporate.slice(0, 3).map((id, i) => ({
    category: "Corporate",
    id,
    title: ["Conference layout", "Awards evening", "Theatre seating"][i],
  })),
  ...IMG.hall.decor.slice(0, 4).map((id, i) => ({
    category: "Decoration",
    id,
    title: ["Illuminated floral arch", "Warm table styling", "Candles and white flowers", "Dining under candlelight"][i],
  })),
  ...IMG.hall.halls.slice(0, 4).map((id, i) => ({
    category: "Venue",
    id,
    title: ["Grand Banquet Hall", "The main hall", "Round table layout", "Aerial view"][i],
  })),
  { category: "Venue", id: IMG.hall.bare, title: "The hall before styling" },
];

const HALL_FAQS = [
  {
    question: "How do I book a date?",
    answer:
      "Submit an enquiry with your preferred date and we will call you within one working day. Your date is not held at that point — we hold it only once we have spoken and confirmed the arrangements with you. Nothing is charged online.",
  },
  {
    question: "How many guests can the venue hold?",
    answer:
      "Up to 800 seated and 1200 floating across all three spaces. The Grand Banquet Hall seats 600, the Emerald Lawn 400 and the Terrace Pavilion 120. Spaces can be combined.",
  },
  {
    question: "Can we bring our own caterer or decorator?",
    answer:
      "Catering and decoration are handled in-house — it is how we keep quality and timing under our own control. If you have a family caterer you would like to involve, speak to our event manager; we accommodate this case by case.",
  },
  {
    question: "What does it cost?",
    answer:
      "We quote each celebration individually, because the cost depends on the spaces you use, your guest count, the decoration you choose and how many functions you are hosting. You will have a full written quotation after one conversation, and no payment is taken until you are ready.",
  },
  {
    question: "Is parking available?",
    answer: "Yes. On-site parking for 250 cars with valet service included in every package.",
  },
  {
    question: "Do you have rooms for outstation guests?",
    answer:
      "Eighteen guest rooms are available on the estate, plus the bridal suite. Rooms are allocated by package — the Premium tier includes six and Royal includes all eighteen.",
  },
  {
    question: "How far in advance should we enquire?",
    answer:
      "We ask for at least a week's notice, but wedding season dates are usually taken six to nine months ahead. If your date is close, call us directly rather than waiting on the form.",
  },
];

const HALL_OFFERS = [
  {
    title: "Off-Season Wedding",
    description:
      "Weddings held between July and September include the Emerald Lawn at no extra charge.",
    imageId: IMG.hall.wedding[1],
    days: 150,
  },
  {
    title: "Book Two Functions",
    description:
      "Hold your Mehendi and Sangeet with us alongside the wedding and the terrace hire is complimentary.",
    imageId: IMG.hall.mehendi[0],
    days: 120,
  },
];

// ============================================================================
// HTTP LAYER
// ============================================================================

const API =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  `http://localhost:${process.env.PORT || 5000}/api/v1`;

/** Reads `--name value` or `--name=value` from argv. */
function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : undefined;
}

let TOKEN = "";

async function call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      `Cannot reach the API at ${API}. Start the backend first:  npm run dev:backend`
    );
  }

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok || json?.success === false) {
    // Surface Zod's per-field errors — "description: String must contain at
    // least 10 character(s)" is actionable, "Validation failed" is not.
    const detail = json?.errors?.length
      ? json.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ")
      : json?.message || `HTTP ${res.status}`;
    throw new Error(`${method} ${path} → ${detail}`);
  }

  return json.data as T;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Runs a batch of writes, counting failures instead of aborting the whole run. */
async function batch(label: string, tasks: (() => Promise<unknown>)[]): Promise<number> {
  let done = 0;
  for (const task of tasks) {
    try {
      await task();
      done += 1;
    } catch (err: any) {
      console.log(`      ! ${label}: ${err.message}`);
    }
  }
  return done;
}

// ============================================================================
// SHARED CONTENT HELPERS
// ============================================================================

/** Replaces this owner's gallery. Media only — these held placeholder URLs. */
async function seedGallery(
  base: string,
  ownerId: string,
  existing: { _id: string }[],
  entries: { category: string; id: number; title: string }[]
) {
  await batch(
    "gallery delete",
    existing.map((g) => () => call("DELETE", `${base}/gallery/${g._id}`))
  );

  const added = await batch(
    "gallery add",
    entries.map((g, i) => () =>
      call("POST", `${base}/${ownerId}/gallery`, {
        imageUrl: px(g.id),
        category: g.category,
        title: g.title,
        displayOrder: i,
      })
    )
  );
  return added;
}

/** Adds FAQs only when the owner has none — hand-written ones are never lost. */
async function seedFaqs(
  base: string,
  ownerId: string,
  existingCount: number,
  faqs: { question: string; answer: string }[]
) {
  if (existingCount > 0) return 0;
  return batch(
    "faq",
    faqs.map((f, i) => () =>
      call("POST", `${base}/${ownerId}/faqs`, { ...f, displayOrder: i })
    )
  );
}

/** Adds offers only when the owner has none. Same reasoning as FAQs. */
async function seedOffers(
  base: string,
  ownerId: string,
  existingCount: number,
  offers: { title: string; description: string; imageId: number; days: number }[]
) {
  if (existingCount > 0) return 0;
  return batch(
    "offer",
    offers.map((o) => () =>
      call("POST", `${base}/${ownerId}/offers`, {
        title: o.title,
        description: o.description,
        imageUrl: px(o.imageId),
        validFrom: new Date().toISOString(),
        validTo: daysFromNow(o.days),
      })
    )
  );
}

// ============================================================================
// RUNNER
// ============================================================================

async function run() {
  const email = arg("email") || process.env.ADMIN_EMAIL;
  const password = arg("password") || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Admin credentials are required — the seed writes through the admin API.\n\n" +
        "  cd backend && npx ts-node ../database/seeders/seed-demo-content.ts \\\n" +
        "    --email you@example.com --password yourpassword\n\n" +
        "Use the same login as the admin panel. Or set ADMIN_EMAIL / ADMIN_PASSWORD.\n"
    );
    process.exit(1);
  }

  console.log(`→ ${API}\n`);

  const auth = await call<{ token: string; admin: { name: string; role: string } }>(
    "POST",
    "/auth/admin/login",
    { email, password }
  );
  TOKEN = auth.token;
  console.log(`✅ Signed in as ${auth.admin.name} (${auth.admin.role})\n`);

  if (auth.admin.role !== "super_admin") {
    console.log(
      `ℹ  ${auth.admin.role} can only write its own vertical — the others will 403.\n` +
        "   Sign in as a Super Admin to seed everything in one run.\n"
    );
  }

  // ---------------------------------------------------------------- HOTEL
  const hotels = await call<any[]>("GET", "/hotels");
  if (hotels.length === 0) {
    console.log("⏭  HOTEL — none found, skipped.");
  } else {
    const hotel = hotels[0];
    const agg = await call<any>("GET", `/hotels/${hotel.slug}`);
    console.log(`🏨 HOTEL — ${hotel.name}`);

    // Media only. Name, price, capacity and every booking are untouched:
    // updateRoomSchema is a partial, so sending `images` alone changes nothing else.
    const rooms = await batch(
      "room",
      (agg.rooms || []).map((room: any) => () => {
        const ids = HOTEL_ROOM_IMAGES[room.categoryName] || HOTEL_ROOM_FALLBACK;
        return call("PUT", `/admin/hotels/rooms/${room._id}`, { images: ids.map((i) => px(i)) });
      })
    );
    console.log(`   rooms re-imaged  ${rooms}`);
    console.log(
      `   gallery          ${await seedGallery("/admin/hotels", hotel._id, agg.gallery || [], HOTEL_GALLERY)}`
    );
    console.log(
      `   faqs added       ${await seedFaqs("/admin/hotels", hotel._id, (agg.faqs || []).length, HOTEL_FAQS)}`
    );
    console.log(
      `   offers added     ${await seedOffers("/admin/hotels", hotel._id, (agg.offers || []).length, HOTEL_OFFERS)}`
    );
  }

  // ----------------------------------------------------------- RESTAURANT
  const restaurants = await call<any[]>("GET", "/restaurants");
  if (restaurants.length === 0) {
    console.log("\n⏭  RESTAURANT — none found, skipped.");
  } else {
    const restaurant = restaurants[0];
    const agg = await call<any>("GET", `/restaurants/${restaurant.slug}`);
    console.log(`\n🍽  RESTAURANT — ${restaurant.name}`);

    if (!restaurant.images || restaurant.images.length === 0) {
      await call("PUT", `/admin/restaurants/${restaurant._id}`, {
        images: IMG.restaurant.interior.slice(0, 4).map((i) => px(i, 2000)),
      });
      console.log("   hero images      4");
    }

    const dishes = await batch(
      "dish",
      (agg.menuItems || []).map((item: any) => () => {
        const rule = MENU_IMAGE_RULES.find((r) => r.match.test(String(item.name)));
        const id = rule ? rule.id : RESTAURANT_FALLBACK_IMAGE;
        return call("PUT", `/admin/restaurants/menu/items/${item._id}`, {
          imageUrl: px(id, 1200),
        });
      })
    );
    console.log(`   dishes re-imaged ${dishes}`);

    const areas = await batch(
      "dining area",
      (agg.diningAreas || []).map((area: any) => () => {
        const rule = DINING_AREA_IMAGE_RULES.find((r) => r.match.test(String(area.name)));
        const ids = rule ? rule.ids : DINING_AREA_FALLBACK;
        return call("PUT", `/admin/restaurants/dining-areas/${area._id}`, {
          images: ids.map((i) => px(i)),
        });
      })
    );
    console.log(`   areas re-imaged  ${areas}`);
    console.log(
      `   gallery          ${await seedGallery("/admin/restaurants", restaurant._id, agg.gallery || [], RESTAURANT_GALLERY)}`
    );
    console.log(
      `   faqs added       ${await seedFaqs("/admin/restaurants", restaurant._id, (agg.faqs || []).length, RESTAURANT_FAQS)}`
    );
    console.log(
      `   offers added     ${await seedOffers("/admin/restaurants", restaurant._id, (agg.offers || []).length, RESTAURANT_OFFERS)}`
    );
  }

  // -------------------------------------------------------- MARRIAGE HALL
  //
  // Uses whichever hall already exists rather than creating one by slug.
  //
  // An earlier version upserted on `slug: "7-vachan-banquets"`, which would
  // have created a SECOND hall next to any the owner had already made in the
  // admin panel — and since `getTheHall()` takes the first row of a list sorted
  // newest-first, the seeded one would then have hidden theirs on the public
  // site. Enriching the existing record is safer and matches what the hotel and
  // restaurant branches above already do.
  const halls = await call<any[]>("GET", "/halls");
  let hallId: string;
  let hallSlug: string;

  if (halls.length > 0) {
    hallId = halls[0]._id;
    hallSlug = halls[0].slug;
    console.log(`\n💒 MARRIAGE HALL — ${halls[0].name} (existing, enriching)`);

    // Only fill what is genuinely empty. Name, slug, description, capacity and
    // contact details are the owner's own words and stay exactly as typed.
    const h = halls[0];
    const fill: Record<string, unknown> = {};
    if (!h.heroImages?.length) fill.heroImages = HALL.heroImages;
    if (!h.eventTypes?.length) fill.eventTypes = HALL.eventTypes;
    if (!h.features?.length) fill.features = HALL.features;
    if (!h.spaces?.length) fill.spaces = HALL.spaces;

    if (Object.keys(fill).length > 0) {
      await call("PUT", `/admin/halls/${hallId}`, fill);
      console.log(`   filled blanks    ${Object.keys(fill).join(", ")}`);
    } else {
      console.log("   filled blanks    none — every field already set");
    }
  } else {
    const created = await call<any>("POST", "/admin/halls", { ...HALL, branchId: BRANCH_ID });
    hallId = created._id;
    hallSlug = created.slug;
    console.log(`\n💒 MARRIAGE HALL — ${HALL.name} (created)`);
  }

  const hallAgg = await call<any>("GET", `/halls/${hallSlug}`);

  // ---- Packages: add what's missing, keep anything already there.
  const existingSlugs = new Set((hallAgg.packages || []).map((p: any) => String(p.slug)));
  const newPackages = HALL_PACKAGES.filter((p) => !existingSlugs.has(p.slug));

  const packagesAdded = await batch(
    "package",
    newPackages.map((p: any) => () =>
      call("POST", `/admin/halls/${hallId}/packages`, {
        name: p.name,
        slug: p.slug,
        tagline: p.tagline,
        description: p.description,
        inclusions: p.inclusions,
        highlights: p.highlights,
        // Free text, never a number. The owner has not published pricing.
        priceLabel: "On request",
        suitableForMinGuests: p.suitableForMinGuests,
        suitableForMaxGuests: p.suitableForMaxGuests,
        imageUrl: px(p.imageId),
        isFeatured: p.isFeatured ?? false,
        displayOrder: p.displayOrder,
      })
    )
  );
  console.log(`   packages         +${packagesAdded} added, ${existingSlugs.size} kept`);

  // ---- Showcases: same rule, matched on (type + title).
  const showcaseRows = [
    ...DECORATION_THEMES.map((s: any) => ({ ...s, showcaseType: "decoration" })),
    ...CATERING.map((s: any) => ({ ...s, showcaseType: "catering" })),
    ...DINING.map((s: any) => ({ ...s, showcaseType: "dining" })),
    ...FLORAL.map((s: any) => ({ ...s, showcaseType: "floral" })),
  ];

  const existingKeys = new Set(
    [
      ...(hallAgg.decorationThemes?.entries || []),
      ...(hallAgg.catering?.entries || []),
      ...(hallAgg.dining?.entries || []),
      ...(hallAgg.floral?.entries || []),
    ].map((s: any) => `${s.showcaseType}::${s.title}`)
  );

  const newShowcases = showcaseRows.filter(
    (s) => !existingKeys.has(`${s.showcaseType}::${s.title}`)
  );

  const showcasesAdded = await batch(
    "showcase",
    newShowcases.map((s: any) => () =>
      call("POST", `/admin/halls/${hallId}/showcase`, {
        showcaseType: s.showcaseType,
        category: s.category,
        title: s.title,
        description: s.description,
        images: (s.imageIds || []).map((i: number) => px(i)),
        highlights: s.highlights ?? [],
        colorPalette: s.colorPalette ?? [],
        sampleItems: s.sampleItems ?? [],
        // Only decoration themes get a before/after. The bare-hall frame is the
        // same photograph for all of them, which is exactly right — it IS the
        // same room.
        ...(s.withBefore ? { beforeImageUrl: px(IMG.hall.bare) } : {}),
        isFeatured: s.isFeatured ?? false,
        displayOrder: s.displayOrder,
      })
    )
  );
  console.log(`   showcases        +${showcasesAdded} added, ${existingKeys.size} kept`);

  console.log(
    `   gallery          ${await seedGallery("/admin/halls", hallId, hallAgg.gallery || [], HALL_GALLERY)}`
  );
  console.log(
    `   faqs added       ${await seedFaqs("/admin/halls", hallId, (hallAgg.faqs || []).length, HALL_FAQS)}`
  );
  console.log(
    `   offers added     ${await seedOffers("/admin/halls", hallId, (hallAgg.offers || []).length, HALL_OFFERS)}`
  );

  console.log("\n✅ Done.");
  console.log("   Public:  /  ·  /hotel  ·  /restaurant  ·  /marriage-hall");
  console.log("   Hard-refresh the browser — pages cache content for 60-120s.");
  console.log("\n   Images are Pexels demo photography. Replace them by uploading your");
  console.log("   own through the admin panel; that overwrites these URLs and nothing");
  console.log("   here needs editing again.");
  console.log("   No booking, reservation, enquiry or user record was touched.");
}

run().catch((err) => {
  console.error(`\n❌ Seed failed: ${err.message}`);

  if (String(err.message).includes("/auth/admin/login")) {
    console.error(
      "\n   That is a login failure, not a data problem. Use the same email and\n" +
        "   password you use for the admin panel at :3001. Note the login route is\n" +
        "   rate-limited to 20 attempts per 15 minutes.\n"
    );
  }

  // `process.exitCode` rather than `process.exit()`: forcing an exit while an
  // undici socket is still closing trips a libuv assertion on Windows
  // ("!(handle->flags & UV_HANDLE_CLOSING)"), which looks like a crash on top
  // of whatever real error just printed. Setting the code lets Node drain and
  // exit on its own.
  process.exitCode = 1;
});
