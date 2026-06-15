export type ModuleKey =
  | "dfunctions"
  | "academy"
  | "worker"
  | "model"
  | "hall"
  | "bpartner"
  | "onrider"
  | "onstore";

export interface PlanOption {
  id: string;
  label: string;
  price: number;
  days: number;
}

export interface ModuleConfig {
  key: ModuleKey;
  title: string;
  tagline: string;
  categories: string[];
  plans: PlanOption[];
  fields: {
    business?: boolean;
    age?: boolean;
    city?: boolean;
    address?: boolean;
    fee?: boolean;
    subjects?: boolean;
    minImages?: number;
  };
}

export const MODULES: Record<ModuleKey, ModuleConfig> = {
  dfunctions: {
    key: "dfunctions",
    title: "D-Services",
    tagline: "Services Marketplace",
    categories: [
      "Video Editing",
      "Graphic Designing",
      "Ads Running",
      "Content Writing",
      "Assignment Work",
      "Audio Editing",
      "Voiceover Artist",
      "Website Designing",
      "Animated Videos",
      "YouTube Automation",
      "Cartoon Making",
      "Subscription Selling",
    ],
    plans: [
      { id: "7d", label: "1500 AT / 7 days", price: 1500, days: 7 },
      { id: "30d", label: "5300 AT / 30 days", price: 5300, days: 30 },
    ],
    fields: { business: true, city: true, minImages: 1 },
  },
  academy: {
    key: "academy",
    title: "On-Academy",
    tagline: "Teachers & Tutors",
    categories: [
      "Nazra",
      "Basic Study",
      "Tafseer",
      "Hadith",
      "Aalim Course",
      "Pre-9th",
      "9th",
      "10th",
      "1st Year",
      "2nd Year",
    ],
    plans: [
      { id: "7d", label: "1500 AT / 7 days", price: 1500, days: 7 },
      { id: "30d", label: "5300 AT / 30 days", price: 5300, days: 30 },
    ],
    fields: { fee: true, subjects: true, city: true, minImages: 1 },
  },
  worker: {
    key: "worker",
    title: "On-Worker",
    tagline: "Skilled Professionals",
    categories: [
      "Electrician",
      "Plumber",
      "Painter",
      "Carpenter",
      "Mechanic",
      "Doctor",
      "Male Nurse",
      "Female Nurse",
      "Surgeon",
      "Neurosurgeon",
      "Psychiatrist",
      "Software Engineer",
      "Mechanical Engineer",
      "Electrical Engineer",
      "Civil Engineer",
      "Pharmacist",
    ],
    plans: [
      { id: "7d", label: "800 AT / 7 days", price: 800, days: 7 },
      { id: "30d", label: "4500 AT / 30 days", price: 4500, days: 30 },
    ],
    fields: { age: true, city: true, address: true, minImages: 1 },
  },
  model: {
    key: "model",
    title: "On-Model",
    tagline: "Talent & Portfolio",
    categories: ["Male", "Female"],
    plans: [
      { id: "7d", label: "1500 AT / 7 days", price: 1500, days: 7 },
      { id: "30d", label: "5300 AT / 30 days", price: 5300, days: 30 },
    ],
    fields: { age: true, city: true, minImages: 5 },
  },
  hall: {
    key: "hall",
    title: "On-Hall",
    tagline: "Venues & Halls",
    categories: ["Marriage Hall", "Restaurant", "Party Hall", "Event Hall"],
    plans: [
      { id: "7d", label: "2000 AT / 7 days", price: 2000, days: 7 },
      { id: "30d", label: "8000 AT / 30 days", price: 8000, days: 30 },
    ],
    fields: { business: true, city: true, address: true, minImages: 5 },
  },
  bpartner: {
    key: "bpartner",
    title: "B-Partner",
    tagline: "Business Partners",
    categories: ["General"],
    plans: [
      { id: "7d", label: "2000 AT / 7 days", price: 2000, days: 7 },
      { id: "30d", label: "8000 AT / 30 days", price: 8000, days: 30 },
    ],
    fields: { business: true, city: true, address: true, minImages: 1 },
  },
  onrider: {
    key: "onrider",
    title: "On-Rider",
    tagline: "Riders & Drivers",
    categories: ["Bike Rider", "Car Driver", "Rickshaw", "Truck Driver", "Delivery Rider"],
    plans: [
      { id: "7d", label: "800 AT / 7 days", price: 800, days: 7 },
      { id: "30d", label: "4500 AT / 30 days", price: 4500, days: 30 },
    ],
    fields: { age: true, city: true, address: true, minImages: 1 },
  },
  onstore: {
    key: "onstore",
    title: "On-Store",
    tagline: "Products & Stores",
    categories: [
      "Electronics",
      "Clothing, Shoes & Jewelry",
      "Beauty & Personal Care",
      "Home & Kitchen",
      "Health & Household",
      "Toys & Games",
      "Sports & Outdoors",
      "Baby",
      "Pet Supplies",
      "Appliances",
      "Cell Phones & Accessories",
      "Computers & Accessories",
      "Video Games",
      "Arts, Crafts & Sewing",
      "Automotive Parts",
      "Patio, Lawn & Garden",
      "Musical Instruments",
      "Furniture",
      "Books & Digital Media",
      "Grocery & Food Products",
    ],
    plans: [
      { id: "7d", label: "1500 AT / 7 days", price: 1500, days: 7 },
      { id: "30d", label: "5000 AT / 30 days", price: 5000, days: 30 },
    ],
    fields: { business: true, city: true, address: true, minImages: 5 },
  },
};

// Content moderation: keyword filter for harassment / explicit content
const BANNED_TERMS = [
  "fuck","shit","bitch","asshole","slut","whore","cunt","dick","pussy","cock","nude","nudes","naked","sex","sexy","porn","xxx","horny","rape","kill you","stupid","idiot","moron","bastard","retard",
  "chutiya","chutia","gandu","madarchod","behenchod","bhenchod","randi","kameena","haramzada","haramzadi","kutta","lund","gaand","chod","saala","kanjar","kanjari","bhosdi","bhosdike",
];
export function containsBannedContent(text: string): string | null {
  const t = text.toLowerCase();
  for (const w of BANNED_TERMS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(t)) return w;
  }
  return null;
}
