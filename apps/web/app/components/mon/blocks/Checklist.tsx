"use client";

import { useEffect, useState } from "react";

import { Tick, pad2 } from "./kit";

/**
 * The moving plan's checklist (the prototype's `isChecklist`): phases of
 * tasks to tick off, with a progress bar. Ticks are remembered on this
 * device only, as in the prototype.
 */

const PLAN_KEY = "mon.site-plan";

export function ChecklistBlock({
  eyebrow,
  title,
  sub,
  progress,
  phases,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  progress: string;
  phases: { title: string; tasks: string[] }[];
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "{}") as unknown;
      if (saved && typeof saved === "object") setDone(saved as Record<string, boolean>);
    } catch {
      // Nothing remembered; every task starts open.
    }
  }, []);

  if (!phases.length) return null;

  const toggle = (key: string) => {
    setDone((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(PLAN_KEY, JSON.stringify(next));
      } catch {
        // Ticks then last only until the page is left.
      }
      return next;
    });
  };

  const all = phases.reduce((n, phase) => n + phase.tasks.length, 0);
  const count = phases.reduce((n, phase, i) => n + phase.tasks.filter((_, j) => done[`${i}-${j}`]).length, 0);
  const pct = `${Math.round((count / Math.max(1, all)) * 100)}%`;

  return (
    <section style={{ position: "relative" }}>
      <div className="mp-sec">
        <div className="mp-check-head" data-rv="1">
          <div>
            <span className="m-eyebrow">{eyebrow}</span>
            <h2 className="m-h2">{title}</h2>
            <p>{sub}</p>
          </div>
          <div className="mp-prog">
            <div>
              <span>{progress}</span>
              <span dir="ltr">
                {count} / {all}
              </span>
            </div>
            <div className="mp-prog-bar">
              <div style={{ width: pct }} />
            </div>
          </div>
        </div>
        <div className="mp-phases">
          {phases.map((phase, i) => (
            <div key={`${phase.title}-${i}`} className="mp-phase" data-rv={(i % 4) + 1}>
              <div className="mp-phase-head">
                <span dir="ltr">{pad2(i)}</span>
                <b>{phase.title}</b>
              </div>
              {phase.tasks.map((task, j) => {
                const key = `${i}-${j}`;
                return (
                  <button key={key} type="button" role="checkbox" aria-checked={!!done[key]} className="mp-task" onClick={() => toggle(key)}>
                    <span>
                      <Tick width={3.2} />
                    </span>
                    {task}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
