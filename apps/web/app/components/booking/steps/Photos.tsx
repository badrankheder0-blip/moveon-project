"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { usePlanner } from "../context";
import { ErrorText, Icon, Note, focusRing, primaryButton } from "../ui";

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Photos of the home, stairs and tight spots.
 *
 * There is no customer upload endpoint, so the photos stay in this browser
 * and the screen says so — the prototype says the same ("Preview only ·
 * photos stay in this session"). The order notes tell the office how many the
 * customer has, so the team knows to ask for them.
 */
export function PhotosStep() {
  const { t } = useI18n();
  const { plan, dispatch, photoFiles, errors, fieldRequired, fieldShown, fieldLabel } = usePlanner();
  const required = fieldRequired("photos.photos");
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState("");

  function accept(list: FileList | null) {
    const incoming = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    const fits = incoming.filter((file) => file.size <= MAX_BYTES);
    const room = Math.max(0, MAX_PHOTOS - plan.photoNames.length);
    const kept = fits.slice(0, room);

    setRejected(
      incoming.length > kept.length
        ? t("plan.photos.rejected", { values: { max: MAX_PHOTOS } })
        : "",
    );

    const names = [...plan.photoNames];
    for (const file of kept) {
      // Two files with one name would overwrite each other's preview.
      let name = file.name;
      let n = 2;
      while (names.includes(name)) name = `${n++}-${file.name}`;
      names.push(name);
      photoFiles.current.set(name, file);
    }

    dispatch({ type: "patch", patch: { photoNames: names } });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files);
  }

  // Booking site → Common steps → Photos: the office may hide the upload
  // (the step then shows only its questions) or ask for at least one photo.
  if (!fieldShown("photos.photos")) return null;

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-brand-red bg-red-50" : errors.photos ? "border-danger bg-surface-page" : "border-border-default bg-surface-page"
        }`}
      >
        <span className="grid size-16 place-items-center rounded-xl bg-surface-card text-brand-red shadow-sm">
          <Icon name="photo" size={28} />
        </span>
        <h2 className="font-display text-h3 font-bold text-text-heading">
          {fieldLabel("photos.photos", t("plan.photos.title"))}
          {required ? (
            <span aria-hidden="true" className="text-brand-red">
              {" "}*
            </span>
          ) : null}
        </h2>
        <p className="max-w-md text-body text-text-heading">{t("plan.photos.lead")}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="sr-only"
          aria-label={t("plan.photos.add")}
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className={`${primaryButton} px-8`}
          disabled={plan.photoNames.length >= MAX_PHOTOS}
          onClick={() => input.current?.click()}
        >
          <Icon name="plus" size={18} />
          {t("plan.photos.add")}
        </button>
        <p className="text-body-sm text-text-default">{t("plan.photos.limits", { values: { max: MAX_PHOTOS } })}</p>
      </div>

      <ErrorText>{rejected || (errors.photos ? t(errors.photos) : undefined)}</ErrorText>

      {plan.photoNames.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {plan.photoNames.map((name) => (
            <li key={name} className="relative overflow-hidden rounded-md border border-border-default bg-surface-card">
              <Thumb file={photoFiles.current.get(name)} />
              <span className="block truncate px-2 py-1.5 text-caption text-text-default">{name}</span>
              <button
                type="button"
                aria-label={t("plan.photos.remove", { values: { name } })}
                onClick={() => {
                  photoFiles.current.delete(name);
                  dispatch({ type: "patch", patch: (current) => ({ photoNames: current.photoNames.filter((entry) => entry !== name) }) });
                }}
                className={`absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface-card/90 text-text-heading hover:text-brand-red ${focusRing}`}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Note icon="shield">{t("plan.photos.localOnly")}</Note>
    </div>
  );
}

/** A local preview; after a refresh only the name survives and the tile stays blank. */
function Thumb({ file }: { file: File | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <span className="grid aspect-square place-items-center bg-surface-sunken text-text-faint">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <Icon name="photo" size={22} />}
    </span>
  );
}
