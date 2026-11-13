"use client";

import Link from "next/link";
import { useState } from "react";

import { useSdk } from "@/lib/api";

import { Icon } from "../Icons";
import { PIN } from "./kit";

/**
 * The locations page's postcode check beside the cities served (the
 * prototype's `isCities`).
 *
 * A five-digit postcode is looked up in the service zones the office draws
 * in the dashboard (`GET /api/zones/match`); a match names its zone. Outside
 * every zone, a postcode starting with one of the NRW prefixes still counts
 * as covered, as in the prototype; anything else is "outside NRW".
 */

export interface PlzCopy {
  eyebrow: string;
  title: string;
  button: string;
  placeholder: string;
  yes: string;
  yesText: string;
  yesLink: string;
  yesHref: string;
  no: string;
  noText: string;
  noLink: string;
  noHref: string;
  bad: string;
  prefixes: string;
}

type Result = { kind: "yes"; zone: string } | { kind: "no" } | { kind: "bad" } | null;

const CHECK = "M5 12l5 5L20 7";
const BANG = "M12 7.5v5.5M12 16.5h.01";

export function CitiesBlock({ plz, citiesTitle, cities, note }: { plz: PlzCopy; citiesTitle: string; cities: string[]; note: string }) {
  const sdk = useSdk();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>(null);

  const check = async () => {
    if (code.length !== 5) {
      setResult({ kind: "bad" });
      return;
    }
    let zone = "";
    try {
      const found = await sdk.http.get<{ zone: { name: string } | null }>("/api/zones/match", { postcode: code });
      zone = found.zone?.name ?? "";
    } catch {
      // Without the zones, the NRW prefixes still answer.
    }
    const prefixes = plz.prefixes.split(/[\s,;]+/).filter(Boolean);
    setResult(zone || prefixes.includes(code.slice(0, 2)) ? { kind: "yes", zone } : { kind: "no" });
  };

  const tone = result?.kind === "yes" ? "#3f705a" : result?.kind === "no" ? "#a0661c" : "#d71635";

  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec mp-cities">
        <div className="mp-plz" data-rv="1">
          <span>{plz.eyebrow}</span>
          <h2>{plz.title}</h2>
          <form
            className="mp-plz-row"
            onSubmit={(event) => {
              event.preventDefault();
              void check();
            }}
          >
            <input
              dir="ltr"
              inputMode="numeric"
              maxLength={5}
              value={code}
              placeholder={plz.placeholder}
              aria-label={plz.title}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 5));
                setResult(null);
              }}
            />
            <button type="submit">{plz.button}</button>
          </form>
          {result ? (
            <div className="mp-plz-res" role="status">
              <span style={{ background: tone }}>
                <Icon d={result.kind === "yes" ? CHECK : BANG} size={14} width={2.6} />
              </span>
              <span>
                <b>{result.kind === "yes" ? `${plz.yes}${result.zone ? ` · ${result.zone}` : ""}` : result.kind === "no" ? plz.no : plz.bad}</b>
                {result.kind !== "bad" ? <span>{result.kind === "yes" ? plz.yesText : plz.noText}</span> : null}
                {result.kind !== "bad" ? (
                  <Link href={result.kind === "yes" ? plz.yesHref : plz.noHref}>{result.kind === "yes" ? plz.yesLink : plz.noLink}</Link>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
        <div className="mp-city-col">
          <h3 data-rv="1">{citiesTitle}</h3>
          <div className="mp-city-grid">
            {cities.map((city, i) => (
              <span key={`${city}-${i}`} data-rv={(i % 4) + 1}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d71635" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={PIN} />
                </svg>
                {city}
              </span>
            ))}
          </div>
          <p>{note}</p>
        </div>
      </div>
    </section>
  );
}
