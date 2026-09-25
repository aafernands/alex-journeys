"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { tripDays, type TripItem } from "@/lib/trip-record";
import type { PlannerState } from "@/lib/trip-planner-model";
import { guideForTopic, type PackingGuide } from "@/lib/packing-guides";
import {
  PACKING_CATEGORIES,
  PACKING_TEMPLATES,
  acceptPackingSuggestion,
  addPackingTemplate,
  addQuickPackingItem,
  categoryLabel,
  deletePackingItem,
  dismissPackingSuggestion,
  groupPackingItems,
  packingProgress,
  packingSuggestions,
  packingTravelers,
  packingWhoLabel,
  readPackingList,
  shiftPackingItem,
  showTravelerControls,
  templateItemCount,
  togglePacked,
  tripNightsForPacking,
  uncheckAllPacking,
  updatePackingItem,
  writePackingList,
  type PackingItem,
  type PackingListState,
  type PackingTemplateId,
} from "@/lib/packing-list";
import { ListRow } from "@/components/ui/ListRow";
import { plan } from "@/components/trip-planner/density";

const CATEGORY_GUIDE: Record<string, "packing" | "tech" | undefined> = {
  clothes: "packing",
  gear: "packing",
  tech: "tech",
};

export function PackingPanel({
  headingId,
  notes,
  onChange,
  state,
  items,
  flexibleOn,
  guides,
}: {
  headingId: string;
  notes: string;
  onChange: (notes: string) => void;
  state: PlannerState;
  items: TripItem[];
  flexibleOn: boolean;
  guides: readonly PackingGuide[];
}) {
  const list = useMemo(() => readPackingList(notes), [notes]);
  const nights = useMemo(() => {
    const days = tripDays(state, flexibleOn);
    return tripNightsForPacking(days.length, state.nights, state.dateMode);
  }, [state, flexibleOn]);
  const ctx = useMemo(
    () => ({
      nights,
      destination: state.destination,
      categories: state.categories,
      itemTypes: items.map((item) => item.type),
      adults: state.adults,
      children: state.children,
    }),
    [nights, state.destination, state.categories, state.adults, state.children, items],
  );
  const suggestions = useMemo(
    () => (list.unreadable ? [] : packingSuggestions(list, ctx)),
    [list, ctx],
  );
  const travelers = packingTravelers(state.adults, state.children);
  const travelerControls = showTravelerControls(state.adults, state.children);
  const assigned = list.items.some((item) => item.who);
  const [draft, setDraft] = useState("");
  const [hidePacked, setHidePacked] = useState(false);
  const [whoFilter, setWhoFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });

  function commit(
    update: PackingListState | ((current: PackingListState) => PackingListState),
    message = "",
  ) {
    const next = typeof update === "function" ? update(listRef.current) : update;
    listRef.current = next;
    onChange(writePackingList(next));
    setNotice(message);
  }

  const progress = packingProgress(list.items);
  const summary =
    progress.total === 0
      ? "Nothing packed yet"
      : `${progress.packed} of ${progress.total} packed`;
  const groups = groupPackingItems(list.items);
  const packingGuide = guideForTopic(guides, "packing");
  const techGuide = guideForTopic(guides, "tech");

  if (list.unreadable) {
    return (
      <section className="plan-pack" aria-labelledby={`${headingId}-packing`}>
        <h3 id={`${headingId}-packing`} className={plan.h3}>
          Packing list
        </h3>
        <p className={`${plan.prose} text-muted`}>
          These notes are still saved. They could not be read as a checklist, so
          nothing was removed.
        </p>
        <textarea
          className={plan.input}
          aria-label="Packing notes"
          rows={8}
          value={notes}
          onChange={(event) => onChange(event.target.value)}
        />
      </section>
    );
  }

  return (
    <section className="plan-pack" aria-labelledby={`${headingId}-packing`}>
      <header className="plan-pack-head">
        <div>
          <h3 id={`${headingId}-packing`} className={plan.h3}>
            Packing list
          </h3>
          <p className="plan-pack-summary" role="status">
            {summary}
          </p>
        </div>
        {progress.total > 0 ? (
          <div className="plan-pack-tools">
            <button
              type="button"
              className="plan-pack-tool"
              aria-pressed={hidePacked}
              onClick={() => setHidePacked((value) => !value)}
            >
              {hidePacked ? "Show packed" : "Hide packed"}
            </button>
            <button
              type="button"
              className="plan-pack-tool"
              disabled={progress.packed === 0}
              onClick={() =>
                commit(
                  (current) => uncheckAllPacking(current),
                  "Unchecked everything for the trip home.",
                )
              }
            >
              Uncheck all
            </button>
          </div>
        ) : null}
      </header>

      {progress.total > 0 ? (
        <div
          className="plan-pack-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.packed}
          aria-label={summary}
        >
          <span style={{ width: `${Math.round((progress.packed / progress.total) * 100)}%` }} />
        </div>
      ) : (
        <p className={`${plan.prose} text-muted`}>
          Tap a list to start, or add one item. Quantities follow the length of
          this trip.
        </p>
      )}

      <form
        className="plan-pack-add"
        onSubmit={(event) => {
          event.preventDefault();
          const next = addQuickPackingItem(listRef.current, draft);
          if (next.items.length === listRef.current.items.length) return;
          setDraft("");
          commit(next, "Added to the list.");
        }}
      >
        <label className="plan-pack-add-label" htmlFor={`${headingId}-pack-add`}>
          Add an item
        </label>
        <div className="plan-pack-add-row">
          <input
            id={`${headingId}-pack-add`}
            className={plan.input}
            value={draft}
            placeholder="Add socks, or 4 t-shirts"
            maxLength={80}
            enterKeyHint="done"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="btn btn-primary plan-pack-add-btn">
            Add
          </button>
        </div>
      </form>

      {notice ? (
        <p className="plan-pack-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="plan-pack-block">
        <h4 className={plan.h4}>{progress.total === 0 ? "Start from a list" : "Add a list"}</h4>
        <div className={`plan-pack-templates${progress.total > 0 ? " is-compact" : ""}`}>
          {PACKING_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="plan-pack-template"
              onClick={() => {
                const before = listRef.current.items.length;
                const next = addPackingTemplate(
                  listRef.current,
                  template.id as PackingTemplateId,
                  ctx,
                );
                const added = next.items.length - before;
                commit(
                  next,
                  added > 0
                    ? `Added ${added} ${added === 1 ? "item" : "items"} from ${template.label}.`
                    : `${template.label} is already on the list.`,
                );
              }}
            >
              <span className="plan-pack-template-label">{template.label}</span>
              <span className="plan-pack-template-detail">
                {template.detail}
                {template.id === "essentials" && nights > 0 ? ` · ${nights} nights` : ""}
                {" · "}
                {templateItemCount(template.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {assigned && travelers.length > 1 ? (
        <div className="plan-pack-filters" role="group" aria-label="Whose list">
          <button
            type="button"
            className="plan-pack-filter"
            aria-pressed={whoFilter === "all"}
            onClick={() => setWhoFilter("all")}
          >
            All
          </button>
          {travelers.map((traveler) => (
            <button
              key={traveler.id || "everyone"}
              type="button"
              className="plan-pack-filter"
              aria-pressed={whoFilter === traveler.id}
              onClick={() => setWhoFilter(traveler.id)}
            >
              {traveler.label}
            </button>
          ))}
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="plan-pack-groups">
          {groups.map((group) => {
            const visible = group.items.filter((item) => {
              if (hidePacked && item.packed) return false;
              if (whoFilter === "all") return true;
              return item.who === "" || item.who === whoFilter;
            });
            if (visible.length === 0 && whoFilter !== "all") return null;
            const packed = group.items.filter((item) => item.packed).length;
            const open = !collapsed[group.id];
            const guideTopic = CATEGORY_GUIDE[group.id];
            const guide =
              guideTopic === "tech" ? techGuide : guideTopic === "packing" ? packingGuide : null;
            return (
              <section key={group.id} className="plan-pack-group" aria-labelledby={`${headingId}-pack-${group.id}`}>
                <div className="plan-pack-group-head">
                  <button
                    type="button"
                    className="plan-pack-group-toggle"
                    id={`${headingId}-pack-${group.id}`}
                    aria-expanded={open}
                    onClick={() =>
                      setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))
                    }
                  >
                    <span>{group.label}</span>
                    <span className="plan-pack-group-meta">
                      {packed} of {group.items.length}
                      <span aria-hidden="true">{open ? " ▴" : " ▾"}</span>
                    </span>
                  </button>
                  {guide ? (
                    <Link href={guide.href} className="plan-pack-guide-link">
                      {guideTopic === "tech" ? "Gadget guide" : "Packing light"}
                    </Link>
                  ) : null}
                </div>
                {open && visible.length > 0 ? (
                  <ul className="plan-pack-items">
                    {visible.map((item) => (
                      <PackingRow
                        key={item.id}
                        item={item}
                        adults={state.adults}
                        travelerControls={travelerControls}
                        travelers={travelers}
                        open={openId === item.id}
                        confirmDelete={confirmDelete === item.id}
                        canMoveUp={group.items[0]?.id !== item.id}
                        canMoveDown={group.items[group.items.length - 1]?.id !== item.id}
                        onToggle={() => commit((current) => togglePacked(current, item.id))}
                        onOpen={() => {
                          setOpenId((current) => (current === item.id ? null : item.id));
                          setConfirmDelete(null);
                        }}
                        onChange={(patch) =>
                          commit((current) => updatePackingItem(current, item.id, patch))
                        }
                        onShift={(direction) =>
                          commit((current) => shiftPackingItem(current, item.id, direction))
                        }
                        onAskDelete={() => setConfirmDelete(item.id)}
                        onDelete={() => {
                          setOpenId(null);
                          setConfirmDelete(null);
                          commit(
                            (current) => deletePackingItem(current, item.id),
                            `Removed ${item.label}.`,
                          );
                        }}
                        onCancelDelete={() => setConfirmDelete(null)}
                      />
                    ))}
                  </ul>
                ) : null}
                {open && visible.length === 0 ? (
                  <p className="plan-pack-empty-group">Packed and hidden.</p>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="plan-pack-block">
          <h4 className={plan.h4}>Suggested for this trip</h4>
          <ul className="plan-pack-suggestions">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="plan-pack-suggestion">
                <div className="plan-pack-suggestion-copy">
                  <p className="plan-pack-suggestion-label">
                    {suggestion.label}
                    {suggestion.quantity > 1 ? ` × ${suggestion.quantity}` : ""}
                  </p>
                  <p className="plan-pack-suggestion-reason">{suggestion.reason}</p>
                </div>
                <div className="plan-pack-suggestion-actions">
                  <button
                    type="button"
                    className="btn btn-secondary plan-pack-suggestion-add"
                    onClick={() =>
                      commit(
                        (current) => acceptPackingSuggestion(current, suggestion),
                        `Added ${suggestion.label}.`,
                      )
                    }
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="plan-pack-dismiss"
                    aria-label={`Dismiss ${suggestion.label}`}
                    onClick={() =>
                      commit((current) => dismissPackingSuggestion(current, suggestion.id))
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {guides.length > 0 ? (
        <div className="plan-pack-block">
          <h4 className={plan.h4}>Packing guides from Alex</h4>
          <p className={`${plan.caption} text-muted`}>
            Notes from trips already taken. Gear links inside a story stay as written.
          </p>
          <div className="plan-pack-guides">
            {guides.map((guide) => (
              <Link key={guide.slug} href={guide.href} className="plan-pack-guide">
                {guide.imageUrl ? (
                  <span className="plan-pack-guide-photo">
                    <Image
                      src={guide.imageUrl}
                      alt={guide.imageAlt}
                      fill
                      sizes="(max-width: 767px) 78vw, 320px"
                    />
                  </span>
                ) : null}
                <span className="plan-pack-guide-copy">
                  <span className="plan-pack-guide-kicker">
                    {guide.topics.includes("tech") && !guide.topics.includes("packing")
                      ? "Travel tech"
                      : "Packing"}
                  </span>
                  <span className="plan-pack-guide-title">{guide.title}</span>
                  {guide.excerpt ? (
                    <span className="plan-pack-guide-excerpt">{guide.excerpt}</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PackingRow({
  item,
  adults,
  travelerControls,
  travelers,
  open,
  confirmDelete,
  canMoveUp,
  canMoveDown,
  onToggle,
  onOpen,
  onChange,
  onShift,
  onAskDelete,
  onDelete,
  onCancelDelete,
}: {
  item: PackingItem;
  adults: number;
  travelerControls: boolean;
  travelers: { id: string; label: string }[];
  open: boolean;
  confirmDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onChange: (patch: Partial<Pick<PackingItem, "label" | "quantity" | "category" | "who">>) => void;
  onShift: (direction: -1 | 1) => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  const who = item.who ? packingWhoLabel(item.who, adults) : "";
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const label = labelDraft ?? item.label;
  const categories = PACKING_CATEGORIES.some((category) => category.id === item.category)
    ? PACKING_CATEGORIES
    : [...PACKING_CATEGORIES, { id: item.category, label: categoryLabel(item.category) }];

  return (
    <li className={`plan-pack-item${item.packed ? " is-packed" : ""}`}>
      <ListRow
        leading={
          <button
            type="button"
            className="plan-pack-check"
            role="checkbox"
            aria-checked={item.packed}
            aria-label={`${item.packed ? "Packed" : "Not packed"}: ${item.label}`}
            onClick={onToggle}
          >
            <span aria-hidden="true">{item.packed ? "✓" : ""}</span>
          </button>
        }
        title={<span className="plan-pack-item-name">{item.label}</span>}
        detail={
          <span className="plan-pack-item-meta">
            {item.quantity > 1 ? `× ${item.quantity}` : "Qty 1"}
            {who ? ` · ${who}` : ""}
          </span>
        }
        onClick={onOpen}
        expanded={open}
      />
      {open ? (
        <div className="plan-pack-editor">
          <label className="plan-field">
            <span className={plan.label}>Name</span>
            <input
              className={plan.input}
              value={label}
              maxLength={80}
              onFocus={() => setLabelDraft(item.label)}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => {
                const next = label.replace(/\s+/g, " ").trim();
                setLabelDraft(null);
                if (next && next !== item.label) onChange({ label: next });
              }}
            />
          </label>
          <div className="plan-pack-editor-row">
            <span className={plan.label}>Quantity</span>
            <div className="plan-pack-stepper">
              <button
                type="button"
                aria-label={`Decrease ${item.label}`}
                disabled={item.quantity <= 1}
                onClick={() => onChange({ quantity: item.quantity - 1 })}
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                aria-label={`Increase ${item.label}`}
                disabled={item.quantity >= 99}
                onClick={() => onChange({ quantity: item.quantity + 1 })}
              >
                +
              </button>
            </div>
          </div>
          <label className="plan-field">
            <span className={plan.label}>Category</span>
            <select
              className={plan.input}
              value={item.category}
              onChange={(event) => onChange({ category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          {travelerControls ? (
            <label className="plan-field">
              <span className={plan.label}>Who</span>
              <select
                className={plan.input}
                value={item.who}
                onChange={(event) => onChange({ who: event.target.value })}
              >
                {travelers.map((traveler) => (
                  <option key={traveler.id || "everyone"} value={traveler.id}>
                    {traveler.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="plan-pack-editor-actions">
            <button type="button" className="plan-pack-tool" disabled={!canMoveUp} onClick={() => onShift(-1)}>
              Move up
            </button>
            <button type="button" className="plan-pack-tool" disabled={!canMoveDown} onClick={() => onShift(1)}>
              Move down
            </button>
            {confirmDelete ? (
              <>
                <button type="button" className="plan-pack-tool plan-pack-tool-danger" onClick={onDelete}>
                  Remove
                </button>
                <button type="button" className="plan-pack-tool" onClick={onCancelDelete}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="plan-pack-tool" onClick={onAskDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
