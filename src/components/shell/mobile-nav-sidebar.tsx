"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
 X,
 Home,
 ShoppingBag,
 Store,
 Gift,
 Package,
 ClipboardList,
 LayoutDashboard,
 MessageCircle,
 Heart,
 Settings,
 LogOut,
 LogIn,
 UserPlus,
 User,
 ShieldCheck,
 Bell
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth";

type MobileNavSidebarProps = {
 isOpen: boolean;
 onClose: () => void;
};

export function MobileNavSidebar({ isOpen, onClose }: MobileNavSidebarProps) {
 const pathname = usePathname();
 const router = useRouter();
 const { isLoggedIn, user, logout } = useAuth();

 // Close on route change
 useEffect(() => {
 onClose();
 }, [pathname]);

 // Close on escape key
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "Escape" && isOpen) {
 onClose();
 }
 };
 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [isOpen, onClose]);

 // Lock body scroll when open
 useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = "hidden";
 } else {
 document.body.style.overflow = "";
 }
 return () => {
 document.body.style.overflow = "";
 };
 }, [isOpen]);

 if (!isOpen) return null;

 const handleLogout = () => {
 logout();
 onClose();
 router.push("/");
 };

 const navItems = isLoggedIn
 ? [
 { name: "Home", href: "/", icon: Home },
 { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
 { name: "Giveaways", href: "/giveaways", icon: Gift },
 { name: "Campus Shops", href: "/shops", icon: Store },
 { name: "My Listings", href: "/my-listings", icon: Package },
 { name: "My Orders", href: "/my-orders", icon: ClipboardList },
 { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
 { name: "Messages", href: "/messages", icon: MessageCircle },
 { name: "Wishlist", href: "/wishlist", icon: Heart },
 { name: "Settings", href: "/settings", icon: Settings }
 ]
 : [
 { name: "Home", href: "/", icon: Home },
 { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
 { name: "Giveaways", href: "/giveaways", icon: Gift },
 { name: "Campus Shops", href: "/shops", icon: Store }
 ];

 return (
 <div className="fixed inset-0 z-50 md:hidden flex">
 {/* Backdrop */}
 <div
 className="fixed inset-0 bg-black/65 transition-opacity animate-in fade-in duration-200"
 onClick={onClose}
 aria-hidden="true"
 />

 {/* Drawer */}
 <aside className="relative z-50 w-72 sm:w-80 max-w-[85vw] bg-[#131921] text-white shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200 border-r border-slate-700/60">
 {/* Drawer Header */}
 <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-[#0f141a]">
 <Logo href={user?.role === "shop_owner" ? "/my-shop" : "/"} />
 <button
 type="button"
 onClick={onClose}
 aria-label="Close navigation"
 className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition active:scale-95"
 >
 <X size={18} />
 </button>
 </div>

 {/* User Card inside Drawer */}
 <div className="px-4 py-3 border-b border-slate-800/80 bg-[#1a232e]/50">
 {isLoggedIn ? (
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-full bg-brand-emerald text-white font-bold flex items-center justify-center text-base shadow-sm ring-2 ring-emerald-400/40 shrink-0">
 {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User size={18} />}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-white truncate leading-tight">
 {user?.fullName || "Student User"}
 </p>
 <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
 <ShieldCheck size={12} className="text-emerald-400" />
 <span className="truncate">{user?.hall || "CUET Campus"}</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-2">
 <p className="text-xs text-slate-300">Welcome to CUET E-Bazar</p>
 <div className="flex gap-2">
 <Link
 href="/login"
 className="flex-1 rounded-lg bg-brand-emerald py-1.5 text-center text-xs font-bold text-white hover:bg-[#0d665f] transition"
 >
 Sign In
 </Link>
 <Link
 href="/signup"
 className="flex-1 rounded-lg bg-[#ffa41c] py-1.5 text-center text-xs font-bold text-[#0f1111] hover:bg-[#f39200] transition"
 >
 Register
 </Link>
 </div>
 </div>
 )}
 </div>

 {/* Navigation Link List */}
 <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
 <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
 Navigation Menu
 </p>

 {navItems.map((item) => {
 const Icon = item.icon;
 const isActive =
 item.href === "/"
 ? pathname === "/"
 : item.href === "/home"
 ? pathname === "/home" || pathname === "/"
 : pathname === item.href || pathname.startsWith(`${item.href}/`);

 return (
 <Link
 key={item.href}
 href={item.href}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
 isActive
 ? "bg-brand-emerald text-white font-bold shadow-sm"
 : "text-slate-300 hover:text-white hover:bg-white/10 font-medium"
 }`}
 >
 <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
 <span className="flex-1 truncate">{item.name}</span>
 {isActive && (
 <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-sm shrink-0" />
 )}
 </Link>
 );
 })}
 </div>

 {/* Drawer Footer Actions */}
 <div className="p-3 border-t border-slate-800 bg-[#0f141a] space-y-2">
 <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
 <span>Dark Mode</span>
 <ThemeToggle className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition" size={16} />
 </div>

 {isLoggedIn && (
 <button
 onClick={handleLogout}
 className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition active:scale-95 cursor-pointer shadow-sm"
 >
 <LogOut size={16} />
 <span>Log Out</span>
 </button>
 )}
 </div>
 </aside>
 </div>
 );
}
