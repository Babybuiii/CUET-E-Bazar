"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Store, Loader2 } from "lucide-react";

const MAX_BYTES = 8 * 1024 * 1024;

type ShopImagePickerProps = {
  kind: "logo" | "banner";
  /** Existing saved image URL, if any */
  url?: string;
  /** Local preview for a file not yet uploaded */
  previewUrl?: string;
  busy?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  onError?: (message: string) => void;
};

/**
 * Logo / cover-photo picker for a shop. Presentational only - the parent
 * decides whether to upload immediately (Settings) or defer until after
 * registration completes (Signup).
 */
export function ShopImagePicker({
  kind,
  url,
  previewUrl,
  busy = false,
  disabled = false,
  onSelect,
  onRemove,
  onError
}: ShopImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isLogo = kind === "logo";
  const shown = previewUrl || url || "";

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      onError?.("Image must be 8MB or smaller.");
      return;
    }
    onSelect(file);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {isLogo ? "Shop Logo" : "Cover Photo"}{" "}
        <span className="font-normal text-slate-400">(optional)</span>
      </label>

      <div
        className={`relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/40 ${
          isLogo ? "h-28 w-28" : "h-28 w-full"
        }`}
      >
        {shown ? (
          <Image
            src={shown}
            alt={isLogo ? "Shop logo" : "Shop cover photo"}
            fill
            sizes={isLogo ? "112px" : "100vw"}
            className="object-cover"
            unoptimized={shown.startsWith("blob:")}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="focus-ring flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 transition hover:text-brand-emerald disabled:opacity-50"
          >
            {isLogo ? <Store size={20} /> : <ImagePlus size={20} />}
            <span className="text-[10px] font-semibold">
              {isLogo ? "Add logo" : "Add cover photo"}
            </span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className="focus-ring rounded-md px-2 py-1 text-[11px] font-semibold text-brand-emerald hover:underline disabled:opacity-50"
        >
          {shown ? "Change" : "Upload"}
        </button>
        {shown && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || busy}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-rose-500 hover:underline disabled:opacity-50"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
      </div>

      <p className="mt-0.5 text-[10px] text-slate-400">
        {isLogo ? "Square, shown at 400×400." : "Wide banner, shown at 1600×400."} Max 8MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
