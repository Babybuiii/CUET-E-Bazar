// Shared TypeScript types for the Giveaways feature

export type GiveawayStatus = 'available' | 'pending_draw' | 'claimed' | 'expired' | 'cancelled';

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
  selectedUser?: { _id: string; fullName: string; userId?: string; department?: string; avatarUrl?: string } | null;
  status: GiveawayStatus;
  deadline: string;
  claimBufferEndsAt?: string | null;
  pickupDeadline?: string | null;
  contactInitiatedAt?: string | null;
  drawResolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Only visible to donor/admin:
  claimBufferApplicants?: Array<{ user: string; claimedAt: string }>;
  waitlist?: Array<{ user: string; addedAt: string }>;
  // Annotated by getMyClaims:
  myClaimRole?: 'winner' | 'waitlisted' | 'applicant' | 'unknown';
  myWaitlistPos?: number | null;
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

