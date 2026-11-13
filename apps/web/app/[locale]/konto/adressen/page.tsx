"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useAccountText, useFlash } from "@/app/components/account/AccountShell";
import { accountKeys, useProfile, type Profile, type SavedAddress } from "@/app/components/account/data";
import { Icon } from "@/app/components/account/Icon";
import { IC, RED } from "@/app/components/account/model";
import { useApi } from "@/lib/api";

const FLOORS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

type Draft = Omit<SavedAddress, "id" | "isDefault"> & { id: string | null; isDefault: boolean; err: string };

/**
 * The customer's address book: the addresses they book with most, one of
 * them the default. Kept on the account (`saved_addresses`), so it is the
 * same on every device.
 */
export default function AccountAddressesPage() {
  const { sdk } = useApi();
  const tx = useAccountText();
  const say = useFlash();
  const queryClient = useQueryClient();
  const profile = useProfile();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const list = profile.data?.savedAddresses ?? [];

  async function save(next: SavedAddress[], message?: string) {
    setBusy(true);
    try {
      const updated = await sdk.http.patch<Profile>("/api/users/me", { savedAddresses: next });
      queryClient.setQueryData(accountKeys.profile, (previous: Profile | undefined) =>
        previous ? { ...previous, savedAddresses: updated.savedAddresses ?? next } : previous,
      );
      if (message) say(message);
      return true;
    } catch {
      say(tx("errGeneric"), true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!draft) return;
    if (!draft.street.trim() || !draft.zip.trim() || !draft.city.trim()) {
      setDraft({ ...draft, err: tx("adErr") });
      return;
    }
    const record: SavedAddress = {
      id: draft.id ?? `a${Date.now().toString(36)}`,
      label: draft.label.trim(),
      street: draft.street.trim(),
      zip: draft.zip.trim(),
      city: draft.city.trim(),
      floor: draft.floor || "0",
      lift: draft.lift,
      isDefault: draft.id ? draft.isDefault : list.length === 0,
    };
    const next = draft.id ? list.map((entry) => (entry.id === draft.id ? record : entry)) : [...list, record];
    if (await save(next, tx("adSaved"))) setDraft(null);
  }

  const floorText = (floor: string) => (floor === "0" ? tx("ground") : `${tx("floorN")} ${floor}`);
  const field = (key: "label" | "street" | "zip" | "city", label: string, wide: boolean) =>
    draft ? (
      <label className={`ac-fl${wide ? " is-wide" : ""}`}>
        {label}
        <input
          value={draft[key]}
          dir={key === "zip" ? "ltr" : "auto"}
          maxLength={key === "zip" ? 12 : 160}
          onChange={(event) => setDraft({ ...draft, [key]: event.target.value, err: "" })}
        />
      </label>
    ) : null;

  return (
    <>
      <div className="ac-bar">
        <h1 className="ac-h1">{tx("addresses")}</h1>
        <button
          type="button"
          className="ac-addbtn"
          onClick={() => setDraft({ id: null, label: "", street: "", zip: "", city: "", floor: "0", lift: "no", isDefault: false, err: "" })}
        >
          <Icon d={IC.plus} size={14} sw={2.6} />
          {tx("addAddress")}
        </button>
      </div>

      {draft ? (
        <div className="ac-form2">
          {field("label", tx("adLabel"), true)}
          {field("street", tx("adStreet"), true)}
          {field("zip", tx("adZip"), false)}
          {field("city", tx("adCity"), false)}
          <label className="ac-fl">
            {tx("adFloor")}
            <select value={draft.floor} onChange={(event) => setDraft({ ...draft, floor: event.target.value })}>
              {FLOORS.map((floor) => (
                <option key={floor} value={floor}>
                  {floorText(floor)}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-fl">
            {tx("adLift")}
            <select value={draft.lift} onChange={(event) => setDraft({ ...draft, lift: event.target.value === "yes" ? "yes" : "no" })}>
              <option value="yes">{tx("yes")}</option>
              <option value="no">{tx("no")}</option>
            </select>
          </label>
          {draft.err ? <p className="ac-err is-wide">{draft.err}</p> : null}
          <div className="ac-btns is-wide">
            <button type="button" className="ac-btn-red" disabled={busy} onClick={() => void submit()}>
              {tx("save")}
            </button>
            <button type="button" className="ac-btn-line" onClick={() => setDraft(null)}>
              {tx("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {profile.isLoading ? <div className="ac-skel" style={{ height: 160, borderRadius: 18 }} /> : null}

      {list.length ? (
        <div className="ac-cards">
          {list.map((entry, i) => (
            <div key={entry.id} className={`ac-adcard${entry.isDefault ? " is-def" : ""}`} data-rv={String((i % 4) + 1)}>
              <div>
                <b>
                  <Icon d={IC.pin} size={16} sw={2} color={RED} />
                  <span dir="auto">{entry.label || tx("addresses")}</span>
                </b>
                {entry.isDefault ? <span className="ac-defbadge">{tx("defaultAddr")}</span> : null}
              </div>
              <span dir="auto">
                {entry.street}
                <br />
                {entry.zip} {entry.city}
              </span>
              <small>
                {floorText(entry.floor)} · {entry.lift === "yes" ? tx("lift") : tx("noLift")}
              </small>
              <div className="ac-adacts">
                <button type="button" className="is-edit" onClick={() => setDraft({ ...entry, err: "" })}>
                  {tx("edit")}
                </button>
                {!entry.isDefault ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(list.map((other) => ({ ...other, isDefault: other.id === entry.id })))}
                  >
                    {tx("makeDefault")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="is-del"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(tx("confirmDel"))) void save(list.filter((other) => other.id !== entry.id));
                  }}
                >
                  {tx("remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!profile.isLoading && !list.length && !draft ? <p className="ac-dashed">{tx("noAddresses")}</p> : null}
    </>
  );
}
