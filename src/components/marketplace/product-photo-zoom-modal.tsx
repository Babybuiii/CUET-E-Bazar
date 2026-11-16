"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
 X,
 ZoomIn,
 ZoomOut,
 RotateCcw,
 ChevronLeft,
 ChevronRight,
 Maximize2,
 Move,
 Info
} from "lucide-react";
import Image from "next/image";

type ProductPhoto = {
 url?: string;
 thumbnailUrl?: string;
};

type ProductPhotoZoomModalProps = {
 isOpen: boolean;
 onClose: () => void;
 images: (ProductPhoto | string)[];
 initialIndex?: number;
 productTitle?: string;
};

export function ProductPhotoZoomModal({
 isOpen,
 onClose,
 images,
 initialIndex = 0,
 productTitle = "Product Photo"
}: ProductPhotoZoomModalProps) {
 const [currentIndex, setCurrentIndex] = useState(initialIndex);
 const [zoom, setZoom] = useState(1);
 const [pan, setPan] = useState({ x: 0, y: 0 });
 const [isDragging, setIsDragging] = useState(false);
 const dragStartRef = useRef({ x: 0, y: 0 });
 const panStartRef = useRef({ x: 0, y: 0 });
 const containerRef = useRef<HTMLDivElement>(null);

 // Sync index when initialIndex changes or modal opens
 useEffect(() => {
 if (isOpen) {
 setCurrentIndex(initialIndex);
 setZoom(1);
 setPan({ x: 0, y: 0 });
 }
 }, [isOpen, initialIndex]);

 // Lock body scroll while modal is open
 useEffect(() => {
 if (!isOpen) return;
 const prevOverflow = document.body.style.overflow;
 document.body.style.overflow = "hidden";
 return () => {
 document.body.style.overflow = prevOverflow;
 };
 }, [isOpen]);

 // Reset zoom & pan when image changes
 const changeImage = useCallback((newIdx: number) => {
 setCurrentIndex(newIdx);
 setZoom(1);
 setPan({ x: 0, y: 0 });
 }, []);

 const handlePrev = useCallback(() => {
 if (images.length <= 1) return;
 changeImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
 }, [currentIndex, images.length, changeImage]);

 const handleNext = useCallback(() => {
 if (images.length <= 1) return;
 changeImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
 }, [currentIndex, images.length, changeImage]);

 // Isolated mouse wheel zoom (strictly prevents page scroll/zoom)
 useEffect(() => {
 if (!isOpen) return;
 const container = containerRef.current;
 if (!container) return;

 const handleWheel = (e: WheelEvent) => {
 e.preventDefault();
 e.stopPropagation();

 const delta = -e.deltaY * 0.0025;
 setZoom((prev) => {
 const nextZoom = Math.min(4, Math.max(1, Number((prev + delta).toFixed(2))));
 if (nextZoom === 1) {
 setPan({ x: 0, y: 0 });
 }
 return nextZoom;
 });
 };

 container.addEventListener("wheel", handleWheel, { passive: false });
 return () => {
 container.removeEventListener("wheel", handleWheel);
 };
 }, [isOpen]);

 // Keyboard navigation & zoom shortcuts
 useEffect(() => {
 if (!isOpen) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "Escape") {
 onClose();
 } else if (e.key === "ArrowLeft") {
 handlePrev();
 } else if (e.key === "ArrowRight") {
 handleNext();
 } else if (e.key === "+" || e.key === "=") {
 setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
 } else if (e.key === "-" || e.key === "_") {
 setZoom((z) => {
 const nextZ = Math.max(1, Number((z - 0.25).toFixed(2)));
 if (nextZ === 1) setPan({ x: 0, y: 0 });
 return nextZ;
 });
 } else if (e.key === "0") {
 setZoom(1);
 setPan({ x: 0, y: 0 });
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [isOpen, handlePrev, handleNext, onClose]);

 // Drag to pan handling
 const handleMouseDown = (e: React.MouseEvent) => {
 if (zoom <= 1) return;
 e.preventDefault();
 setIsDragging(true);
 dragStartRef.current = { x: e.clientX, y: e.clientY };
 panStartRef.current = { ...pan };
 };

 const handleMouseMove = (e: React.MouseEvent) => {
 if (!isDragging || zoom <= 1) return;
 const dx = e.clientX - dragStartRef.current.x;
 const dy = e.clientY - dragStartRef.current.y;
 // Bound pan relative to zoom
 const maxPanX = (zoom - 1) * 350;
 const maxPanY = (zoom - 1) * 250;
 setPan({
 x: Math.min(maxPanX, Math.max(-maxPanX, panStartRef.current.x + dx)),
 y: Math.min(maxPanY, Math.max(-maxPanY, panStartRef.current.y + dy))
 });
 };

 const handleMouseUp = () => {
 setIsDragging(false);
 };

 // Touch drag support
 const handleTouchStart = (e: React.TouchEvent) => {
 if (zoom <= 1 || e.touches.length !== 1) return;
 const touch = e.touches[0];
 setIsDragging(true);
 dragStartRef.current = { x: touch.clientX, y: touch.clientY };
 panStartRef.current = { ...pan };
 };

 const handleTouchMove = (e: React.TouchEvent) => {
 if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
 const touch = e.touches[0];
 const dx = touch.clientX - dragStartRef.current.x;
 const dy = touch.clientY - dragStartRef.current.y;
 const maxPanX = (zoom - 1) * 350;
 const maxPanY = (zoom - 1) * 250;
 setPan({
 x: Math.min(maxPanX, Math.max(-maxPanX, panStartRef.current.x + dx)),
 y: Math.min(maxPanY, Math.max(-maxPanY, panStartRef.current.y + dy))
 });
 };

 // Double click toggles 1x <-> 2.5x zoom
 const handleDoubleClick = () => {
 if (zoom > 1) {
 setZoom(1);
 setPan({ x: 0, y: 0 });
 } else {
 setZoom(2.5);
 }
 };

 const currentPhoto = images[currentIndex];
 const imgSrc =
 typeof currentPhoto === "string"
 ? currentPhoto
 : currentPhoto?.url || currentPhoto?.thumbnailUrl || "";

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 text-white select-none">
 {/* ── Top Header Toolbar ── */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 shrink-0">
 <div className="flex items-center gap-3 min-w-0">
 <h3 className="text-sm font-semibold truncate text-slate-200">
 {productTitle}
 </h3>
 {images.length > 0 && (
 <span className="text-xs text-slate-400 bg-white/10 px-2.5 py-0.5 rounded-full shrink-0 font-mono">
 {currentIndex + 1} / {images.length}
 </span>
 )}
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 mr-2">
 <Info size={13} /> Scroll mouse wheel or double-click to zoom
 </span>
 <button
 onClick={onClose}
 className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
 aria-label="Close photo zoom"
 title="Close (Esc)"
 >
 <X size={20} />
 </button>
 </div>
 </div>

 {/* ── Main Zoom Stage (Isolated mouse wheel and drag-to-pan) ── */}
 <div
 ref={containerRef}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleMouseUp}
 onDoubleClick={handleDoubleClick}
 className={`relative flex-1 flex items-center justify-center overflow-hidden p-4 ${
 zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
 }`}
 >
 {imgSrc ? (
 <div
 style={{
 transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
 transition: isDragging ? "none" : "transform 0.15s ease-out"
 }}
 className="relative max-w-full max-h-full flex items-center justify-center origin-center will-change-transform"
 >
 {imgSrc.startsWith("data:") ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={imgSrc}
 alt={productTitle}
 draggable={false}
 className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl pointer-events-none"
 />
 ) : (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={imgSrc}
 alt={productTitle}
 draggable={false}
 className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl pointer-events-none"
 />
 )}
 </div>
 ) : (
 <div className="text-slate-500 text-sm">No photo available</div>
 )}

 {/* Left / Right Photo Arrows */}
 {images.length > 1 && (
 <>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handlePrev();
 }}
 className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/90 p-3 text-white transition shadow-lg border border-white/10"
 aria-label="Previous photo"
 title="Previous Photo (←)"
 >
 <ChevronLeft size={22} />
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleNext();
 }}
 className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/90 p-3 text-white transition shadow-lg border border-white/10"
 aria-label="Next photo"
 title="Next Photo (→)"
 >
 <ChevronRight size={22} />
 </button>
 </>
 )}

 {/* Helper overlay hint when zoomed in */}
 {zoom > 1 && (
 <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-slate-300 border border-white/10 pointer-events-none">
 <Move size={12} /> Click & drag to pan around photo
 </div>
 )}
 </div>

 {/* ── Bottom Controls & Thumbnail Strip ── */}
 <div className="flex flex-col gap-2 p-3 bg-black/50 border-t border-white/10 shrink-0">
 {/* Zoom Toolbar */}
 <div className="flex items-center justify-center gap-3">
 <button
 type="button"
 onClick={() => {
 setZoom((z) => {
 const nextZ = Math.max(1, Number((z - 0.25).toFixed(2)));
 if (nextZ === 1) setPan({ x: 0, y: 0 });
 return nextZ;
 });
 }}
 disabled={zoom <= 1}
 className="rounded-lg p-2 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
 title="Zoom Out (-)"
 >
 <ZoomOut size={18} />
 </button>

 {/* Slider */}
 <div className="flex items-center gap-2 w-36 sm:w-48">
 <input
 type="range"
 min="1"
 max="4"
 step="0.1"
 value={zoom}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 setZoom(val);
 if (val === 1) setPan({ x: 0, y: 0 });
 }}
 className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-emerald"
 />
 <span className="text-xs font-mono font-bold text-brand-emerald w-12 text-right">
 {Math.round(zoom * 100)}%
 </span>
 </div>

 <button
 type="button"
 onClick={() => {
 setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
 }}
 disabled={zoom >= 4}
 className="rounded-lg p-2 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
 title="Zoom In (+)"
 >
 <ZoomIn size={18} />
 </button>

 <button
 type="button"
 onClick={() => {
 setZoom(1);
 setPan({ x: 0, y: 0 });
 }}
 disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
 className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition flex items-center gap-1"
 title="Reset Zoom (0)"
 >
 <RotateCcw size={14} /> Reset
 </button>
 </div>

 {/* Thumbnail Gallery Switcher */}
 {images.length > 1 && (
 <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
 {images.map((img, idx) => {
 const thumbSrc =
 typeof img === "string" ? img : img?.thumbnailUrl || img?.url || "";
 return (
 <button
 key={idx}
 type="button"
 onClick={() => changeImage(idx)}
 className={`relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border-2 transition ${
 currentIndex === idx
 ? "border-brand-emerald scale-105 shadow-md"
 : "border-transparent opacity-60 hover:opacity-100"
 }`}
 >
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={thumbSrc}
 alt={`Thumb ${idx + 1}`}
 className="h-full w-full object-cover"
 />
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </AnimatePresence>
 );
}
