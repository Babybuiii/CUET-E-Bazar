"use client";

import { useEffect, useState, useRef, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  CheckCircle2,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Search,
  Loader2,
  LogIn,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Gift
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Participant = {
  _id: string;
  fullName: string;
  userId?: string;
  department?: string;
  hall?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  role?: string;
};

type AttachedProduct = {
  _id?: string;
  title: string;
  price: number;
  image?: string;
  status?: string;
  location?: string;
};

type AttachedGiveaway = {
  _id?: string;
  title: string;
  image?: string;
  location?: string;
  pickupSpot?: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
};

type ConversationItem = {
  id: string;
  participant: Participant;
  product?: AttachedProduct;
  giveaway?: AttachedGiveaway;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query params passed from "Chat with Seller" or "Message Donor / Claimant"
  const conversationId = searchParams.get("conversationId") || "";
  const sellerId = searchParams.get("sellerId") || "";
  const sellerName = searchParams.get("sellerName") || "";
  const productId = searchParams.get("productId") || "";
  const productTitle = searchParams.get("productTitle") || "";
  const productPrice = searchParams.get("productPrice") || "";
  const productImage = searchParams.get("productImage") || "";

  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [selfChatNotice, setSelfChatNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const prevActiveChatIdRef = useRef<string>("");
  const hasInitializedFromQuery = useRef(false);

  // Auto scroll inside chat container (preventing whole-page viewport jumps)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  useEffect(() => {
    const isNewChat = activeChatId !== prevActiveChatIdRef.current;
    const hasMoreMessages = messages.length > prevMessageCountRef.current;

    if (isNewChat) {
      prevActiveChatIdRef.current = activeChatId;
      prevMessageCountRef.current = messages.length;
      // Instant scroll to bottom when opening a chat
      setTimeout(() => scrollToBottom("auto"), 50);
    } else if (hasMoreMessages) {
      prevMessageCountRef.current = messages.length;
      scrollToBottom("smooth");
    }
  }, [messages, activeChatId, scrollToBottom]);

  // Draft conversation fallback when someone clicks "Chat with Seller"
  const draftConversation = useMemo<ConversationItem | null>(() => {
    if (!sellerId && !sellerName) return null;
    return {
      id: "draft_new_chat",
      participant: {
        _id: sellerId || "seller_id",
        fullName: sellerName || "Seller",
        department: "CUET Member",
        hall: "CUET Campus",
        isVerified: true
      },
      product: productTitle
        ? {
            _id: productId,
            title: productTitle,
            price: Number(productPrice) || 0,
            image: productImage || ""
          }
        : undefined,
      lastMessage: "Start a conversation",
      timestamp: "Now"
    };
  }, [sellerId, sellerName, productId, productTitle, productPrice, productImage]);

  // ── Fetch conversations from MongoDB database ──
  const fetchConversations = useCallback(async (selectIdAfter?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.conversations)) {
        const myId = data.currentUserId || "";
        if (myId) setCurrentUserId(myId);

        const parsed: ConversationItem[] = data.conversations.map((c: any) => {
          const other = c.participants?.find((p: any) => p._id !== myId) || c.participants?.[0] || {};
          const firstImg = c.product?.images?.[0];
          const pImg = typeof firstImg === "object" ? firstImg?.thumbnailUrl || firstImg?.url : firstImg;

          const firstGImg = c.giveaway?.images?.[0];
          const gImg = typeof firstGImg === "object" ? firstGImg?.url : firstGImg;

          return {
            id: c._id,
            participant: {
              _id: other._id || "",
              fullName: other.fullName || "Campus User",
              department: other.department || "CUET Member",
              hall: other.hall || "CUET Campus",
              isVerified: other.isVerified || false
            },
            product: c.product
              ? {
                  _id: c.product._id,
                  title: c.product.title,
                  price: c.product.price,
                  image: pImg || ""
                }
              : undefined,
            giveaway: c.giveaway
              ? {
                  _id: c.giveaway._id,
                  title: c.giveaway.title,
                  image: gImg || "",
                  location: c.giveaway.location,
                  pickupSpot: c.giveaway.pickupSpot
                }
              : undefined,
            lastMessage: c.lastMessage?.text || "No messages yet",
            timestamp: c.lastMessage?.sentAt
              ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : ""
          };
        });

        setConversations(parsed);

        if (selectIdAfter) {
          setActiveChatId(selectIdAfter);
          setIsMobileChatOpen(true);
        } else {
          setActiveChatId((prev) => {
            if (prev) return prev;
            if (parsed.length > 0) return parsed[0].id;
            return "";
          });
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch messages for active conversation ──
  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId || convId === "draft_new_chat") {
      setMessages([]);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.messages)) {
        const myId = data.currentUserId || currentUserId;
        const mapped: ChatMessage[] = data.messages.map((m: any) => ({
          id: m._id,
          senderId: m.sender?._id || m.sender,
          senderName: m.sender?.fullName || "User",
          text: m.text,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          isOwn: (m.sender?._id || m.sender) === myId
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [currentUserId]);

  // ── Handle Initial Load and Starting Chat from URL ──
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    const init = async () => {
      setLoading(true);

      // 0. If conversationId is passed in query params (e.g. from Giveaways), select and load that conversation
      if (conversationId && !hasInitializedFromQuery.current) {
        hasInitializedFromQuery.current = true;
        setActiveChatId(conversationId);
        setIsMobileChatOpen(true);
        await fetchConversations(conversationId);
        await fetchMessages(conversationId);
        return;
      }

      // 1. If sellerId is passed in query params, try starting or finding real conversation
      if (sellerId && !hasInitializedFromQuery.current) {
        hasInitializedFromQuery.current = true;
        // Check if sellerId is the user themself
        const localUserStr = localStorage.getItem("cuet_ebazar_user");
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            if (localUser._id === sellerId) {
              setSelfChatNotice("This is your own listing. You cannot chat with yourself.");
              setActiveChatId("draft_new_chat");
              setIsMobileChatOpen(true);
              await fetchConversations();
              return;
            }
          } catch (e) {
            // Ignore parse error
          }
        }

        // Set draft chat immediately so the screen is never blank
        setActiveChatId("draft_new_chat");
        setIsMobileChatOpen(true);

        try {
          const res = await fetch(`${API_BASE_URL}/api/messages/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              recipientId: sellerId,
              productId: productId || null
            })
          });
          const data = await res.json();

          if (!isSubscribed) return;

          if (data.isSelf) {
            setSelfChatNotice("This is your own listing.");
          } else if (data.success && data.conversation) {
            const realId = data.conversation._id;
            setActiveChatId(realId);
            await fetchConversations(realId);
            await fetchMessages(realId);
            return;
          }
        } catch (err) {
          console.error("Error starting conversation with seller:", err);
        }
      }

      if (isSubscribed) {
        await fetchConversations();
      }
    };

    init();

    return () => {
      isSubscribed = false;
    };
  }, [sellerId, productId, conversationId, fetchConversations, fetchMessages]);

  // Load messages whenever activeChatId changes (and poll for new messages)
  useEffect(() => {
    if (activeChatId && activeChatId !== "draft_new_chat") {
      fetchMessages(activeChatId);

      const interval = setInterval(() => {
        fetchMessages(activeChatId);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [activeChatId, fetchMessages]);

  // ── Send Message ──
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSending(true);

      // Case A: Creating new conversation from draft
      if (activeChatId === "draft_new_chat" || !activeChatId) {
        if (!sellerId) {
          console.error("No recipient specified for draft conversation");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/messages/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            recipientId: sellerId,
            productId: productId || null,
            initialText: text
          })
        });

        const data = await res.json();

        if (data.isSelf) {
          setSelfChatNotice("This is your own listing. You cannot message yourself.");
          return;
        }

        if (data.success && data.conversation) {
          const newConvId = data.conversation._id;
          setActiveChatId(newConvId);
          setInputText("");
          await fetchConversations(newConvId);
          await fetchMessages(newConvId);
        }
        return;
      }

      // Case B: Sending in an existing conversation
      const res = await fetch(`${API_BASE_URL}/api/messages/${activeChatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (data.success && data.message) {
        const newMsg: ChatMessage = {
          id: data.message._id,
          senderId: data.message.sender?._id || currentUserId,
          senderName: data.message.sender?.fullName || "Me",
          text: data.message.text,
          timestamp: new Date(data.message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          isOwn: true
        };

        setMessages((prev) => [...prev, newMsg]);
        setInputText("");

        // Update last message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  lastMessage: text,
                  timestamp: "Just now"
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // Resolve currently active conversation (existing or draft)
  const activeConv = useMemo(() => {
    const found = conversations.find((c) => c.id === activeChatId);
    if (found) return found;
    if (activeChatId === "draft_new_chat" || (sellerId && !found)) {
      return draftConversation;
    }
    return null;
  }, [conversations, activeChatId, sellerId, draftConversation]);

  const filteredConversations = conversations.filter(
    (c) =>
      c.participant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.product?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Not logged in screen ──
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-3xl bg-brand-emerald/10 text-brand-emerald flex items-center justify-center mb-4">
          <MessageCircle size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Please Log In to Access Your Inbox
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          You need an active CUET student or seller account to send and receive real-time messages.
        </p>
        <Link href="/login" className="mt-6">
          <Button className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-6 py-2.5">
            <LogIn size={16} className="mr-2" /> Log In to Continue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Hidden on mobile when inside an active chat room for immersive Messenger feel */}
      <div className={`items-center justify-between ${isMobileChatOpen ? "hidden lg:flex" : "flex"}`}>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Campus Inbox & Chat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time chat between verified CUET buyers and sellers ({conversations.length} active chats).
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20">
          <ShieldCheck size={14} className="text-brand-emerald" /> Safe Campus Messaging
        </div>
      </div>

      {/* Main Messaging Container: Full viewport height on mobile like Messenger, fixed height card on PC */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 grid lg:grid-cols-[340px_1fr] h-[calc(100dvh-135px)] sm:h-[680px] shadow-sm">
        {/* ── Left Sidebar: Conversations List (All Inboxes) ── */}
        <div
          className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden ${
            isMobileChatOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search Bar & Refresh */}
          <div className="p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border-none pl-8 pr-3 py-1.5 sm:py-2 text-xs focus:ring-2 focus:ring-brand-emerald/30 focus:outline-none"
              />
            </div>
            <button
              onClick={() => fetchConversations()}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title="Refresh conversations"
              aria-label="Refresh conversations"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs">
                <Loader2 size={24} className="animate-spin text-brand-emerald mb-2" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No active conversations yet</p>
                <p className="mt-1 text-slate-500">
                  Click &quot;Chat with Seller&quot; on any listed product to start negotiating.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeChatId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveChatId(conv.id);
                      setIsMobileChatOpen(true);
                    }}
                    className={`w-full text-left p-3 sm:p-3.5 transition flex items-start gap-2.5 sm:gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
                      isActive
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-brand-emerald"
                        : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-xs sm:text-sm">
                        {conv.participant.fullName[0] || "?"}
                      </div>
                      {conv.participant.isVerified && (
                        <CheckCircle2
                          size={12}
                          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-slate-900 text-brand-emerald"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {conv.participant.fullName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.timestamp}</span>
                      </div>

                      {conv.product && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-brand-emerald mt-0.5 truncate">
                          <ShoppingBag size={11} className="shrink-0" />
                          <span className="truncate">{conv.product.title}</span>
                          <span className="text-slate-500 font-normal">৳{conv.product.price}</span>
                        </div>
                      )}

                      {conv.giveaway && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#0f766e] mt-0.5 truncate">
                          <Gift size={11} className="shrink-0 text-[#0f766e]" />
                          <span className="truncate">{conv.giveaway.title}</span>
                          <span className="text-[#0f766e] font-bold text-[9px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                            FREE
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Active Chat Room ── */}
        <div
          className={`flex flex-col bg-slate-50/50 dark:bg-slate-900/30 h-full overflow-hidden ${
            !isMobileChatOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Room Header */}
              <div className="p-2.5 sm:p-3.5 px-3 sm:px-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {/* Avatar */}
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-xs sm:text-sm">
                    {activeConv.participant.fullName[0] || "?"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {activeConv.participant.fullName}
                      </h2>
                      {activeConv.participant.isVerified && (
                        <span title="Verified CUET Student">
                          <CheckCircle2 size={13} className="text-brand-emerald shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      {activeConv.participant.department} • {activeConv.participant.hall}
                    </p>
                  </div>
                </div>

                {/* Direct Product Link */}
                {activeConv.product?._id && (
                  <Link
                    href={`/marketplace/${activeConv.product._id}`}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-brand-emerald hover:underline shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 sm:px-2.5 py-1 rounded-lg border border-emerald-500/20"
                  >
                    <span className="hidden sm:inline">View Listing</span>
                    <span className="sm:hidden">Item</span>
                    <ExternalLink size={11} />
                  </Link>
                )}

                {/* Direct Giveaway Link */}
                {activeConv.giveaway?._id && (
                  <Link
                    href="/giveaways"
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#0f766e] hover:underline shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 sm:px-2.5 py-1 rounded-lg border border-emerald-500/20"
                  >
                    <span className="hidden sm:inline">View Giveaway</span>
                    <span className="sm:hidden">Item</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>

              {/* Self listing alert banner if user opened chat on own ad */}
              {selfChatNotice && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40 px-3 sm:px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shrink-0">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  <span className="truncate">{selfChatNotice}</span>
                </div>
              )}

              {/* Attached Giveaway Context Banner */}
              {activeConv.giveaway && (
                <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-500/20 p-2 sm:p-2.5 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-[#0f766e] shrink-0 border border-emerald-200">
                      <Gift size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        🎁 Giveaway: {activeConv.giveaway.title}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Pickup: {activeConv.giveaway.location}{activeConv.giveaway.pickupSpot ? ` — ${activeConv.giveaway.pickupSpot}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] sm:text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 bg-white/90 dark:bg-slate-900/90 rounded-full border border-emerald-300 shrink-0">
                    100% FREE
                  </span>
                </div>
              )}

              {/* Attached Product Context Banner */}
              {activeConv.product && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-500/20 p-2 sm:p-2.5 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeConv.product.image ? (
                      activeConv.product.image.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeConv.product.image}
                          alt={activeConv.product.title}
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                          <Image
                            src={activeConv.product.image}
                            alt={activeConv.product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {activeConv.product.title}
                      </p>
                      <p className="text-[11px] sm:text-xs font-extrabold text-brand-emerald">
                        ৳{activeConv.product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] sm:text-[10px] text-emerald-800 dark:text-emerald-300 font-medium px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 rounded-full shrink-0">
                    Negotiating
                  </span>
                </div>
              )}

              {/* Messages Feed */}
              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3.5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8 sm:py-12">
                    <MessageCircle size={32} className="opacity-30 mb-2 text-brand-emerald" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Start your conversation with {activeConv.participant.fullName}!
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Send a message below or pick a negotiation prompt to ask about availability and meetups.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm break-words overflow-hidden ${
                          msg.isOwn
                            ? "bg-brand-emerald text-white rounded-tr-none"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Negotiation Prompt Chips */}
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/70 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] sm:text-[11px] shrink-0 no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleSendMessage("Assalamu Alaikum! Is this still available?")}
                  className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[10px] sm:text-[11px] shrink-0"
                >
                  👋 Available?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Can we meet at the Central Library for inspection?")}
                  className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[10px] sm:text-[11px] shrink-0"
                >
                  📍 Meet at Library?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Can we meet near Central Cafeteria?")}
                  className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[10px] sm:text-[11px] shrink-0"
                >
                  ☕ Meet at Cafeteria?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Is the price slightly negotiable?")}
                  className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[10px] sm:text-[11px] shrink-0"
                >
                  💰 Negotiable?
                </button>
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2 sm:p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder={`Message ${activeConv.participant.fullName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-emerald/40"
                />
                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl disabled:opacity-50 text-xs sm:text-sm shrink-0"
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={15} className="sm:mr-1.5" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <MessageCircle size={32} className="text-brand-emerald" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">
                Select a conversation
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a chat from the left or press &quot;Chat with Seller&quot; on any product page to start negotiating.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading campus messages...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
