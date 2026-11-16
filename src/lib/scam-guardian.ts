/**
 * CUET E-Bazar AI Scam Guardian
 * Multi-layer transaction security shield:
 * 1. Instant Zero-Latency Keystroke & Pattern Detector (Catches "bkash", "nagad", "advance", OTPs, etc.)
 * 2. Deep Dialogue Context AI Analyzer (Gemini 2.0 Flash reading conversation intent, tone, & deception)
 */

export type ScamRiskLevel = "safe" | "caution" | "high_risk" | "critical";

export type ScamTriggerCategory =
  | "advance_payment"
  | "credential_theft"
  | "phishing_link"
  | "off_platform"
  | "unsafe_location"
  | "psychological_pressure"
  | "none";

export type ScamDetectionResult = {
  hasRisk: boolean;
  level: ScamRiskLevel;
  category?: ScamTriggerCategory;
  matchedKeywords: string[];
  alertTitle: string;
  alertMessage: string;
  actionAdvice: string;
  recommendedMeetingSpots: string[];
  aiReasoning?: string;
  isAiPowered?: boolean;
  engine?: string;
  flaggedMessageIds: string[];
};

export const CUET_SAFE_MEETUP_SPOTS = [
  {
    name: "TSC Cafeteria (Canteen Area)",
    description: "High student footfall & well lit. Recommended 9:00 AM – 8:00 PM.",
    recommendedFor: "General gadgets, study materials, clothes"
  },
  {
    name: "Central Library Entrance",
    description: "CCTV-covered quiet concourse, great for laptop & calculator testing.",
    recommendedFor: "Electronics, laptops, engineering tools"
  },
  {
    name: "CUET Main Gate Concourse",
    description: "Safe public area, perfect if one party is commuting or day-scholar.",
    recommendedFor: "Bicycles, furniture, bulk dorm items"
  },
  {
    name: "Academic Building 1 / 2 Ground Lounge",
    description: "Accessible between lab and lecture intervals.",
    recommendedFor: "Course textbooks, drafters, calculators"
  },
  {
    name: "Student Hall Office / Entrance",
    description: "Always meet in front of the hall provost/security counter, never in isolated rooms.",
    recommendedFor: "Dorm essentials, mattress, fans"
  }
];

// Regex patterns tailored for English, Bangla, and Banglish campus dialects
export const MFS_PROVIDERS = /(?:bkash|b-kash|bikash|বিকাশ|nagad|নগদ|nogod|rocket|রকেট|roket|upay|উপায়)/i;
export const CREDENTIAL_WORDS = /(?:otp|pin|pin\s*code|password|passcode|security\s*code|verification\s*code|code\s*ashbe|secret\s*code|পাসওয়ার্ড|পিন|ওটিপি)/i;
export const SUSPICIOUS_LINKS = /(?:bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/|wa\.link|forms\.gle|giftcard|airdrop|free-gift|payment-gateway)/i;
export const OFF_PLATFORM_WORDS = /(?:whatsapp|telegram|facebook\s*e\s*knock|inbox\s*koren|whatsapp\s*number|imo\s*te)/i;
export const HIGH_PRESSURE_WORDS = /(?:5\s*min|another\s*buyer\s*waiting|arek\s*jon\s*nibe|shobai\s*line\s*e|urgent\s*taka\s*lagbe|fast\s*send\s*koren)/i;
export const PHONE_BD = /(?:\+?88)?01[3-9]\d{8}/;

// Advance & Deposit vocabulary
export const ADVANCE_WORDS = /(?:advance|ogrim|অগ্রিম|a+ge(?:i|r)?|a+ga?y|first|before|upfront|shuru(?:te)?)/i;
export const MONEY_WORDS = /(?:taka|tk|টাকা|money|payment|bkash|nagad|rocket|upay|\d+\s*%|\d+\s*percent|half|haf|ordhek|ordek|অর্ধেক|token|deposit|booking|fee|charge|kichu|kisu)/i;
export const ACTION_WORDS = /(?:dewa|deya|dite|pathan|pathate|pathano|send|lagbe|lagbo|hobe|den|transfer|cash\s*in|pay|দিতে|দেওয়া|লাগবে|হবে|পাঠান)/i;
export const DEPOSIT_WORDS = /(?:token\s*(?:money|taka)?|booking\s*(?:money|taka)?|security\s*deposit|advance(?:\s*taka)?|ogrim(?:\s*taka)?|delivery\s*charge|courier\s*charge)/i;

/**
 * Checks if the text exhibits advance payment scam intent in English or Banglish
 * (e.g. "50% taka aage dewa lagbe", "taka aage dite hobe", "token money lagbe", etc.)
 */
