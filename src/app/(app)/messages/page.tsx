"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
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
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query params passed from "Chat with Seller"
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Fetch conversations from MongoDB database ──
  const fetchConversations = useCallback(async (selectIdAfter?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.conversations)) {
        const myId = data.currentUserId || "";
        setCurrentUserId(myId);

        const parsed: ConversationItem[] = data.conversations.map((c: any) => {
          const other = c.participants?.find((p: any) => p._id !== myId) || c.participants?.[0] || {};
          const firstImg = c.product?.images?.[0];
          const pImg = typeof firstImg === "object" ? firstImg?.thumbnailUrl || firstImg?.url : firstImg;

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
        } else if (!activeChatId && parsed.length > 0) {
          setActiveChatId(parsed[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChatId]);

  // ── Handle starting a conversation with seller ──
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);

      // If redirected with a specific sellerId, start or find real conversation in DB
      if (sellerId) {
        try {
          const res = await fetch("http://localhost:5000/api/messages/start", {
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
          if (data.success && data.conversation) {
            await fetchConversations(data.conversation._id);
            return;
          }
        } catch (err) {
          console.error("Error starting conversation with seller:", err);
        }
      }

      await fetchConversations();
    };

    init();
  }, [sellerId, productId, fetchConversations]);

  // ── Fetch messages for active conversation ──
  const fetchMessages = useCallback(async (convId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token || !convId) return;

    try {
      const res = await fetch(`http://localhost:5000/api/messages/${convId}`, {
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

  // Load messages whenever activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    }
  }, [activeChatId, fetchMessages]);

  // Poll for new incoming messages from the seller/other user every 4 seconds
  useEffect(() => {
    if (!activeChatId) return;
    const interval = setInterval(() => {
      fetchMessages(activeChatId);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeChatId, fetchMessages]);

  // ── Send Message ──
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeChatId || sending) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSending(true);
      const res = await fetch(`http://localhost:5000/api/messages/${activeChatId}`, {
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

  const activeConv = conversations.find((c) => c.id === activeChatId);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Campus Inbox & Chat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time chat between verified CUET buyers and sellers.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20">
          <ShieldCheck size={14} className="text-brand-emerald" /> Safe Campus Messaging
        </div>
      </div>

      {/* Main Messaging Container */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 grid lg:grid-cols-[340px_1fr] min-h-[620px] shadow-sm">
        {/* ── Left Sidebar: Conversations List ── */}
        <div
          className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col ${
            isMobileChatOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search Bar & Refresh */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border-none pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-brand-emerald/30 focus:outline-none"
              />
            </div>
            <button
              onClick={() => fetchConversations()}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
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
                <p className="font-semibold text-slate-700 dark:text-slate-300">No conversations yet</p>
                <p className="mt-1 text-slate-500">
                  Click &quot;Chat with Seller&quot; on any listed product to start chatting.
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
                    className={`w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
                      isActive
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-brand-emerald"
                        : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-sm">
                        {conv.participant.fullName[0] || "?"}
                      </div>
                      {conv.participant.isVerified && (
                        <CheckCircle2
                          size={13}
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
          className={`flex flex-col bg-slate-50/50 dark:bg-slate-900/30 ${
            !isMobileChatOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Room Header */}
              <div className="p-3.5 px-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-sm">
                    {activeConv.participant.fullName[0]}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {activeConv.participant.fullName}
                      </h2>
                      {activeConv.participant.isVerified && (
                        <span title="Verified CUET Student">
                          <CheckCircle2 size={14} className="text-brand-emerald" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {activeConv.participant.department} • {activeConv.participant.hall}
                    </p>
                  </div>
                </div>

                {/* Direct Product Link */}
                {activeConv.product?._id && (
                  <Link
                    href={`/marketplace/${activeConv.product._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-emerald hover:underline shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                  >
                    <span>View Listing</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Attached Product Context Banner */}
              {activeConv.product && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-500/20 p-2.5 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {activeConv.product.image ? (
                      activeConv.product.image.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeConv.product.image}
                          alt={activeConv.product.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                          <Image
                            src={activeConv.product.image}
                            alt={activeConv.product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {activeConv.product.title}
                      </p>
                      <p className="text-xs font-extrabold text-brand-emerald">
                        ৳{activeConv.product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 rounded-full shrink-0">
                    Item under discussion
                  </span>
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
                    <MessageCircle size={32} className="opacity-30 mb-2" />
                    <p className="text-xs text-slate-500">
                      No messages yet with {activeConv.participant.fullName}. Send a message to start the negotiation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                          msg.isOwn
                            ? "bg-brand-emerald text-white rounded-tr-none"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Negotiation Prompt Chips */}
              <div className="px-4 py-2 bg-white/70 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  onClick={() => handleSendMessage("Assalamu Alaikum! Is this still available?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  👋 Is this still available?
                </button>
                <button
                  onClick={() => handleSendMessage("Can we meet at the Central Library for inspection?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  📍 Meet at Central Library?
                </button>
                <button
                  onClick={() => handleSendMessage("Can we meet near Central Cafeteria?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  ☕ Meet at Central Cafeteria?
                </button>
                <button
                  onClick={() => handleSendMessage("Is the price slightly negotiable?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
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
                className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${activeConv.participant.fullName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-emerald/40"
                />
                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-4 py-2.5 rounded-xl disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} className="sm:mr-1.5" />
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
