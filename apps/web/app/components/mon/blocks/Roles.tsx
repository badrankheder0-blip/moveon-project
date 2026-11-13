"use client";

import { Arrow } from "../Icons";
import { PIN } from "./kit";

/**
 * The jobs page's open roles (the prototype's `isRoles`). "Apply" picks the
 * role in the application form below and scrolls to it.
 */
export function RolesBlock({
  eyebrow,
  title,
  apply,
  roles,
  formId = "apply",
}: {
  eyebrow: string;
  title: string;
  apply: string;
  roles: { title: string; text: string; type: string; place: string }[];
  formId?: string;
}) {
  if (!roles.length) return null;

  const pick = (role: string) => {
    window.dispatchEvent(new CustomEvent("mon:form-set", { detail: { form: formId, name: "role", value: role } }));
    const form = document.getElementById(formId);
    if (form) window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
  };

  return (
    <section id="roles" style={{ position: "relative", scrollMarginTop: 100 }}>
      <div className="mp-sec">
        <div className="mp-roles-head" data-rv="1">
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
        </div>
        <div className="mp-roles">
          {roles.map((role, i) => (
            <div key={`${role.title}-${i}`} className="mp-role" data-rv={(i % 4) + 1}>
              <div>
                <b>{role.title}</b>
                <small>{role.text}</small>
              </div>
              <div className="mp-role-tags">
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={PIN} />
                  </svg>
                  {role.place}
                </span>
                <span>{role.type}</span>
              </div>
              <button type="button" onClick={() => pick(role.title)}>
                {apply}
                <Arrow />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
