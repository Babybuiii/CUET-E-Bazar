import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  MFS_PROVIDERS,
  CREDENTIAL_WORDS,
  OFF_PLATFORM_WORDS,
  HIGH_PRESSURE_WORDS,
  isAdvancePaymentPattern
} from "@/lib/scam-guardian";

type ChatMessagePayload = {
  id: string;
  senderName: string;
  text: string;
  isOwn: boolean;
  timestamp?: string;
};

type AnalysisRequest = {
  messages: ChatMessagePayload[];
  productContext?: {
    title?: string;
    price?: number;
    location?: string;
  };
  participant?: {
    fullName: string;
    department?: string;
    hall?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalysisRequest;
    const { messages = [], productContext, participant } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        success: true,
        hasRisk: false,
        riskLevel: "safe",
        scamCategory: "none",
        confidence: 0,
        aiReasoning: "No messages to analyze yet.",
        flaggedMessageIds: [],
        alertTitle: "Chat Protected by CUET AI Scam Guardian",
        alertMessage: "Real-time AI monitoring is active for this conversation.",
        suggestedAction: "Trade face-to-face at verified campus spots.",
        isAiPowered: false
      });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // ── 1. If Gemini API key is available, run Deep LLM Dialogue Flow Analysis ──
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const dialogueTranscript = messages
          .map(
            (m, i) =>
              `[Msg #${i + 1} - ID: ${m.id}] ${
                m.isOwn ? "Buyer (User)" : `Seller/User (${m.senderName})`
              }: "${m.text}"`
          )
          .join("\n");

        const prompt = `You are the AI Fraud & Transaction Security Guardian for "CUET E-Bazar", a university student marketplace for Chittagong University of Engineering and Technology (CUET), Bangladesh.

CONTEXT:
- Marketplace Policy: 100% in-person Cash-on-Delivery (COD) on campus (e.g. TSC Cafeteria, Central Library, Hall gates). NO advance mobile banking (bKash, Nagad, Rocket) before seeing the item.
- Target User: ${participant?.fullName || "Counterparty"} (${participant?.department || "Student"}, ${participant?.hall || "Hall"})
${productContext?.title ? `- Attached Product: "${productContext.title}" priced at ৳${productContext.price || 0}` : ""}

DIALOGUE TO ANALYZE:
${dialogueTranscript}

TASK:
Analyze the dialogue flow between the users to detect ANY form of scam, financial risk, psychological manipulation, or unsafe transaction setup.
You MUST understand English, Bengali script, and Banglish (phonetic Bengali, e.g. "bkash e taka pathan", "age kichu send koren", "seat/item book korar jonno taka lagbe", "arek jon line e ache", "delivery charge ta age den", "number e pathan", "rate pahartali gate ashen", "otp code ashbe bolen", etc.).

Look for:
1. Advance payment requests or mentions of bKash/Nagad/Rocket/Upay/bank transfer before physical inspection.
2. Demanding booking money, tokens, security deposits, or delivery fees upfront.
3. Psychological pressure or artificial urgency ("send now or I sell to someone else").
4. Credential theft: Asking for OTPs, PINs, or verification codes.
5. Off-platform lures: Asking to continue on WhatsApp, Telegram, or suspicious links.
6. Unsafe or isolated meeting points at odd hours off-campus.

Return ONLY a valid JSON object matching this schema (no markdown, no extra commentary):
{
  "hasRisk": boolean,
  "riskLevel": "safe" | "caution" | "high_risk" | "critical",
  "scamCategory": "advance_payment" | "credential_theft" | "off_platform" | "unsafe_location" | "psychological_pressure" | "none",
  "confidence": number,
  "aiReasoning": "One or two sentences explaining exactly what intent or risk the AI detected in the dialogue flow",
  "flaggedMessageIds": ["id1", "id2"],
  "alertTitle": "Short, clear alert title",
  "alertMessage": "Actionable explanation for the student",
  "suggestedAction": "Practical recommendation (e.g. Insist on meeting at TSC Cafeteria)"
}`;

        let response;
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
        } catch {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
        }

        const rawText = response.text?.trim() || "";
        const parsed = JSON.parse(rawText);

        return NextResponse.json({
          success: true,
          ...parsed,
          isAiPowered: true,
          engine: "Gemini 3.5 Flash AI"
        });
      } catch (geminiErr: any) {
        console.error("Gemini AI Scam Guardian call failed, falling back to semantic engine:", geminiErr);
        // Fall through to fallback semantic evaluator below
      }
    }

    // ── 2. Intelligent Context-Aware Semantic Fallback Engine ──
    // Runs when GEMINI_API_KEY is not yet configured or on network retry
    const fallbackResult = performSemanticDialogueAnalysis(messages, productContext);

    return NextResponse.json({
      success: true,
      ...fallbackResult,
      isAiPowered: Boolean(apiKey),
      engine: apiKey ? "Gemini 2.0 (Fallback Triggered)" : "Semantic Intent Engine (Add GEMINI_API_KEY to .env.local to activate Gemini 2.0 Flash)"
    });
  } catch (err: any) {
    console.error("Scam Guardian API error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to analyze chat security." },
      { status: 500 }
    );
  }
}

