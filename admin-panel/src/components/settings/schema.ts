import {
  CalendarCheck,
  CreditCard,
  Globe,
  Home,
  Image as ImageIcon,
  Landmark,
  Mail,
  MapPin,
  Palette,
  Plug,
  Scale,
  Search,
  Share2,
  ToggleLeft,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { SettingCategory } from "@/lib/settingsApi";

/**
 * The Settings CMS, described as data.
 *
 * ── Why a schema rather than fifteen hand-written forms ──
 * Fifteen categories × roughly a dozen fields is close to two hundred inputs.
 * Written by hand that is thousands of lines nobody will keep consistent, and
 * adding a text box to the homepage means writing JSX. Described here, a new
 * field is one object, and it inherits the label, hint, validation affordances
 * and layout every other field already has.
 *
 * The keys must match `SETTING_DEFAULTS` in the backend's
 * `settings.defaults.ts`. Anything not in the backend's defaults is dropped on
 * save (silently and deliberately — see that file), so a typo here shows up as
 * "it did not save" rather than as an error.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "toggle"
  | "select"
  | "color"
  | "image"
  | "secret"
  | "valuePoints"
  | "amenities";

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Layout weight inside the two-column grid. */
  full?: boolean;
  min?: number;
  max?: number;
  /**
   * Saved, but nothing on the public site reads it yet. Appends
   * `NOT_YET_ACTIVE` to the field's hint so nobody expects a visible change.
   */
  inactive?: boolean;
}

/** Hint suffix for settings that are stored but not yet used by the site. */
export const NOT_YET_ACTIVE = "Not yet active — saved, but the site does not use it yet.";

export interface SectionSpec {
  title: string;
  description?: string;
  fields: FieldSpec[];
}

export interface CategorySpec {
  key: SettingCategory;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Shown as a warning banner above the form. */
  caution?: string;
  sections: SectionSpec[];
}