export function isAdvancePaymentPattern(raw: string): boolean {
  const hasAdv = ADVANCE_WORDS.test(raw);
  const hasMon = MONEY_WORDS.test(raw);
  const hasAct = ACTION_WORDS.test(raw);
  const hasDeposit = DEPOSIT_WORDS.test(raw);

  // 1. Advance cue ("aage", "advance", "ogrim", "first") + (money cue OR action cue)
  if (hasAdv && (hasMon || hasAct)) return true;

  // 2. Deposit terms ("token money", "booking charge") + (action or money)
  if (hasDeposit && (hasAct || hasMon)) return true;

  // 3. Percentage / fraction + action (e.g. "50% dewa lagbe", "half aage lagbe")
  if (hasMon && hasAct && /(?:%|percent|half|haf|ordhek|ordek|অর্ধেক|token|deposit|booking|fee|charge)/i.test(raw)) {
    return true;
  }

  // 4. Phone number + money sending action
  if (PHONE_BD.test(raw) && /(?:taka|send|money|pathan|den|transfer|cash\s*in)/i.test(raw)) {
    return true;
  }

  return false;
}

/**
 * Instant local evaluation for a single message string.
 * Guaranteed to catch "50% taka aage dewa lagbe", "bkash", "nagad", "advance", OTPs, etc. instantly.
 */
export function analyzeTextMessage(text: string): {
  category: ScamTriggerCategory | null;
  level: ScamRiskLevel;
  matchedKeywords: string[];
} {
  if (!text || !text.trim()) {
    return { category: null, level: "safe", matchedKeywords: [] };
  }

  const raw = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  // 1. Critical: Credential & OTP theft
  if (CREDENTIAL_WORDS.test(raw)) {
    const m = raw.match(CREDENTIAL_WORDS);
    if (m) matchedKeywords.push(m[0]);
    return { category: "credential_theft", level: "critical", matchedKeywords };
  }

  // 2. High Risk: Mobile money provider mentioned (bkash, nagad, rocket, etc.)
  if (MFS_PROVIDERS.test(raw)) {
    const m = raw.match(MFS_PROVIDERS);
    if (m) matchedKeywords.push(m[0]);
    return { category: "advance_payment", level: "high_risk", matchedKeywords };
  }

  // 3. High Risk: Advance or upfront money request (e.g. "50% taka aage dewa lagbe", "taka aage dite hobe")
  if (isAdvancePaymentPattern(raw)) {
    const advMatch = raw.match(ADVANCE_WORDS);
    if (advMatch) matchedKeywords.push(advMatch[0]);
    const monMatch = raw.match(MONEY_WORDS);
    if (monMatch) matchedKeywords.push(monMatch[0]);
    if (matchedKeywords.length === 0) matchedKeywords.push("advance payment request");
    return { category: "advance_payment", level: "high_risk", matchedKeywords };
  }

  // 4. Phishing links
  if (SUSPICIOUS_LINKS.test(raw)) {
    const m = raw.match(SUSPICIOUS_LINKS);
    if (m) matchedKeywords.push(m[0]);
    return { category: "phishing_link", level: "high_risk", matchedKeywords };
  }

  // 5. Off-platform migration
  if (OFF_PLATFORM_WORDS.test(raw)) {
    const m = raw.match(OFF_PLATFORM_WORDS);
    if (m) matchedKeywords.push(m[0]);
    return { category: "off_platform", level: "caution", matchedKeywords };
  }

  // 6. High-pressure sales tactics
  if (HIGH_PRESSURE_WORDS.test(raw)) {
    const m = raw.match(HIGH_PRESSURE_WORDS);
    if (m) matchedKeywords.push(m[0]);
    return { category: "psychological_pressure", level: "caution", matchedKeywords };
  }

  return { category: null, level: "safe", matchedKeywords: [] };
}

/**
 * Scans conversation history locally with instant zero-latency feedback.
 * Checks ALL messages so typing or receiving "bkash" triggers immediate protection.
 */
