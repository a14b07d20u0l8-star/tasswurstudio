export type ModuleKey =
  | "dfunctions"
  | "academy"
  | "worker"
  | "model"
  | "hall"
  | "bpartner";

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
    title: "D-Functions",
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
    fields: { business: true },
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
    fields: { fee: true, subjects: true },
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
      "Engineer",
      "Pharmacist",
    ],
    plans: [
      { id: "7d", label: "800 AT / 7 days", price: 800, days: 7 },
      { id: "30d", label: "4500 AT / 30 days", price: 4500, days: 30 },
    ],
    fields: { age: true, city: true, address: true },
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
    fields: { age: true, minImages: 5 },
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
    fields: { city: true, address: true },
  },
};
