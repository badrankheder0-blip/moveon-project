"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { canAssemble, entryVolume, useFurnitureCatalog, useSpecialCatalog, type CatalogEntry } from "@/lib/booking/lookups";
import {
  PREPARATION,
  ROOM_TYPES,
  inventoryCount,
  inventoryVolume,
  roomCount,
  roomDisplayName,
  roomVolume,
  uid,
  type InventoryItem,
  type Plan,
  type Preparation,
  type Room,
  type RoomType,
  type SpecialKind,
} from "@/lib/booking/plan";
import { usePlanner } from "../context";
import {
  Checkbox,
  Counter,
  Dialog,
  ErrorText,
  Field,
  Icon,
  Note,
  RadioCards,
  Section,
  UnitInput,
  describedBy,
  focusRing,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  selectStyle,
  textButton,
} from "../ui";

/**
 * "Your home, mapped out" — the inventory, room by room.
 *
 * The prototype's own catalogue had variants and volumes but no prices, and it
 * priced the result per cubic metre in the browser. Here the items are the
 * catalog the dashboard edits and the engine prices: what the customer lists
 * is exactly what `selectedItems` sends, the "team dismantles" answer is what
 * `disassemblyItems` prices, and the m³ shown is the catalog's own volume.
 * A custom entry is still welcome; it travels to the team as a note and the
 * review says it is not in the price.
 */

export const ROOM_ICON = Object.fromEntries(ROOM_TYPES.map((room) => [room.type, room.icon])) as Record<RoomType, string>;

const volumeText = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

function newItem(entry: CatalogEntry, count = 1): InventoryItem {
  const assembles = canAssemble(entry);
  return {
    id: uid("item"),
    catalogId: entry.id,
    name: entry.name,
    count,
    volumeM3: entryVolume(entry),
    canAssemble: assembles,
    // An item nobody can take apart is simply ready; one that can be needs an answer.
    prep: assembles ? "unanswered" : "ready",
    notes: "",
  };
}

function updateRoom(plan: Plan, roomId: string, change: (room: Room) => Room): Partial<Plan> {
  return {
    moving: { ...plan.moving, rooms: plan.moving.rooms.map((room) => (room.id === roomId ? change(room) : room)) },
  };
}

export function HomeStep() {
  const { plan } = usePlanner();
  return plan.moving.method === "area" ? <AreaHome /> : <RoomBuilder />;
}

// ── By items ────────────────────────────────────────────────────────────

