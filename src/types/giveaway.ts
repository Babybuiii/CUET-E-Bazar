// Shared TypeScript types for the Giveaways feature (FCFS)

export type GiveawayStatus = 'available' | 'claimed' | 'given_away' | 'expired' | 'cancelled';

export type GiveawayCategory = 'Books' | 'Electronics' | 'Study Materials' | 'Accessories' | 'Others';

export type GiveawayCondition = 'New' | 'Like New' | 'Good' | 'Fair';

export type GiveawayLocation =
  | 'Main Gate'
  | 'Academic Building'
  | 'Library'
  | 'Hall'
  | 'CUET Campus';

export interface GiveawayDonor {
  _id: string;
  fullName: string;
  userId?: string;
  department?: string;
  hall?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface GiveawayClaimant {
  _id: string;
  fullName: string;
  userId?: string;
  department?: string;
  hall?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface Giveaway {
  _id: string;
  title: string;
  description?: string;
  category: GiveawayCategory;
  condition: GiveawayCondition;
  location: GiveawayLocation;
  pickupSpot?: string;
  images: string[];
  donor: GiveawayDonor;
  selectedUser?: GiveawayClaimant | null;
  claimedAt?: string | null;
  claimedCount?: number;
  status: GiveawayStatus;
  deadline: string;
  contactInitiatedAt?: string | null;
  conversation?: string | null;
  createdAt: string;
  updatedAt: string;
  myClaimRole?: 'winner' | 'claimant';
}

export const GIVEAWAY_CATEGORIES: GiveawayCategory[] = [
  'Books', 'Electronics', 'Study Materials', 'Accessories', 'Others'
];

export const GIVEAWAY_CONDITIONS: GiveawayCondition[] = [
  'New', 'Like New', 'Good', 'Fair'
];

export const GIVEAWAY_LOCATIONS: GiveawayLocation[] = [
  'Main Gate', 'Academic Building', 'Library', 'Hall', 'CUET Campus'
];

export const GIVEAWAY_DURATIONS = [
  { label: '24 Hours', value: '24h' },
  { label: '3 Days',   value: '3d'  },
  { label: '7 Days',   value: '7d'  }
] as const;