export const CATEGORY_SPECS: CategorySpec[] = [
  {
    key: "general",
    label: "General",
    icon: Globe,
    description: "Site identity and the formats used across the public site and this console.",
    sections: [
      {
        title: "Identity",
        fields: [
          { key: "siteName", label: "Site name", type: "text" },
          { key: "tagline", inactive: true, label: "Tagline", type: "text" },
          {
            key: "shortDescription", inactive: true,
            label: "Short description",
            type: "textarea",
            full: true,
            hint: "One or two sentences. Used as a fallback wherever a summary is needed.",
          },
        ],
      },
      {
        title: "Regional",
        fields: [
          { key: "defaultLanguage", inactive: true, label: "Language code", type: "text", placeholder: "en" },
          { key: "timezone", inactive: true, label: "Timezone", type: "text", placeholder: "Asia/Kolkata" },
          { key: "currency", inactive: true, label: "Currency code", type: "text", placeholder: "INR" },
          { key: "currencySymbol", inactive: true, label: "Currency symbol", type: "text", placeholder: "₹" },
          { key: "dateFormat", inactive: true, label: "Date format", type: "text", placeholder: "DD MMM YYYY" },
        ],
      },
    ],
  },

  {
    key: "business",
    label: "Business information",
    icon: Landmark,
    description: "Legal and registration details. These appear on invoices and legal pages.",
    sections: [
      {
        title: "Registration",
        fields: [
          { key: "legalName", inactive: true, label: "Registered business name", type: "text" },
          { key: "ownerName", inactive: true, label: "Owner / proprietor", type: "text" },
          { key: "gstin", inactive: true, label: "GSTIN", type: "text", placeholder: "22AAAAA0000A1Z5" },
          { key: "registrationNumber", inactive: true, label: "Registration number", type: "text" },
          { key: "foundedYear", inactive: true, label: "Founded", type: "text", placeholder: "2019" },
          {
            key: "registeredAddress", inactive: true,
            label: "Registered address",
            type: "textarea",
            full: true,
            hint: "The legal address for invoices — not necessarily the address visitors are given.",
          },
        ],
      },
    ],
  },

  {
    key: "branding",
    label: "Branding",
    icon: ImageIcon,
    description: "Logo, favicon and the hero media on the home page.",
    sections: [
      {
        title: "Marks",
        fields: [
          { key: "logoUrl", inactive: true, label: "Logo (light backgrounds)", type: "image" },
          { key: "logoDarkUrl", inactive: true, label: "Logo (dark backgrounds)", type: "image" },
          {
            key: "faviconUrl",
            label: "Favicon",
            type: "image",
            hint: "Square, ideally 512×512. Browsers scale it down.",
          },
          {
            key: "ogImageUrl",
            label: "Social share image",
            type: "image",
            hint: "1200×630 is the safe size for WhatsApp, Facebook and X previews.",
          },
        ],
      },
      {
        title: "Home page hero",
        description: "A video wins over the image when both are set.",
        fields: [
          { key: "heroImageUrl", inactive: true, label: "Hero image", type: "image" },
          {
            key: "heroVideoUrl", inactive: true,
            label: "Hero video URL",
            type: "text",
            hint: "A direct MP4 link. Keep it short and under a few megabytes — it loads before anything else.",
          },
        ],
      },
    ],
  },

  {
    key: "contact",
    label: "Contact & location",
    icon: MapPin,
    description: "How guests reach you, and where the map points.",
    sections: [
      {
        title: "Reach us",
        fields: [
          { key: "phonePrimary", label: "Primary phone", type: "text" },
          { key: "phoneSecondary", inactive: true, label: "Secondary phone", type: "text" },
          { key: "whatsapp", inactive: true, label: "WhatsApp number", type: "text" },
          { key: "email", label: "General email", type: "text" },
          { key: "reservationsEmail", inactive: true, label: "Reservations email", type: "text" },
          { key: "openingHours", inactive: true, label: "Opening hours", type: "text", placeholder: "Reception open 24 hours" },
        ],
      },
      {
        title: "Address",
        fields: [
          { key: "addressLine1", label: "Address line 1", type: "text", full: true },
          { key: "addressLine2", label: "Address line 2", type: "text", full: true },
          { key: "city", label: "City", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "postalCode", label: "PIN code", type: "text" },
          { key: "country", inactive: true, label: "Country", type: "text" },
        ],
      },
      {
        title: "Map",
        fields: [
          {
            key: "mapEmbedUrl", inactive: true,
            label: "Google Maps embed URL",
            type: "text",
            full: true,
            hint: "From Google Maps → Share → Embed a map. Paste only the src URL.",
          },
          { key: "latitude", inactive: true, label: "Latitude", type: "text" },
          { key: "longitude", inactive: true, label: "Longitude", type: "text" },
        ],
      },
    ],
  },

  {
    key: "social",
    label: "Social media",
    icon: Share2,
    description: "Profile links. Empty fields are hidden from the site rather than linking nowhere.",
    sections: [
      {
        title: "Profiles",
        fields: [
          { key: "instagram", label: "Instagram", type: "text" },
          { key: "facebook", label: "Facebook", type: "text" },
          { key: "youtube", label: "YouTube", type: "text" },
          { key: "x", label: "X (Twitter)", type: "text" },
          { key: "linkedin", label: "LinkedIn", type: "text" },
          { key: "pinterest", label: "Pinterest", type: "text" },
          { key: "tripadvisor", label: "Tripadvisor", type: "text" },
          { key: "googleBusiness", label: "Google Business profile", type: "text" },
        ],
      },
    ],
  },

  {
    key: "homepage",
    label: "Homepage",
    icon: Home,
    description:
      "Every piece of fixed copy on the home page. This used to live in the code, so changing a word needed a deploy.",
    sections: [
      {
        title: "Hero",
        fields: [
          { key: "heroEyebrow", label: "Eyebrow", type: "text" },
          { key: "heroTitle", label: "Title", type: "text" },
          { key: "heroSubtitle", label: "Subtitle", type: "textarea", full: true },
          { key: "heroCtaLabel", label: "Primary button", type: "text" },
          { key: "heroCtaHref", label: "Primary button link", type: "text" },
          { key: "heroSecondaryCtaLabel", label: "Secondary button", type: "text" },
          { key: "heroSecondaryCtaHref", label: "Secondary button link", type: "text" },
        ],
      },
      {
        title: "About the estate",
        fields: [
          { key: "aboutEyebrow", inactive: true, label: "Eyebrow", type: "text" },
          { key: "aboutTitle", inactive: true, label: "Title", type: "text" },
          { key: "aboutBody", inactive: true, label: "Body", type: "textarea", full: true },
        ],
      },
      {
        title: "Promise band",
        description: "The four dark cards. Each nods at a different part of the estate.",
        fields: [
          { key: "valuePropsEyebrow", label: "Eyebrow", type: "text" },
          { key: "valuePropsTitle", label: "Title", type: "text" },
          { key: "valuePoints", label: "Points", type: "valuePoints", full: true },
        ],
      },
      {
        title: "Facilities band",
        description:
          "The “Considered comforts” strip. Leave the list empty to keep showing the hotel's own amenities; add even one entry and this list takes over, so you can mix facilities from all three businesses.",
        fields: [
          { key: "amenitiesEyebrow", label: "Eyebrow", type: "text" },
          { key: "amenitiesTitle", label: "Title", type: "text" },
          { key: "amenitiesCtaLabel", label: "Button label", type: "text" },
          { key: "amenitiesCtaHref", label: "Button link", type: "text" },
          { key: "amenities", label: "Facilities", type: "amenities", full: true },
        ],
      },
      {
        title: "Other section headings",
        fields: [
          { key: "galleryEyebrow", inactive: true, label: "Gallery eyebrow", type: "text" },
          { key: "galleryTitle", inactive: true, label: "Gallery title", type: "text" },
          { key: "offersEyebrow", label: "Offers eyebrow", type: "text" },
          { key: "offersTitle", label: "Offers title", type: "text" },
          { key: "testimonialsEyebrow", inactive: true, label: "Testimonials eyebrow", type: "text" },
          { key: "testimonialsTitle", inactive: true, label: "Testimonials title", type: "text" },
        ],
      },
      {
        title: "Sections shown",
        fields: [
          { key: "showVerticals", label: "Three-business preview", type: "toggle" },
          { key: "showGallery", label: "Estate gallery", type: "toggle" },
          { key: "showOffers", label: "Offers", type: "toggle" },
          { key: "showTestimonials", label: "Testimonials", type: "toggle" },
          { key: "showMap", label: "Map", type: "toggle" },
        ],
      },
    ],
  },

  {
    key: "theme",
    label: "Theme & appearance",
    icon: Palette,
    description: "Colours and type for the public site.",
    caution:
      "The palette is the brand. Changing these affects every public page at once, and the design system's contrast rules were written against the defaults.",
    sections: [
      {
        title: "Palette",
        description: NOT_YET_ACTIVE,
        fields: [
          { key: "primaryColor", label: "Accent (gold)", type: "color" },
          { key: "inkColor", label: "Ink (text / dark surfaces)", type: "color" },
          { key: "creamColor", label: "Cream (light surfaces)", type: "color" },
        ],
      },
      {
        title: "Type",
        description: NOT_YET_ACTIVE,
        fields: [
          { key: "displayFont", label: "Display font", type: "text" },
          { key: "bodyFont", label: "Body font", type: "text" },
          {
            key: "roundedCorners",
            label: "Corner style",
            type: "select",
            options: [
              { value: "none", label: "Square" },
              { value: "sm", label: "Slight" },
              { value: "luxe", label: "Luxe (default)" },
              { value: "full", label: "Fully rounded" },
            ],
          },
        ],
      },
      {
        title: "Behaviour",
        description: NOT_YET_ACTIVE,
        fields: [
          {
            key: "enableAnimations",
            label: "Scroll and hero animations",
            type: "toggle",
            hint: "A visitor's own reduced-motion preference still wins over this.",
          },
          { key: "stickyHeader", label: "Sticky header", type: "toggle" },
        ],
      },
    ],
  },

  {
    key: "booking",
    label: "Booking rules",
    icon: CalendarCheck,
    description: "Limits and windows for each business.",
    caution:
      "These change what guests are quoted and charged. The advance percentage in particular decides how much money is taken up front.",
    sections: [
      {
        title: "Hotel",
        fields: [
          { key: "hotelEnabled", label: "Accept online bookings", type: "toggle" },
          {
            key: "hotelAdvancePercent",
            label: "Advance charged (%)",
            type: "number",
            min: 1,
            max: 100,
            hint: "Between 1 and 100. The rest is collected at the property.",
          },
          { key: "hotelMinNights", inactive: true, label: "Minimum nights", type: "number", min: 1 },
          { key: "hotelMaxNights", inactive: true, label: "Maximum nights", type: "number", min: 1 },
          { key: "hotelCheckInTime", inactive: true, label: "Check-in time", type: "text", placeholder: "14:00" },
          { key: "hotelCheckOutTime", inactive: true, label: "Check-out time", type: "text", placeholder: "11:00" },
          {
            key: "cancellationFreeWindowHours",
            label: "Free cancellation window (hours)",
            type: "number",
            min: 0,
            hint: "Guests who cancel at least this many hours before check-in are refunded automatically.",
          },
        ],
      },
      {
        title: "Restaurant",
        fields: [
          { key: "restaurantEnabled", label: "Accept table reservations", type: "toggle" },
          { key: "restaurantMaxPartySize", inactive: true, label: "Maximum party size", type: "number", min: 1 },
          { key: "restaurantSlotMinutes", inactive: true, label: "Slot length (minutes)", type: "number", min: 15 },
          { key: "restaurantAdvanceDays", inactive: true, label: "Book up to (days ahead)", type: "number", min: 1 },
        ],
      },
      {
        title: "Marriage Hall",
        description:
          "Hall bookings are approval-first by design — an enquiry holds nothing until an admin confirms it. There is no instant-booking switch here, and there will not be one.",
        fields: [
          { key: "hallEnquiriesEnabled", label: "Accept enquiries", type: "toggle" },
          { key: "hallAdvanceDays", inactive: true, label: "Enquire up to (days ahead)", type: "number", min: 1 },
        ],
      },
    ],
  },

  {
    key: "payment",
    label: "Payment",
    icon: CreditCard,
    description: "Gateway policy and what the guest is told. Credentials live under Integrations.",
    sections: [
      {
        title: "Gateway",
        fields: [
          {
            key: "gateway", inactive: true,
            label: "Provider",
            type: "select",
            options: [{ value: "razorpay", label: "Razorpay" }],
            hint: "Razorpay is mandated by RULES.md. Listed for clarity, not as a choice.",
          },
          {
            key: "liveMode", inactive: true,
            label: "Live mode",
            type: "toggle",
            hint: "A label for your own reference. Test vs live is decided by which keys you save under Integrations.",
          },
          { key: "currency", inactive: true, label: "Currency", type: "text" },
          { key: "invoicePrefix", inactive: true, label: "Invoice prefix", type: "text" },
        ],
      },
      {
        title: "What the guest sees",
        fields: [
          {
            key: "refundPolicyNote", inactive: true,
            label: "Refund note",
            type: "textarea",
            full: true,
            hint: "Shown at checkout and in the cancellation email.",
          },
        ],
      },
    ],
  },

  {
    key: "email",
    label: "Email & notifications",
    icon: Mail,
    description: "Who is notified and which emails go out. SMTP credentials are under Integrations.",
    sections: [
      {
        title: "Sender",
        fields: [
          { key: "fromName", inactive: true, label: "From name", type: "text" },
          { key: "adminNotificationEmail", label: "Notify this address", type: "text" },
          { key: "ccOnBooking", inactive: true, label: "CC on bookings", type: "text" },
          { key: "signature", inactive: true, label: "Email signature", type: "text", full: true },
        ],
      },
      {
        title: "Send these",
        fields: [
          { key: "sendBookingConfirmation", inactive: true, label: "Booking confirmation", type: "toggle" },
          { key: "sendCancellationEmail", inactive: true, label: "Cancellation notice", type: "toggle" },
          { key: "sendEnquiryAcknowledgement", inactive: true, label: "Hall enquiry acknowledgement", type: "toggle" },
          { key: "sendReviewNotification", inactive: true, label: "New review alert", type: "toggle" },
        ],
      },
    ],
  },

  {
    key: "seo",
    label: "SEO & analytics",
    icon: Search,
    description: "Default metadata and tracking IDs for the public site.",
    sections: [
      {
        title: "Metadata",
        fields: [
          { key: "defaultTitle", label: "Default title", type: "text", full: true },
          {
            key: "titleTemplate",
            label: "Title template",
            type: "text",
            hint: "%s is replaced by the page's own title.",
          },
          {
            key: "canonicalUrl",
            label: "Canonical base URL",
            type: "text",
            placeholder: "https://www.example.com",
            hint: "A full URL starting with https://.",
          },
          { key: "defaultDescription", label: "Default description", type: "textarea", full: true },
          { key: "keywords", label: "Keywords", type: "text", full: true, hint: "Comma separated." },
          {
            key: "robotsIndex",
            label: "Allow search engines to index the site",
            type: "toggle",
            hint: "Turn this off only for a staging domain. Leaving it off in production removes the site from Google.",
          },
        ],
      },
      {
        title: "Tracking",
        fields: [
          { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text", placeholder: "G-XXXXXXX" },
          { key: "googleTagManagerId", label: "Tag Manager ID", type: "text", placeholder: "GTM-XXXXXX" },
          { key: "facebookPixelId", label: "Meta Pixel ID", type: "text" },
          { key: "googleSiteVerification", label: "Google verification token", type: "text" },
        ],
      },
    ],
  },

  {
    key: "legal",
    label: "Legal pages",
    icon: Scale,
    description:
      "Markdown, published as public pages. A page left empty is not published at all — an unfinished refund policy should 404 rather than mislead.",
    sections: [
      {
        title: "Policies",
        fields: [
          { key: "privacyPolicy", label: "Privacy policy", type: "markdown", full: true },
          { key: "termsAndConditions", label: "Terms & conditions", type: "markdown", full: true },
          { key: "cancellationPolicy", label: "Cancellation policy", type: "markdown", full: true },
          { key: "refundPolicy", label: "Refund policy", type: "markdown", full: true },
          { key: "lastReviewedOn", label: "Last reviewed on", type: "text" },
        ],
      },
    ],
  },

  {
    key: "features",
    label: "Feature toggles",
    icon: ToggleLeft,
    description:
      "Turning a module off hides it from the public site. It does not disable the API or this console — existing bookings stay reachable and manageable.",
    sections: [
      {
        title: "Businesses",
        description: NOT_YET_ACTIVE,
        fields: [
          { key: "hotelModule", label: "Hotel", type: "toggle" },
          { key: "restaurantModule", label: "Restaurant", type: "toggle" },
          { key: "hallModule", label: "Marriage Hall", type: "toggle" },
        ],
      },
      {
        title: "Content",
        description: NOT_YET_ACTIVE,
        fields: [
          { key: "reviewsEnabled", label: "Reviews", type: "toggle" },
          { key: "offersEnabled", label: "Offers", type: "toggle" },
          { key: "galleryEnabled", label: "Gallery", type: "toggle" },
          { key: "faqsEnabled", label: "FAQs", type: "toggle" },
        ],
      },
      {
        title: "Behaviour",
        description: NOT_YET_ACTIVE,
        fields: [
          {
            key: "guestCheckout",
            label: "Guest checkout",
            type: "toggle",
            hint: "RULES.md forbids forcing a login to book. Leave this on.",
          },
          {
            key: "onlineOrdering",
            label: "Online food ordering",
            type: "toggle",
            hint: "Phase 2. There is no ordering backend yet, so this only shows placeholders.",
          },
          { key: "newsletterSignup", label: "Newsletter signup", type: "toggle" },
        ],
      },
    ],
  },

  {
    key: "integrations",
    label: "Integrations",
    icon: Plug,
    description:
      "Third-party credentials. Secrets are encrypted before storage and can never be read back — only replaced or cleared.",
    caution:
      "A value saved here overrides the matching variable in the server's .env from the next request onwards. Leave a field blank to keep using .env; that is the safe default, and it means a half-filled form cannot take payments offline.",
    sections: [
      {
        title: "Razorpay",
        fields: [
          { key: "razorpayKeyId", label: "Key ID", type: "text", placeholder: "rzp_test_…" },
          { key: "razorpayKeySecret", label: "Key secret", type: "secret" },
        ],
      },
      {
        title: "SMTP",
        fields: [
          { key: "smtpHost", label: "Host", type: "text", placeholder: "smtp.gmail.com" },
          { key: "smtpPort", label: "Port", type: "text", placeholder: "587" },
          { key: "smtpUser", label: "Username", type: "text" },
          { key: "smtpPassword", label: "Password", type: "secret" },
          { key: "emailFrom", label: "From address", type: "text" },
        ],
      },
      {
        title: "Cloudinary",
        fields: [
          { key: "cloudinaryCloudName", label: "Cloud name", type: "text" },
          { key: "cloudinaryApiKey", label: "API key", type: "text" },
          { key: "cloudinaryApiSecret", label: "API secret", type: "secret" },
        ],
      },
      {
        title: "Google",
        fields: [{ key: "googleMapsApiKey", inactive: true, label: "Maps API key", type: "secret" }],
      },
    ],
  },

  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    description: "Take the public site offline temporarily, and keep a note of your last backup.",
    caution:
      "Maintenance mode is not enforced yet: switching it on saves the setting, but the public website stays online for now. This console stays reachable either way.",
    sections: [
      {
        title: "Maintenance mode",
        description: NOT_YET_ACTIVE,
        fields: [
          { key: "maintenanceMode", label: "Show the maintenance page", type: "toggle" },
          { key: "maintenanceMessage", label: "Message", type: "textarea", full: true },
          {
            key: "allowlistPaths",
            label: "Keep these paths reachable",
            type: "text",
            full: true,
            hint: "Comma separated. Useful for leaving the enquiry form open while the rest is down.",
          },
        ],
      },
      {
        title: "Backup",
        description:
          "A note for your own records — this console does not run backups. Database backups are handled by your MongoDB provider.",
        fields: [
          { key: "lastBackupAt", label: "Last backup", type: "text", placeholder: "2026-08-03" },
          { key: "backupNote", label: "Note", type: "textarea", full: true },
        ],
      },
    ],
  },
];

export const CATEGORY_BY_KEY: Record<string, CategorySpec> = Object.fromEntries(
  CATEGORY_SPECS.map((c) => [c.key, c])
);

/**
 * Icon names offered for the homepage promise band.
 *
 * Mirrors the frontend's `settingsIcons.ts` registry. A name not in that
 * registry falls back to a default rather than crashing a server component, so
 * this list is a convenience, not a constraint.
 */
export const VALUE_POINT_ICONS = [
  "MapPin",
  "ChefHat",
  "HeartHandshake",
  "Clock",
  "Sparkles",
  "ShieldCheck",
  "Star",
  "Utensils",
  "BedDouble",
  "PartyPopper",
  "Leaf",
  "Wifi",
  "Car",
  "Award",
  "Users",
  "Gem",
];