function RoomBuilder() {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors, roomTypeName } = usePlanner();
  const [adding, setAdding] = useState(false);

  const rooms = plan.moving.rooms;
  const active = rooms.find((room) => room.id === plan.moving.activeRoomId) ?? rooms[0];
  const checked = rooms.filter((room) => room.checked).length;

  const stats = [
    { value: String(rooms.length), label: t("plan.home.statRooms") },
    { value: String(inventoryCount(plan)), label: t("plan.home.statItems") },
    { value: volumeText(inventoryVolume(plan), locale), unit: "m³", label: t("plan.home.statVolume") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border-2 border-border-subtle bg-border-subtle md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 bg-surface-card px-4 py-3">
            <span className="font-display text-h3 leading-8 font-bold text-text-heading">
              {stat.value}
              {stat.unit ? <span className="ms-0.5 text-caption font-semibold">{stat.unit}</span> : null}
            </span>
            <span className="text-caption text-text-default">{stat.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 bg-surface-card px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full border-2 border-brand-yellow text-text-heading">
            <Icon name="check" size={16} />
          </span>
          <span className="flex flex-col">
            <span className="text-body-sm font-semibold text-text-heading">
              {t("plan.home.checkedOf", { values: { checked, total: rooms.length } })}
            </span>
            <span className="text-caption text-text-default">{t("plan.home.roomsChecked")}</span>
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border-2 border-brand-yellow bg-yellow-tint p-3 md:p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-body-sm font-bold text-text-heading">
            <span className="text-brand-red">
              <Icon name="home" size={16} />
            </span>
            {t("plan.home.mapTitle")}
          </span>
          <span className="text-caption text-text-default">{t("plan.home.mapHint")}</span>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {rooms.map((room) => {
            const selected = room.id === active?.id;
            return (
              <button
                key={room.id}
                type="button"
                aria-pressed={selected}
                onClick={() => dispatch({ type: "moving", patch: { activeRoomId: room.id } })}
                className={`flex min-h-[132px] flex-col justify-between gap-2 rounded-md border-2 bg-surface-card p-2.5 text-start transition-colors ${focusRing} ${
                  selected ? "border-brand-red" : "border-border-default hover:border-border-strong"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className={`text-caption font-bold ${selected ? "text-brand-red" : "text-text-heading"}`}>
                    {roomDisplayName(room, roomTypeName)}
                  </span>
                  {room.checked ? (
                    <span className="grid size-5 place-items-center rounded-sm bg-yellow-tint text-text-heading ring-1 ring-brand-yellow">
                      <Icon name="check" size={12} />
                    </span>
                  ) : null}
                </span>
                <span className="grid place-items-center text-text-default">
                  <Icon name={ROOM_ICON[room.type]} size={30} strokeWidth={1.4} />
                </span>
                <span className="flex justify-between text-[11px] text-text-default">
                  <span>{t("plan.home.itemsCount", { count: roomCount(room) })}</span>
                  <span>
                    {volumeText(roomVolume(room), locale)} m³
                  </span>
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-brand-red bg-surface-card p-3 text-center ${focusRing}`}
          >
            <span className="grid size-9 place-items-center rounded-full border border-brand-yellow bg-yellow-tint text-brand-red">
              <Icon name="plus" size={18} />
            </span>
            <span className="text-caption font-bold text-text-heading">{t("plan.home.addRoom")}</span>
            <span className="text-[11px] text-text-default">{t("plan.home.addRoomHint")}</span>
          </button>
        </div>
      </section>

      {active ? <RoomPanel room={active} /> : <Note tone="warm">{t("plan.home.noRooms")}</Note>}

      <ErrorText>{errors.items ? t(errors.items) : undefined}</ErrorText>
      <ErrorText>{errors.preparation ? t(errors.preparation) : undefined}</ErrorText>

      <SpecialItems />

      {inventoryCount(plan) > 0 ? (
        <div className="rounded-lg border-2 border-border-subtle bg-surface-card p-4">
          <Checkbox
            id="accept-extra"
            checked={plan.moving.acceptedExtra}
            onChange={(acceptedExtra) => dispatch({ type: "moving", patch: { acceptedExtra } })}
            error={errors.acceptedExtra ? t(errors.acceptedExtra) : undefined}
          >
            {t("plan.home.acceptExtra")}
          </Checkbox>
        </div>
      ) : null}

      {adding ? (
        <AddRoomDialog
          onClose={() => setAdding(false)}
          onAdd={(type) => {
            const room: Room = { id: uid("room"), type, name: "", items: [], checked: false };
            dispatch({
              type: "moving",
              patch: (moving) => ({ rooms: [...moving.rooms, room], activeRoomId: room.id }),
            });
            setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddRoomDialog({ onAdd, onClose }: { onAdd: (type: RoomType) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { roomTypeName } = usePlanner();

  return (
    <Dialog title={t("plan.home.addRoomTitle")} kicker={t("plan.home.kicker")} onClose={onClose} closeLabel={t("plan.close")}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {ROOM_TYPES.map((room) => (
          <button
            key={room.type}
            type="button"
            onClick={() => onAdd(room.type)}
            className={`flex flex-col items-center gap-2 rounded-lg border border-border-default p-4 text-center hover:border-brand-red hover:bg-red-50 ${focusRing}`}
          >
            <span className="text-brand-red">
              <Icon name={room.icon} size={26} />
            </span>
            <span className="text-body-sm font-semibold text-text-heading">{roomTypeName(room.type)}</span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}

function RoomPanel({ room }: { room: Room }) {
  const { t, locale } = useI18n();
  const { plan, dispatch, roomTypeName } = usePlanner();
  const catalog = useFurnitureCatalog();
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [custom, setCustom] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const category = ROOM_TYPES.find((entry) => entry.type === room.type)?.category;
  const entries = catalog.data ?? [];

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (text.length < 2) return [];
    return entries.filter((entry) => entry.name.toLowerCase().includes(text)).slice(0, 8);
  }, [entries, query]);

  const change = (update: (room: Room) => Room) =>
    dispatch({ type: "patch", patch: (current) => updateRoom(current, room.id, update) });

  const add = (entry: CatalogEntry) => {
    change((current) => {
      // The same catalog item twice in one room is one row with a higher count.
      const existing = current.items.find((item) => item.catalogId === entry.id);
      return existing
        ? { ...current, items: current.items.map((item) => (item.id === existing.id ? { ...item, count: item.count + 1 } : item)) }
        : { ...current, items: [...current.items, newItem(entry)] };
    });
    setQuery("");
  };

  const index = plan.moving.rooms.findIndex((entry) => entry.id === room.id);
  const next = plan.moving.rooms[index + 1];

  return (
    <section className="flex flex-col gap-4 rounded-lg border-2 border-border-subtle bg-surface-card p-4 md:p-5" aria-label={roomDisplayName(room, roomTypeName)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-brand-red">
            <Icon name={ROOM_ICON[room.type]} size={22} />
          </span>
          <div className="flex flex-col gap-1">
            {renaming ? (
              <input
                autoFocus
                aria-label={t("plan.home.roomName")}
                className={`${inputClass} py-1.5`}
                defaultValue={roomDisplayName(room, roomTypeName)}
                maxLength={40}
                onBlur={(event) => {
                  const name = event.target.value.trim();
                  change((current) => ({ ...current, name: name === roomTypeName(current.type) ? "" : name }));
                  setRenaming(false);
                }}
                onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
              />
            ) : (
              <h2 className="flex items-center gap-2 font-display text-h5 font-bold text-text-heading">
                {roomDisplayName(room, roomTypeName)}
                <button type="button" className={`text-text-default hover:text-brand-red ${focusRing}`} onClick={() => setRenaming(true)} aria-label={t("plan.home.rename")}>
                  <Icon name="edit" size={15} />
                </button>
              </h2>
            )}
            <p className="text-caption text-text-default">
              {t("plan.home.itemsCount", { count: roomCount(room) })} · {volumeText(roomVolume(room), locale)} m³
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("plan.home.duplicate")}
            title={t("plan.home.duplicate")}
            className={`grid size-9 place-items-center rounded-md text-text-default hover:bg-surface-sunken ${focusRing}`}
            onClick={() =>
              dispatch({
                type: "moving",
                patch: (moving) => {
                  const copy: Room = {
                    ...room,
                    id: uid("room"),
                    name: "",
                    checked: false,
                    items: room.items.map((item) => ({ ...item, id: uid("item") })),
                  };
                  return { rooms: [...moving.rooms, copy], activeRoomId: copy.id };
                },
              })
            }
          >
            <Icon name="copy" size={17} />
          </button>
          <button
            type="button"
            aria-label={t("plan.home.removeRoom")}
            title={t("plan.home.removeRoom")}
            className={`grid size-9 place-items-center rounded-md text-text-default hover:bg-red-50 hover:text-brand-red ${focusRing}`}
            onClick={() => {
              if (room.items.length > 0 && !window.confirm(t("plan.home.removeRoomConfirm"))) return;
              dispatch({
                type: "moving",
                patch: (moving) => ({
                  rooms: moving.rooms.filter((entry) => entry.id !== room.id),
                  activeRoomId: null,
                }),
              });
            }}
          >
            <Icon name="trash" size={17} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-body-sm font-semibold text-text-heading">
          <Icon name="list" size={16} />
          {t("plan.home.whatsInside")}
        </span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setCustom(true)}>
            <Icon name="edit" size={15} />
            {t("plan.home.customItem")}
          </button>
          <button type="button" className={primaryButton} onClick={() => setBrowsing(true)}>
            <Icon name="plus" size={16} />
            {t("plan.home.addItems")}
          </button>
        </div>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-default">
          <Icon name="search" size={16} />
        </span>
        <input
          type="search"
          aria-label={t("plan.home.searchLabel", { values: { room: roomDisplayName(room, roomTypeName) } })}
          placeholder={t("plan.home.searchPlaceholder", { values: { room: roomDisplayName(room, roomTypeName) } })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${inputClass} ps-9`}
        />
        {matches.length > 0 ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border-default bg-surface-card py-1 shadow-lg">
            {matches.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => add(entry)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-body-sm hover:bg-surface-sunken ${focusRing}`}
                >
                  <span className="font-semibold text-text-heading">{entry.name}</span>
                  <span className="text-caption text-text-muted">
                    {entry.category} · ~{volumeText(entryVolume(entry), locale)} m³
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {query.trim().length >= 2 && matches.length === 0 && !catalog.isLoading ? (
          <p className="mt-2 text-caption text-text-default">
            {t("plan.home.noMatch")}{" "}
            <button type="button" className={`${textButton} text-brand-red`} onClick={() => setCustom(true)}>
              {t("plan.home.addAsCustom", { values: { name: query.trim() } })}
            </button>
          </p>
        ) : null}
      </div>

      {room.items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-default px-4 py-6 text-center text-body-sm text-text-default">
          {t("plan.home.emptyRoom")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {room.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onChange={(patch) =>
                change((current) => ({
                  ...current,
                  items: current.items.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)),
                }))
              }
              onRemove={() =>
                change((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))
              }
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <Checkbox id={`checked-${room.id}`} checked={room.checked} onChange={(value) => change((current) => ({ ...current, checked: value }))}>
          {t("plan.home.roomChecked")}
        </Checkbox>
        {next ? (
          <button
            type="button"
            className={textButton}
            onClick={() => dispatch({ type: "moving", patch: { activeRoomId: next.id } })}
          >
            {t("plan.home.nextRoom")}
            <Icon name="arrow" size={14} className="rtl:-scale-x-100" />
          </button>
        ) : null}
      </div>

      {browsing ? (
        <CatalogDialog
          entries={entries}
          loading={catalog.isLoading}
          preferred={category}
          room={room}
          onAdd={add}
          onClose={() => setBrowsing(false)}
        />
      ) : null}

      {custom ? (
        <CustomItemDialog
          initialName={query.trim()}
          onClose={() => setCustom(false)}
          onSave={(item) => {
            change((current) => ({ ...current, items: [...current.items, item] }));
            setQuery("");
            setCustom(false);
          }}
        />
      ) : null}
    </section>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: InventoryItem;
  onChange: (patch: Partial<InventoryItem>) => void;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  const id = `prep-${item.id}`;

  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
        item.prep === "unanswered" ? "border-brand-yellow" : "border-border-default"
      }`}
    >
      <div className="flex min-w-[12rem] flex-1 items-start gap-3">
        <span className="mt-0.5 text-text-default">
          <Icon name="box" size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body-sm font-bold text-text-heading">{item.name}</span>
          <span className="text-caption text-text-default">
            {item.volumeM3 > 0 ? t("plan.home.perItem", { values: { volume: volumeText(item.volumeM3, locale) } }) : t("plan.home.volumeUnknown")}
            {item.catalogId ? null : ` · ${t("plan.home.customBadge")}`}
          </span>
          {item.notes ? <span className="text-caption text-text-muted">{item.notes}</span> : null}
        </div>
      </div>

      <Counter
        value={item.count}
        min={1}
        max={200}
        label={t("plan.quantityOf", { values: { name: item.name } })}
        decreaseLabel={t("plan.decrease", { values: { name: item.name } })}
        increaseLabel={t("plan.increase", { values: { name: item.name } })}
        onChange={(count) => onChange({ count })}
      />

      {item.canAssemble ? (
        <div>
          <label htmlFor={id} className="sr-only">
            {t("plan.home.preparation")}
          </label>
          <select
            id={id}
            className={`${selectClass} min-w-[190px] py-2 text-caption`}
            style={selectStyle}
            value={item.prep}
            onChange={(event) => onChange({ prep: event.target.value as Preparation })}
            aria-invalid={item.prep === "unanswered"}
          >
            <option value="unanswered" disabled>
              {t("plan.prep.unanswered")}
            </option>
            {PREPARATION.map((prep) => (
              <option key={prep} value={prep}>
                {t(`plan.prep.${prep}`)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 rounded-md bg-yellow-tint px-3 py-2 text-caption font-semibold text-text-heading">
          <Icon name="check" size={13} />
          {t("plan.prep.ready")}
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={t("plan.removeItem", { values: { name: item.name } })}
        className={`grid size-8 place-items-center ms-auto rounded-md text-text-default hover:bg-red-50 hover:text-brand-red ${focusRing}`}
      >
        <Icon name="close" size={16} />
      </button>
    </li>
  );
}

/** Browse the whole catalog, the room's own category first. */
function CatalogDialog({
  entries,
  loading,
  preferred,
  room,
  onAdd,
  onClose,
}: {
  entries: CatalogEntry[];
  loading: boolean;
  preferred: string | undefined;
  room: Room;
  onAdd: (entry: CatalogEntry) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const { roomTypeName } = usePlanner();

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const entry of entries) if (!seen.includes(entry.category)) seen.push(entry.category);
    return seen.sort((a, b) => Number(b === preferred) - Number(a === preferred));
  }, [entries, preferred]);

  const [category, setCategory] = useState<string>(preferred && categories.includes(preferred) ? preferred : categories[0] ?? "");
  const shown = entries.filter((entry) => entry.category === (category || categories[0]));
  const countOf = (entry: CatalogEntry) => room.items.find((item) => item.catalogId === entry.id)?.count ?? 0;

  return (
    <Dialog
      wide
      title={t("plan.home.catalogTitle", { values: { room: roomDisplayName(room, roomTypeName) } })}
      kicker={t("plan.home.kicker")}
      onClose={onClose}
      closeLabel={t("plan.close")}
      footer={
        <button type="button" className={primaryButton} onClick={onClose}>
          {t("plan.done")}
        </button>
      }
    >
      {loading ? <p className="text-body-sm text-text-muted">{t("common.loading")}</p> : null}

      <div role="tablist" aria-label={t("plan.home.categories")} className="flex flex-wrap gap-2">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={name === category}
            onClick={() => setCategory(name)}
            className={`rounded-full border px-3.5 py-1.5 text-caption font-semibold ${focusRing} ${
              name === category ? "border-brand-red bg-red-50 text-brand-red" : "border-border-default text-text-heading hover:border-border-strong"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <ul className="grid gap-2 md:grid-cols-2">
        {shown.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 rounded-md border border-border-default p-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-semibold text-text-heading">{entry.name}</span>
              <span className="text-caption text-text-muted">~{volumeText(entryVolume(entry), locale)} m³</span>
            </span>
            <button
              type="button"
              onClick={() => onAdd(entry)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border border-brand-red px-2.5 py-1.5 text-caption font-bold text-brand-red hover:bg-red-50 ${focusRing}`}
            >
              <Icon name="plus" size={13} />
              {countOf(entry) > 0 ? t("plan.home.addAnother", { values: { count: countOf(entry) } }) : t("plan.add")}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function CustomItemDialog({
  initialName,
  onSave,
  onClose,
}: {
  initialName: string;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [count, setCount] = useState(1);
  const [volume, setVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);

  const nameError = tried && name.trim().length < 2 ? t("plan.error.itemName") : undefined;

  const save = () => {
    setTried(true);
    if (name.trim().length < 2) return;
    const m3 = Number(volume.replace(",", "."));
    onSave({
      id: uid("item"),
      catalogId: null,
      name: name.trim(),
      count,
      volumeM3: Number.isFinite(m3) && m3 > 0 ? m3 : 0,
      canAssemble: true,
      prep: "unanswered",
      notes: notes.trim(),
    });
  };

  return (
    <Dialog
      title={t("plan.home.customTitle")}
      kicker={t("plan.home.kicker")}
      onClose={onClose}
      closeLabel={t("plan.close")}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className={primaryButton} onClick={save}>
            {t("plan.home.customSave")}
          </button>
        </>
      }
    >
      <Note tone="warm">{t("plan.home.customNote")}</Note>
      <Field id="custom-name" label={t("plan.home.customName")} required error={nameError}>
        <input id="custom-name" className={inputClass} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} {...describedBy("custom-name", nameError)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-semibold text-text-heading">{t("plan.home.customCount")}</span>
          <Counter
            value={count}
            min={1}
            max={200}
            onChange={setCount}
            label={t("plan.home.customCount")}
            decreaseLabel={t("plan.decrease", { values: { name: t("plan.home.customCount") } })}
            increaseLabel={t("plan.increase", { values: { name: t("plan.home.customCount") } })}
          />
        </div>
        <Field id="custom-volume" label={t("plan.home.customVolume")} optionalLabel={t("plan.optional")}>
          <UnitInput id="custom-volume" value={volume} onChange={setVolume} unit="m³" max={50} />
        </Field>
      </div>
      <Field id="custom-notes" label={t("plan.home.customNotes")} optionalLabel={t("plan.optional")}>
        <textarea id="custom-notes" rows={2} maxLength={300} className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("plan.home.customNotesPlaceholder")} />
      </Field>
    </Dialog>
  );
}

// ── Special items ───────────────────────────────────────────────────────

/**
 * An icon for the six the product shipped with. Anything the office adds is
 * drawn with the generic one — a catalogue row carries no icon, and a missing
 * entry must not blank the line.
 */
const SPECIAL_ICON: Record<string, string> = {
  piano: "piano",
  safe: "shield",
  aquarium: "fish",
  gym: "dumbbell",
  heavy: "weight",
  artwork: "art",
};
const specialIcon = (code: string) => SPECIAL_ICON[code] ?? "box";

/**
 * Pianos, safes and the like.
 *
 * The engine has no surcharge for any of them, so they are not priced here —
 * they are listed for the team, and the review says the team will confirm the
 * handling. That is what the prototype's own help text promises too.
 */
function SpecialItems() {
  const { t } = useI18n();
  const { plan, dispatch, errors, fieldRequired } = usePlanner();
  const [kind, setKind] = useState<SpecialKind | "">("");
  const specialCatalog = useSpecialCatalog();
  const offered = specialCatalog.data ?? [];
  /** The name the office gave it; the shipped six keep their translation. */
  const specialName = (code: string) => offered.find((entry) => entry.code === code)?.name ?? t(`plan.special.${code}`);

  const specials = plan.moving.specials;
  const total = specials.reduce((sum, item) => sum + item.count, 0);
  // A service may ask that special items always be listed (Dashboard → Services).
  const required = fieldRequired("home.specials");

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <span className="text-brand-red">
            <Icon name="shield" size={18} />
          </span>
          {t("plan.home.specialTitle")}
          {required ? (
            <span aria-hidden="true" className="text-brand-red">
              *
            </span>
          ) : null}
        </span>
      }
      sub={t("plan.home.specialSub")}
      actions={<span className="text-body-sm font-bold text-text-heading">{t("plan.home.itemsCount", { count: total })}</span>}
    >
      {specials.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {specials.map((special) => (
            <li key={special.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default p-3">
              <div className="flex min-w-[12rem] flex-1 items-start gap-3">
                <span className="mt-0.5 text-brand-red">
                  <Icon name={specialIcon(special.kind)} size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-body-sm font-bold text-text-heading">{specialName(special.kind)}</span>
                  <input
                    aria-label={t("plan.home.specialNotes", { values: { name: specialName(special.kind) } })}
                    placeholder={t("plan.home.specialNotesPlaceholder")}
                    className={`${inputClass} py-1.5 text-caption`}
                    maxLength={200}
                    value={special.notes}
                    onChange={(event) =>
                      dispatch({
                        type: "moving",
                        patch: (moving) => ({
                          specials: moving.specials.map((entry) => (entry.id === special.id ? { ...entry, notes: event.target.value } : entry)),
                        }),
                      })
                    }
                  />
                </div>
              </div>
              <Counter
                value={special.count}
                min={1}
                max={20}
                label={t("plan.quantityOf", { values: { name: specialName(special.kind) } })}
                decreaseLabel={t("plan.decrease", { values: { name: specialName(special.kind) } })}
                increaseLabel={t("plan.increase", { values: { name: specialName(special.kind) } })}
                onChange={(count) =>
                  dispatch({
                    type: "moving",
                    patch: (moving) => ({
                      specials: moving.specials.map((entry) => (entry.id === special.id ? { ...entry, count } : entry)),
                    }),
                  })
                }
              />
              <button
                type="button"
                aria-label={t("plan.removeItem", { values: { name: specialName(special.kind) } })}
                className={`grid size-8 place-items-center ms-auto rounded-md text-text-default hover:bg-red-50 hover:text-brand-red ${focusRing}`}
                onClick={() =>
                  dispatch({ type: "moving", patch: (moving) => ({ specials: moving.specials.filter((entry) => entry.id !== special.id) }) })
                }
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor="special-kind" className="text-body-sm font-semibold text-text-heading">
            {t("plan.home.specialAdd")}
          </label>
          <select id="special-kind" className={selectClass} style={selectStyle} value={kind} onChange={(event) => setKind(event.target.value as SpecialKind)}>
            <option value="" disabled>
              {t("plan.home.specialChoose")}
            </option>
            {offered.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!kind}
          className={secondaryButton}
          onClick={() => {
            if (!kind) return;
            dispatch({
              type: "moving",
              patch: (moving) => ({ specials: [...moving.specials, { id: uid("special"), kind, count: 1, notes: "" }] }),
            });
            setKind("");
          }}
        >
          <Icon name="plus" size={15} />
          {t("plan.add")}
        </button>
      </div>

      <ErrorText>{errors.specials ? t(errors.specials) : undefined}</ErrorText>
      <p className="text-caption text-text-muted">{t("plan.home.specialPriceNote")}</p>
    </Section>
  );
}

// ── By area ─────────────────────────────────────────────────────────────

/**
 * Moving priced by living area: the area, and what needs taking apart.
 *
 * Dismantling is asked per catalog item even here, because that is what the
 * engine prices; an area alone says nothing about whether the wardrobe comes
 * apart.
 */
function AreaHome() {
  const { t, locale } = useI18n();
  const { plan, dispatch, errors } = usePlanner();
  const catalog = useFurnitureCatalog();
  const [pick, setPick] = useState("");

  const m = plan.moving;
  const assemblable = (catalog.data ?? []).filter(canAssemble);
  const volume = inventoryVolume(plan);

  return (
    <div className="flex flex-col gap-5">
      <Section title={t("plan.home.areaTitle")} sub={t("plan.home.areaSub")}>
        <Field id="living-area" label={t("plan.home.livingArea")} required error={errors.area ? t(errors.area) : undefined}>
          <UnitInput id="living-area" value={m.areaSqm} onChange={(areaSqm) => dispatch({ type: "moving", patch: { areaSqm } })} unit="m²" max={2000} error={errors.area} />
        </Field>
        {volume > 0 ? (
          <p className="text-body-sm text-text-default">
            {t("plan.home.areaEstimate", { values: { volume: volumeText(volume, locale) } })}
          </p>
        ) : null}
      </Section>

      <Section title={t("plan.home.assemblyTitle")} sub={t("plan.home.assemblySub")}>
        <RadioCards
          name="area-assembly"
          legend={t("plan.home.assemblyTitle")}
          value={m.areaAssembly}
          onChange={(areaAssembly) => dispatch({ type: "moving", patch: { areaAssembly } })}
          options={[
            { value: "yes", label: t("plan.yes") },
            { value: "no", label: t("plan.no") },
          ]}
        />
        <ErrorText>{errors.areaAssembly ? t(errors.areaAssembly) : undefined}</ErrorText>

        {m.areaAssembly === "yes" ? (
          <div className="flex flex-col gap-3">
            {m.areaAssemblyItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default p-3">
                <span className="min-w-[10rem] flex-1 text-body-sm font-bold text-text-heading">{item.name}</span>
                <Counter
                  value={item.count}
                  min={1}
                  max={50}
                  label={t("plan.quantityOf", { values: { name: item.name } })}
                  decreaseLabel={t("plan.decrease", { values: { name: item.name } })}
                  increaseLabel={t("plan.increase", { values: { name: item.name } })}
                  onChange={(count) =>
                    dispatch({
                      type: "moving",
                      patch: (moving) => ({
                        areaAssemblyItems: moving.areaAssemblyItems.map((entry) => (entry.id === item.id ? { ...entry, count } : entry)),
                      }),
                    })
                  }
                />
                <select
                  aria-label={t("plan.home.preparation")}
                  className={`${selectClass} min-w-[190px] py-2 text-caption`}
                  style={selectStyle}
                  value={item.prep}
                  onChange={(event) =>
                    dispatch({
                      type: "moving",
                      patch: (moving) => ({
                        areaAssemblyItems: moving.areaAssemblyItems.map((entry) =>
                          entry.id === item.id ? { ...entry, prep: event.target.value as Preparation } : entry,
                        ),
                      }),
                    })
                  }
                >
                  <option value="unanswered" disabled>
                    {t("plan.prep.unanswered")}
                  </option>
                  {(["dis", "re", "both"] as const).map((prep) => (
                    <option key={prep} value={prep}>
                      {t(`plan.prep.${prep}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t("plan.removeItem", { values: { name: item.name } })}
                  className={`grid size-8 place-items-center ms-auto rounded-md text-text-default hover:bg-red-50 hover:text-brand-red ${focusRing}`}
                  onClick={() =>
                    dispatch({
                      type: "moving",
                      patch: (moving) => ({ areaAssemblyItems: moving.areaAssemblyItems.filter((entry) => entry.id !== item.id) }),
                    })
                  }
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                <label htmlFor="area-assembly-item" className="text-body-sm font-semibold text-text-heading">
                  {t("plan.home.assemblyAdd")}
                </label>
                <select id="area-assembly-item" className={selectClass} style={selectStyle} value={pick} onChange={(event) => setPick(event.target.value)}>
                  <option value="" disabled>
                    {catalog.isLoading ? t("common.loading") : t("plan.home.assemblyChoose")}
                  </option>
                  {assemblable.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={secondaryButton}
                disabled={!pick}
                onClick={() => {
                  const entry = assemblable.find((candidate) => candidate.id === pick);
                  if (!entry) return;
                  dispatch({ type: "moving", patch: (moving) => ({ areaAssemblyItems: [...moving.areaAssemblyItems, newItem(entry)] }) });
                  setPick("");
                }}
              >
                <Icon name="plus" size={15} />
                {t("plan.add")}
              </button>
            </div>
            <ErrorText>{errors.areaAssemblyItems ? t(errors.areaAssemblyItems) : undefined}</ErrorText>
          </div>
        ) : null}
      </Section>

      <SpecialItems />
    </div>
  );
}
