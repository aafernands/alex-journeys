"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { compressImageForUpload } from "@/lib/cms/compress-image";
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_LABEL,
} from "@/lib/cms/media-limits";
import {
  createEmptyFeaturedSlide,
  type FeaturedSlide,
  type FeaturedSlideshow,
} from "@/lib/site-design";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass = `${fieldClass} min-h-[5.5rem] resize-y`;

const MAX_SLIDES = 12;

type Props = {
  value: FeaturedSlideshow;
  onChange: (next: FeaturedSlideshow) => void;
  onError: (message: string | null) => void;
};

export function FeaturedSlideshowEditor({ value, onChange, onError }: Props) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function patch(partial: Partial<FeaturedSlideshow>) {
    onChange({ ...value, ...partial });
  }

  function patchSlide(index: number, partial: Partial<FeaturedSlide>) {
    onChange({
      ...value,
      slides: value.slides.map((slide, i) =>
        i === index ? { ...slide, ...partial } : slide,
      ),
    });
  }

  function moveSlide(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= value.slides.length) return;
    const slides = value.slides.slice();
    const [item] = slides.splice(index, 1);
    slides.splice(next, 0, item);
    onChange({ ...value, slides });
  }

  async function uploadForSlide(index: number, file: File) {
    onError(null);
    setUploadingIndex(index);
    try {
      const compressed = await compressImageForUpload(file);
      if (!compressed.ok) {
        onError(compressed.message);
        return;
      }
      if (compressed.file.size > MAX_MEDIA_UPLOAD_BYTES) {
        onError(`Image too large. Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`);
        return;
      }
      const form = new FormData();
      form.append("file", compressed.file);
      form.append("alt", value.slides[index]?.imageAlt || "");
      const res = await fetch("/api/cms/media", { method: "POST", body: form });
      const data = (await res.json()) as {
        error?: string;
        item?: { url: string; alt?: string };
      };
      if (!res.ok || !data.item?.url) {
        onError(data.error || "Slide image upload failed.");
        return;
      }
      patchSlide(index, {
        image: data.item.url,
        imageAlt: value.slides[index]?.imageAlt || data.item.alt || "",
      });
    } catch {
      onError("Network error uploading slide image.");
    } finally {
      setUploadingIndex(null);
      const input = fileRefs.current[index];
      if (input) input.value = "";
    }
  }

  return (
    <section id="design-featured" className="panel scroll-mt-28 overflow-hidden">
      <div className="border-b border-border bg-surface-soft px-5 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Featured slideshow
        </h2>
      </div>
      <div className="space-y-6 p-5 md:p-6">
        <p className="text-sm text-muted">
          The window-chrome field-note card <strong>below</strong> the homepage
          hero. This is <strong>not</strong> the full-bleed headline photo.
          Add multiple slides — each has its own image, caption, note, and
          optional stats. Pick from the media library or upload.
        </p>

        <label className="flex items-center gap-2.5 text-sm text-text">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="size-4 rounded border-border text-accent focus:ring-accent/30"
          />
          Show featured slideshow on the homepage
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="slideshow-eyebrow"
              className="text-sm font-semibold text-heading"
            >
              Eyebrow
            </label>
            <input
              id="slideshow-eyebrow"
              value={value.eyebrow}
              onChange={(e) => patch({ eyebrow: e.target.value })}
              placeholder="Field notes"
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="slideshow-title"
              className="text-sm font-semibold text-heading"
            >
              Section title
            </label>
            <input
              id="slideshow-title"
              value={value.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="A field note worth opening."
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 text-sm text-text">
            <input
              type="checkbox"
              checked={value.autoplay}
              onChange={(e) => patch({ autoplay: e.target.checked })}
              className="size-4 rounded border-border text-accent focus:ring-accent/30"
            />
            Subtle autoplay (pauses on hover / focus; respects reduced motion)
          </label>
          <div>
            <label
              htmlFor="slideshow-interval"
              className="text-sm font-semibold text-heading"
            >
              Autoplay interval (ms)
            </label>
            <input
              id="slideshow-interval"
              type="number"
              min={4000}
              max={20000}
              step={500}
              value={value.intervalMs}
              onChange={(e) =>
                patch({ intervalMs: Number(e.target.value) || 8000 })
              }
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="slideshow-secondary-label"
              className="text-sm font-semibold text-heading"
            >
              Secondary CTA label
            </label>
            <input
              id="slideshow-secondary-label"
              value={value.secondaryCta.label}
              onChange={(e) =>
                patch({
                  secondaryCta: {
                    ...value.secondaryCta,
                    label: e.target.value,
                  },
                })
              }
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="slideshow-secondary-href"
              className="text-sm font-semibold text-heading"
            >
              Secondary CTA link
            </label>
            <input
              id="slideshow-secondary-href"
              value={value.secondaryCta.href}
              onChange={(e) =>
                patch({
                  secondaryCta: {
                    ...value.secondaryCta,
                    href: e.target.value,
                  },
                })
              }
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-4">
          {value.slides.map((slide, index) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={index}
              total={value.slides.length}
              uploading={uploadingIndex === index}
              fileRef={(el) => {
                fileRefs.current[index] = el;
              }}
              onChange={(partial) => patchSlide(index, partial)}
              onPickLibrary={() => setPickerIndex(index)}
              onUploadFile={(file) => void uploadForSlide(index, file)}
              onMoveUp={() => moveSlide(index, -1)}
              onMoveDown={() => moveSlide(index, 1)}
              onRemove={() =>
                onChange({
                  ...value,
                  slides: value.slides.filter((_, i) => i !== index),
                })
              }
            />
          ))}
        </div>

        <button
          type="button"
          className="btn btn-secondary text-sm"
          disabled={value.slides.length >= MAX_SLIDES}
          onClick={() =>
            onChange({
              ...value,
              slides: [...value.slides, createEmptyFeaturedSlide()],
            })
          }
        >
          <Plus size={16} aria-hidden="true" />
          Add slide
        </button>
        {value.slides.length >= MAX_SLIDES ? (
          <p className="text-xs text-muted">Maximum {MAX_SLIDES} slides.</p>
        ) : null}
      </div>

      <MediaPicker
        open={pickerIndex !== null}
        onClose={() => setPickerIndex(null)}
        title="Choose featured slideshow image (not the hero)"
        onSelect={(item) => {
          if (pickerIndex === null) return;
          patchSlide(pickerIndex, {
            image: item.url,
            imageAlt: value.slides[pickerIndex]?.imageAlt || item.alt || "",
          });
          setPickerIndex(null);
        }}
      />
    </section>
  );
}

