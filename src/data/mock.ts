// Real constants and navigation structure for CUET E-Bazar

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

export const PUBLIC_NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Giveaways", href: "/giveaways" },
  { name: "Campus Shops", href: "/shops" }
];

export const navLinks = [
  { name: "Home", href: "/" },
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

// Shop owners can access both consumer browsing links and their shop workspace
export const SHOP_OWNER_NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Campus Shops", href: "/shops" },
  { name: "Giveaways", href: "/giveaways" },
  { name: "My Shop", href: "/my-shop" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Messages", href: "/messages" },
  { name: "Settings", href: "/settings" }
];

export const SHOP_OWNER_BLOCKED_PATHS: string[] = [];

export function getNavLinks(role?: string | null) {
  return role === "shop_owner" ? SHOP_OWNER_NAV_LINKS : navLinks;
}
