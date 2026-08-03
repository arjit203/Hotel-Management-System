import type { SettingCategory } from "./models/setting.model";

/**
 * The shape of every settings category, plus the value a fresh install starts
 * with.
 *
 * ── Why defaults live here and not in the database ──
 * A brand-new install has no `Setting` documents at all, and the public site
 * still has to render. Reads merge the stored document over these defaults, so
 * a missing category returns working copy rather than an empty object, and a
 * field added to this file appears in the admin panel immediately without a
 * migration. It also means "reset to default" is a delete, not a data entry job.
 *
 * ── The three-way split people ask about ──
 * The owner's brief listed "Payment Settings", "Email & Notification Settings"
 * and "Integrations" as separate categories, and they are — but along a
 * different seam than the names suggest:
 *   payment       → business policy (advance %, cancellation window, currency)
 *   email         → who gets notified and about what
 *   integrations  → the actual credentials for Razorpay, SMTP, Cloudinary, Maps
 * Splitting by policy-vs-credential rather than by vendor keeps every secret in
 * one category, which is what makes `PUBLIC_SETTING_CATEGORIES` safe to reason
 * about: two of these three are admin-only, and the third holds no secrets.
 */

/** Keys whose values are encrypted at rest and never returned in plaintext. */
export const SECRET_KEYS: Partial<Record<SettingCategory, string[]>> = {
  integrations: [
    "razorpayKeySecret",
    "smtpPassword",
    "cloudinaryApiSecret",
    "googleMapsApiKey",
    "analyticsApiSecret",
  ],
};

/**
 * Integration keys that are mirrored into `process.env` when saved.
 *
 * `razorpay.util.ts`, `config/cloudinary.ts` and `email.util.ts` all read
 * `process.env` **lazily, at call time** rather than at import time (each says
 * so in its own header, because `dotenv.config()` runs after imports resolve).
 * That existing decision is what lets settings take effect without touching any
 * of those files: the settings service writes the resolved value into
 * `process.env` on boot and after every save, and the next call picks it up.
 *
 * Anything left blank in the database is not written, so `.env` remains the
 * fallback and a half-filled Settings page cannot take payments offline.
 */
export const ENV_MIRROR: Record<string, string> = {
  razorpayKeyId: "RAZORPAY_KEY_ID",
  razorpayKeySecret: "RAZORPAY_KEY_SECRET",
  smtpHost: "SMTP_HOST",
  smtpPort: "SMTP_PORT",
  smtpUser: "SMTP_USER",
  smtpPassword: "SMTP_PASS",
  emailFrom: "EMAIL_FROM",
  cloudinaryCloudName: "CLOUDINARY_CLOUD_NAME",
  cloudinaryApiKey: "CLOUDINARY_API_KEY",
  cloudinaryApiSecret: "CLOUDINARY_API_SECRET",
};