type SlideEditorProps = {
  slide: FeaturedSlide;
  index: number;
  total: number;
  uploading: boolean;
  fileRef: (el: HTMLInputElement | null) => void;
  onChange: (partial: Partial<FeaturedSlide>) => void;
  onPickLibrary: () => void;
  onUploadFile: (file: File) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

function SlideEditor({
  slide,
  index,
  total,
  uploading,
  fileRef,
  onChange,
  onPickLibrary,
  onUploadFile,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SlideEditorProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-heading">
          Slide {index + 1}
          {slide.caption ? (
            <span className="ml-2 font-medium text-muted">{slide.caption}</span>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-heading disabled:opacity-40"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move slide ${index + 1} up`}
          >
            <ChevronUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-heading disabled:opacity-40"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Move slide ${index + 1} down`}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-heading"
            onClick={onRemove}
            aria-label={`Remove slide ${index + 1}`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        {slide.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.image}
            alt={slide.imageAlt || `Slide ${index + 1} preview`}
            className="max-h-48 w-full object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-muted">
            No slide image yet
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-secondary text-sm"
          onClick={onPickLibrary}
        >
          Choose from library
        </button>
        <label className="btn btn-secondary cursor-pointer text-sm">
          {uploading ? "Uploading…" : "Upload new"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
            }}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-heading">
            Slide image path
          </label>
          <input
            value={slide.image}
            onChange={(e) => onChange({ image: e.target.value })}
            placeholder="/media/…"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-heading">Alt text</label>
          <input
            value={slide.imageAlt}
            onChange={(e) => onChange({ imageAlt: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-heading">
            Caption (window chrome)
          </label>
          <input
            value={slide.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Maroon Bells · Colorado"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-heading">
            Window badge
          </label>
          <input
            value={slide.windowBadge}
            onChange={(e) => onChange({ windowBadge: e.target.value })}
            placeholder="Field note"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-heading">
            Optional story link
          </label>
          <input
            value={slide.href}
            onChange={(e) => onChange({ href: e.target.value })}
            placeholder="/maroon-bells"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-heading">
            Story CTA label
          </label>
          <input
            value={slide.ctaLabel}
            onChange={(e) => onChange({ ctaLabel: e.target.value })}
            placeholder="Read the sunrise story"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-heading">
            Note body
          </label>
          <textarea
            value={slide.note}
            onChange={(e) => onChange({ note: e.target.value })}
            rows={3}
            className={areaClass}
          />
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Optional stats (up to 3)
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => {
          const stat = slide.stats[i] ?? { label: "", value: "" };
          return (
            <div key={i} className="rounded-lg border border-border bg-surface p-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Stat {i + 1} label
              </label>
              <input
                value={stat.label}
                onChange={(e) => {
                  const stats = [0, 1, 2].map((j) => slide.stats[j] ?? { label: "", value: "" });
                  stats[i] = { ...stats[i], label: e.target.value };
                  onChange({ stats });
                }}
                className={fieldClass}
              />
              <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-muted">
                Value
              </label>
              <input
                value={stat.value}
                onChange={(e) => {
                  const stats = [0, 1, 2].map((j) => slide.stats[j] ?? { label: "", value: "" });
                  stats[i] = { ...stats[i], value: e.target.value };
                  onChange({ stats });
                }}
                className={fieldClass}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