export function analyzeConversationHistory(
  messages: Array<{ id: string; text: string; isOwn: boolean; senderName?: string }>
): ScamDetectionResult {
  const flaggedMessageIds: string[] = [];
  let worstLevel: ScamRiskLevel = "safe";
  let primaryCategory: ScamTriggerCategory | undefined = undefined;
  const allMatchedKeywords: string[] = [];

  const levelWeight: Record<ScamRiskLevel, number> = {
    safe: 0,
    caution: 1,
    high_risk: 2,
    critical: 3
  };

  for (const msg of messages) {
    const analysis = analyzeTextMessage(msg.text);

    if (analysis.level !== "safe") {
      flaggedMessageIds.push(msg.id);
      allMatchedKeywords.push(...analysis.matchedKeywords);

      if (levelWeight[analysis.level] > levelWeight[worstLevel]) {
        worstLevel = analysis.level;
        primaryCategory = analysis.category || undefined;
      }
    }
  }

  if (worstLevel === "safe") {
    return {
      hasRisk: false,
      level: "safe",
      matchedKeywords: [],
      alertTitle: "Chat Protected by CUET AI Scam Guardian",
      alertMessage: "All messages are monitored in real time for advance payment fraud & suspicious links.",
      actionAdvice: "Always trade in person at safe campus locations.",
      recommendedMeetingSpots: CUET_SAFE_MEETUP_SPOTS.map((s) => s.name),
      flaggedMessageIds: []
    };
  }

  let alertTitle = "CUET Safety Alert: Mobile Banking / Advance Cue Detected";
  let alertMessage =
    "A mention of bKash, Nagad, or upfront payment was detected in this conversation. Never send advance money before physically inspecting the product on campus.";
  let actionAdvice = "Insist on cash-on-delivery and meet at TSC Cafeteria or Central Library.";

  if (primaryCategory === "credential_theft") {
    alertTitle = "CRITICAL: Never Disclose OTP, PIN, or Password";
    alertMessage =
      "A request for an OTP or PIN code was detected. Genuine CUET students and admins will NEVER ask for your password or verification codes.";
    actionAdvice = "Do not share any codes. Report this user immediately.";
  } else if (primaryCategory === "advance_payment") {
    alertTitle = "Mobile Banking / Advance Payment Warning";
    alertMessage =
      "Never send advance booking money or partial payment via bKash/Nagad. Genuine CUET students exchange items and money face-to-face.";
    actionAdvice = "Suggest meeting at TSC Cafeteria or Main Gate for Cash-On-Delivery.";
  } else if (primaryCategory === "phishing_link") {
    alertTitle = "Warning: External Link or Redirect Detected";
    alertMessage =
      "Be extremely careful with shortened URLs or external links. They may lead to credential phishing or spoofed payment sites.";
    actionAdvice = "Keep all communication inside CUET E-Bazar.";
  } else if (primaryCategory === "off_platform") {
    alertTitle = "Off-Platform Contact Suggested";
    alertMessage =
      "Moving chats to WhatsApp or Telegram removes your campus buyer protection and chat logs.";
    actionAdvice = "We strongly advise keeping trade negotiations inside CUET E-Bazar.";
  }

  return {
    hasRisk: true,
    level: worstLevel,
    category: primaryCategory,
    matchedKeywords: Array.from(new Set(allMatchedKeywords)),
    alertTitle,
    alertMessage,
    actionAdvice,
    recommendedMeetingSpots: CUET_SAFE_MEETUP_SPOTS.map((s) => s.name),
    flaggedMessageIds
  };
}

/**
 * Real-time keystroke safety check for what the user is typing in the input box.
 * Triggers IMMEDIATELY on typing "bkash", "nagad", "advance", "send money", etc.
 */
export function checkDraftInput(draft: string): {
  isTriggered: boolean;
  warningText?: string;
} {
  if (!draft || !draft.trim()) return { isTriggered: false };

  const raw = draft.toLowerCase().trim();

  // Instant bKash / Nagad / Rocket trigger
  if (MFS_PROVIDERS.test(raw)) {
    return {
      isTriggered: true,
      warningText: "bKash / Mobile banking detected: CUET E-Bazar policy requires face-to-face Cash-on-Delivery."
    };
  }

  if (CREDENTIAL_WORDS.test(raw)) {
    return {
      isTriggered: true,
      warningText: "Security Warning: Never share OTPs, PINs, or security credentials in chat."
    };
  }

  if (isAdvancePaymentPattern(raw)) {
    return {
      isTriggered: true,
      warningText: "Advance payment cue detected: Never pay or ask for upfront deposits before campus inspection."
    };
  }

  return { isTriggered: false };
}

/**
 * Asynchronously calls the Next.js AI Scam Guardian endpoint (/api/ai/scam-guardian)
 * which analyzes the dialogue flow using Gemini 2.0 Flash / context reasoning.
 */
export async function requestAiScamAnalysis(payload: {
  messages: Array<{ id: string; senderName: string; text: string; isOwn: boolean; timestamp?: string }>;
  productContext?: { title?: string; price?: number; location?: string };
  participant?: { fullName: string; department?: string; hall?: string };
}): Promise<ScamDetectionResult> {
  try {
    const res = await fetch("/api/ai/scam-guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "AI Analysis request failed.");
    }

    return {
      hasRisk: Boolean(data.hasRisk),
      level: (data.riskLevel as ScamRiskLevel) || "safe",
      category: data.scamCategory as ScamTriggerCategory,
      matchedKeywords: [],
      alertTitle: data.alertTitle || "CUET AI Safety Advisory",
      alertMessage: data.alertMessage || data.aiReasoning || "Potential transaction risk detected.",
      actionAdvice: data.suggestedAction || "Meet in person at TSC Cafeteria or Central Library.",
      recommendedMeetingSpots: CUET_SAFE_MEETUP_SPOTS.map((s) => s.name),
      aiReasoning: data.aiReasoning,
      isAiPowered: data.isAiPowered,
      engine: data.engine,
      flaggedMessageIds: Array.isArray(data.flaggedMessageIds) ? data.flaggedMessageIds : []
    };
  } catch (err) {
    console.warn("AI Scam Guardian API fetch failed, using local analysis fallback:", err);
    return analyzeConversationHistory(payload.messages);
  }
}
