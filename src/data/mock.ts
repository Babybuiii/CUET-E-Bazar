export const stats = [
  { label: "Students Registered", value: 5820 },
  { label: "Products Listed", value: 12490 },
  { label: "Campus Shops", value: 84 },
  { label: "Successful Trades", value: 9312 },
  { label: "Giveaways Completed", value: 1760 }
];

export const features = [
  "Buy & Sell",
  "Campus Shops",
  "Giveaway",
  "Real-time Chat",
  "Product Reviews",
  "Public Q&A",
  "Scam Reporting",
  "Smart Search",
  "Personalized Recommendations"
];

export const CUET_DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electrical and Electronic Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Petroleum and Mining Engineering",
  "Mechatronics & Industrial Engineering",
  "Materials and Metallurgical Engineering",
  "Electronics & Telecommunication Engineering",
  "Biomedical Engineering",
  "Architecture",
  "Urban and Regional Planning",
  "Water Resources Engineering"
] as const;

export const CUET_HALLS = [
  "Dr. Qudrat-E-Khuda Hall",
  "Kabi Kazi Nazrul Islam Hall",
  "Muktijoddha Hall",
  "Shaheed Abu Sayed Hall",
  "Shahid Mohammad Shah Hall",
  "Shaheed Tareq Huda Hall",
  "Sufia Kamal Hall",
  "Shamsennahar Khan Hall",
  "Tapashi Rabeya Hall"
] as const;

export const CUET_LOCATIONS = [
  "Dr. Qudrat-E-Khuda Hall",
  "Kabi Kazi Nazrul Islam Hall",
  "Muktijoddha Hall",
  "Shaheed Abu Sayed Hall",
  "Shahid Mohammad Shah Hall",
  "Shaheed Tareq Huda Hall",
  "Sufia Kamal Hall",
  "Shamsennahar Khan Hall",
  "Tapashi Rabeya Hall",
  "Tsc Cafeteria",
  "Cuet Main gate",
  "Hotasha Chottor",
  "West Gate",
  "Academic Building 1",
  "Academic Building 2",
  "Academic Building 3",
  "Academic Building 4",
  "Academic Building 5",
  "New Library",
  "Central Mosque",
  "Cuet School"
] as const;

export const products = [
  {
    id: "p1",
    title: "HP EliteBook 840 G5",
    price: 38500,
    condition: "Used - Good",
    rating: 4.8,
    location: "Shahid Minar Gate",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "p2",
    title: "Engineering Drawing Kit",
    price: 1450,
    condition: "Like New",
    rating: 4.6,
    location: "Shaheed Hall",
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "p3",
    title: "Casio FX-991EX",
    price: 1200,
    condition: "Used - Fair",
    rating: 4.4,
    location: "Central Library",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "p4",
    title: "Study Table with Drawer",
    price: 4200,
    condition: "Used - Good",
    rating: 4.7,
    location: "Girls Hall",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
  }
];

export const testimonials = [
  {
    name: "Nishat Rahman",
    dept: "EEE, CUET",
    rating: 5,
    review: "I sold my old laptop in 2 days with verified buyers only. The chat and moderation are excellent."
  },
  {
    name: "Rafiul Karim",
    dept: "CSE, CUET",
    rating: 5,
    review: "Campus shop setup was easy, and students found my handmade desk lamps fast."
  },
  {
    name: "Mehjabin Alam",
    dept: "ME, CUET",
    rating: 4,
    review: "Giveaway section helped me donate books quickly. Very clean and trusted compared to groups."
  }
];

export const PUBLIC_NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Giveaways", href: "/giveaways" },
  { name: "Campus Shops", href: "/shops" }
];

export const navLinks = [
  { name: "Home", href: "/home" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Campus Shops", href: "/shops" },
  { name: "Giveaways", href: "/giveaways" },
  { name: "My Orders", href: "/my-orders" },
  { name: "Messages", href: "/messages" },
  { name: "Wishlist", href: "/wishlist" },
  { name: "My Listings", href: "/my-listings" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Settings", href: "/settings" }
];

// Shop owners get a shop-first workspace instead of the student browsing links
export const SHOP_OWNER_NAV_LINKS = [
  { name: "My Shop", href: "/my-shop" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Messages", href: "/messages" },
  { name: "Settings", href: "/settings" }
];

// Student-only browsing routes. Shop owners are redirected away from these.
// Note: only the exact paths - /marketplace/[id] and /shops/[id] stay reachable
// so owners can still open their own product pages and their public shop page.
export const SHOP_OWNER_BLOCKED_PATHS = [
  "/home",
  "/marketplace",
  "/giveaways",
  "/wishlist",
  "/shops",
  "/my-listings"
];

export function getNavLinks(role?: string | null) {
  return role === "shop_owner" ? SHOP_OWNER_NAV_LINKS : navLinks;
}