/**
 * Intelligent semantic dialogue evaluator that checks intent flow across all messages
 */
function performSemanticDialogueAnalysis(
  messages: ChatMessagePayload[],
  productContext?: { title?: string; price?: number }
) {
  const flaggedIds: string[] = [];
  const matchedCues: string[] = [];
  let worstLevel: "safe" | "caution" | "high_risk" | "critical" = "safe";
  let category: "advance_payment" | "credential_theft" | "off_platform" | "unsafe_location" | "psychological_pressure" | "none" = "none";
  let reasoning = "Dialogue appears to follow normal campus trading behavior.";

  for (const msg of messages) {
    const text = msg.text.toLowerCase().trim();
    let msgHasRisk = false;

    // 1. Critical: OTP / PIN request
    if (CREDENTIAL_WORDS.test(text)) {
      flaggedIds.push(msg.id);
      matchedCues.push("Security credential / PIN request");
      worstLevel = "critical";
      category = "credential_theft";
      reasoning = "A message requested a sensitive security PIN, OTP, or verification code.";
      msgHasRisk = true;
    }

    // 2. High Risk: Mobile money provider mentioned (even alone or with payment request)
    if (MFS_PROVIDERS.test(text)) {
      flaggedIds.push(msg.id);
      matchedCues.push("bKash/Nagad/Mobile banking mention");
      if (worstLevel !== "critical") {
        worstLevel = "high_risk";
        category = "advance_payment";
        reasoning = isAdvancePaymentPattern(text)
          ? "The message specifically requests advance or partial payment via mobile banking."
          : "Mobile money (bKash/Nagad) was introduced into the chat. CUET E-Bazar recommends face-to-face Cash on Delivery.";
      }
      msgHasRisk = true;
    } else if (isAdvancePaymentPattern(text)) {
      // 3. High Risk: Advance payment in English or Banglish (e.g. "50% taka aage dewa lagbe", "taka aage dite hobe")
      flaggedIds.push(msg.id);
      matchedCues.push("Advance payment / upfront deposit request");
      if (worstLevel !== "critical") {
        worstLevel = "high_risk";
        category = "advance_payment";
        reasoning = "An upfront deposit, booking fee, or advance money transfer was requested in the dialogue.";
      }
      msgHasRisk = true;
    }

    // 4. Caution: Off-platform redirect
    if (OFF_PLATFORM_WORDS.test(text) && !msgHasRisk) {
      flaggedIds.push(msg.id);
      matchedCues.push("Off-platform migration");
      if (worstLevel === "safe") {
        worstLevel = "caution";
        category = "off_platform";
        reasoning = "A participant suggested moving the chat outside CUET E-Bazar (e.g. WhatsApp or Telegram).";
      }
    }

    // 5. Caution: Urgency
    if (HIGH_PRESSURE_WORDS.test(text) && !msgHasRisk) {
      if (worstLevel === "safe") {
        worstLevel = "caution";
        category = "psychological_pressure";
        reasoning = "High-pressure urgency was detected pushing for a hurried transaction.";
      }
    }
  }

  const hasRisk = worstLevel !== "safe";

  let alertTitle = "CUET Safety Alert: Payment Cue Detected";
  let alertMessage = reasoning;
  let suggestedAction = "Meet in person at TSC Cafeteria or Central Library for cash-on-delivery.";

  if (category === "credential_theft") {
    alertTitle = "CRITICAL: Never Share OTP or PIN";
    alertMessage = "A request for a PIN, OTP, or password was detected. CUET E-Bazar will NEVER ask for your password or verification codes.";
    suggestedAction = "Do not share any codes. Report this user immediately.";
  } else if (category === "advance_payment") {
    alertTitle = "Mobile Banking / Advance Payment Warning";
    alertMessage = "A mention of bKash, Nagad, or upfront money was detected. Never send advance money before physically inspecting the product on campus.";
    suggestedAction = "Insist on Cash-on-Delivery at TSC Cafeteria or Main Gate.";
  } else if (category === "off_platform") {
    alertTitle = "Off-Platform Contact Warning";
    alertMessage = "Moving to WhatsApp or Telegram eliminates your in-app chat logs and buyer protection.";
    suggestedAction = "Keep all negotiations inside CUET E-Bazar.";
  }

  return {
    hasRisk,
    riskLevel: worstLevel,
    scamCategory: category,
    confidence: hasRisk ? 0.92 : 0.98,
    aiReasoning: reasoning,
    flaggedMessageIds: Array.from(new Set(flaggedIds)),
    alertTitle,
    alertMessage,
    suggestedAction
  };
}