export const SETTING_DEFAULTS: Record<SettingCategory, Record<string, unknown>> = {
  // ------------------------------------------------------------------ general
  general: {
    siteName: "7 Vachan",
    tagline: "Hotel · Restaurant · Banquets",
    shortDescription:
      "One estate for staying, dining and celebrating — run by a single team, under one roof.",
    defaultLanguage: "en",
    timezone: "Asia/Kolkata",
    currency: "INR",
    currencySymbol: "₹",
    dateFormat: "DD MMM YYYY",
  },

  // ----------------------------------------------------------------- business
  business: {
    legalName: "7 Vachan Hospitality",
    gstin: "",
    registrationNumber: "",
    foundedYear: "",
    ownerName: "",
    /** Shown on invoices and the legal pages; not the same as the visitor-facing address. */
    registeredAddress: "",
  },

  // ----------------------------------------------------------------- branding
  branding: {
    logoUrl: "",
    logoDarkUrl: "",
    faviconUrl: "",
    /** Fullscreen hero media for the home page. A video URL wins over the image. */
    heroImageUrl: "",
    heroVideoUrl: "",
    ogImageUrl: "",
  },

  // ------------------------------------------------------------------ contact
  contact: {
    phonePrimary: "",
    phoneSecondary: "",
    whatsapp: "",
    email: "",
    reservationsEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    mapEmbedUrl: "",
    latitude: "",
    longitude: "",
    /** Free text, e.g. "Reception open 24 hours". */
    openingHours: "",
  },

  // ------------------------------------------------------------------- social
  social: {
    facebook: "",
    instagram: "",
    youtube: "",
    x: "",
    linkedin: "",
    pinterest: "",
    tripadvisor: "",
    googleBusiness: "",
  },

  // ----------------------------------------------------------------- homepage
  //
  // This is the category the owner asked for by name: the home page's fixed
  // copy — including the "Considered comforts" facilities band — used to be
  // hardcoded in `frontend/src/components/sections/*`, so changing a single
  // word meant a deploy.
  //
  // `amenities` is empty by default and the page falls back to the hotel's own
  // amenity list when it is, which is exactly what it rendered before. Adding
  // even one entry here takes over, so the band can show facilities drawn from
  // all three verticals instead of the hotel's alone.
  homepage: {
    // ── These defaults are the copy the page rendered before it was made
    // editable, word for word. That is the contract: an install that never
    // opens Settings must look exactly as it did, so a default is a
    // transcription, not an improvement. ──
    heroEyebrow: "Hotel · Restaurant · Banquets",
    heroTitle: "7 Vachan",
    heroSubtitle:
      "One address for the night you stay, the meal you remember and the day you'll never forget.",
    heroCtaLabel: "Book Your Stay",
    heroCtaHref: "/hotel/booking",
    heroSecondaryCtaLabel: "Explore the estate",
    heroSecondaryCtaHref: "#estate",

    aboutEyebrow: "The estate",
    aboutTitle: "Three houses, one address",
    aboutBody:
      "A hotel, a restaurant and a banquet hall sharing one kitchen, one team and one set of grounds. Whatever you have come for, nobody has to leave to find the rest of it.",

    valuePropsEyebrow: "Why 7 Vachan",
    valuePropsTitle: "Three businesses, one standard",
    /**
     * `icon` is a name resolved through the frontend's icon registry, not a
     * component — a settings document has to survive JSON serialisation, and an
     * unknown name degrades to a sensible default rather than crashing a
     * server component.
     */
    valuePoints: [
      {
        icon: "MapPin",
        title: "Everything On One Estate",
        desc: "Stay, dine and celebrate without anyone leaving the grounds — the wedding party sleeps upstairs from the hall.",
      },
      {
        icon: "ChefHat",
        title: "One Kitchen, Every Table",
        desc: "The same chefs cook your room-service breakfast, your table at the restaurant and your wedding banquet. Never outsourced.",
      },
      {
        icon: "HeartHandshake",
        title: "One Team, Start To Finish",
        desc: "A single manager owns your booking — the room, the dinner, the function — so nothing is explained twice.",
      },
      {
        icon: "Clock",
        title: "Round-the-Clock Service",
        desc: "Reception never closes, and someone senior is always on the property. At 2am as much as at 2pm.",
      },
    ],

    amenitiesEyebrow: "Facilities",
    amenitiesTitle: "Considered comforts",
    amenitiesCtaLabel: "Explore All Amenities",
    amenitiesCtaHref: "/hotel/amenities",
    /** Empty → fall back to the hotel's amenities, matching the previous page. */
    amenities: [] as { name: string; icon?: string }[],

    galleryEyebrow: "The estate in pictures",
    galleryTitle: "A look around",
    // Gallery and testimonial headings live inside their own components today;
    // these are here so the CMS can take them over without another migration.
    offersEyebrow: "Across the estate",
    offersTitle: "What's on right now",
    testimonialsEyebrow: "In their words",
    testimonialsTitle: "What guests tell us",

    showVerticals: true,
    showGallery: true,
    showOffers: true,
    showTestimonials: true,
    showMap: true,
  },

  // -------------------------------------------------------------------- theme
  theme: {
    /** Public-site palette. Kept as hex so the frontend can inject CSS variables. */
    primaryColor: "#C9A227",
    inkColor: "#141210",
    creamColor: "#F7F3EC",
    displayFont: "Cormorant Garamond",
    bodyFont: "Jost",
    roundedCorners: "luxe",
    /** Honoured alongside the visitor's own prefers-reduced-motion setting. */
    enableAnimations: true,
    stickyHeader: true,
  },

  // ------------------------------------------------------------------ booking
  booking: {
    hotelEnabled: true,
    hotelAdvancePercent: 20,
    hotelMinNights: 1,
    hotelMaxNights: 30,
    hotelCheckInTime: "14:00",
    hotelCheckOutTime: "11:00",
    cancellationFreeWindowHours: 24,

    restaurantEnabled: true,
    restaurantMaxPartySize: 20,
    restaurantSlotMinutes: 90,
    restaurantAdvanceDays: 60,

    /**
     * Hall stays approval-first per RULES.md §14 — there is no "instant booking"
     * toggle here on purpose, and adding one would contradict a frozen rule.
     */
    hallEnquiriesEnabled: true,
    hallAdvanceDays: 540,
    hallRequiresApproval: true,
  },

  // ------------------------------------------------------------------ payment
  payment: {
    gateway: "razorpay",
    liveMode: false,
    currency: "INR",
    /** Displayed to the guest before paying; does not change gateway behaviour. */
    acceptedMethods: ["upi", "card", "netbanking", "wallet"],
    refundPolicyNote:
      "Cancellations inside the free window are refunded to the original payment method within 5–7 working days.",
    invoicePrefix: "7V",
  },

  // -------------------------------------------------------------------- email
  email: {
    fromName: "7 Vachan",
    adminNotificationEmail: "",
    ccOnBooking: "",
    sendBookingConfirmation: true,
    sendCancellationEmail: true,
    sendEnquiryAcknowledgement: true,
    sendReviewNotification: true,
    signature: "— The 7 Vachan team",
  },

  // ---------------------------------------------------------------------- seo
  seo: {
    defaultTitle: "7 Vachan — Hotel, Restaurant & Banquets",
    titleTemplate: "%s · 7 Vachan",
    defaultDescription:
      "Stay, dine and celebrate on one estate. Rooms, a full-service restaurant and a banquet hall under one roof.",
    keywords: "",
    canonicalUrl: "",
    robotsIndex: true,
    googleAnalyticsId: "",
    googleTagManagerId: "",
    facebookPixelId: "",
    googleSiteVerification: "",
  },

  // -------------------------------------------------------------------- legal
  //
  // Markdown, rendered by the public legal pages. Empty means "page not
  // published" rather than "publish an empty page" — an unfinished refund
  // policy should 404, not mislead.
  legal: {
    privacyPolicy: "",
    termsAndConditions: "",
    cancellationPolicy: "",
    refundPolicy: "",
    lastReviewedOn: "",
  },

  // ----------------------------------------------------------------- features
  //
  // Toggles hide a module from the *public site*. They deliberately do not
  // disable the API or the admin panel: turning off Restaurant should stop new
  // reservations being taken, not strand the ones already in the book.
  features: {
    hotelModule: true,
    restaurantModule: true,
    hallModule: true,
    reviewsEnabled: true,
    offersEnabled: true,
    galleryEnabled: true,
    faqsEnabled: true,
    onlineOrdering: false,
    guestCheckout: true,
    newsletterSignup: false,
  },

  // ------------------------------------------------------------- integrations
  integrations: {
    razorpayKeyId: "",
    razorpayKeySecret: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    emailFrom: "",
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    googleMapsApiKey: "",
    analyticsApiSecret: "",
  },

  // -------------------------------------------------------------- maintenance
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage:
      "We are carrying out scheduled maintenance and will be back shortly. For urgent bookings, please call us.",
    /** Comma-separated paths that stay reachable while maintenance mode is on. */
    allowlistPaths: "/marriage-hall/contact",
    lastBackupAt: "",
    backupNote: "",
  },
};

/** Convenience: the default object for a category, cloned so callers can mutate. */
export function defaultsFor(category: SettingCategory): Record<string, unknown> {
  return JSON.parse(JSON.stringify(SETTING_DEFAULTS[category] ?? {}));
}
