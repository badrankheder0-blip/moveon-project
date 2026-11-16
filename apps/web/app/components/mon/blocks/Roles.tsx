import Link from "next/link";

import { Arrow } from "../Icons";
import { PIN } from "./kit";

/**
 * The jobs page's open roles (the prototype's `isRoles`). The title opens the
 * posting's details and "Apply" its application page.
 */
export function RolesBlock({
  eyebrow,
  title,
  apply,
  roles,
}: {
  eyebrow: string;
  title: string;
  apply: string;
  roles: { title: string; text: string; type: string; place: string; href: string; applyHref: string }[];
}) {
  if (!roles.length) return null;

  return (
    <section id="roles" style={{ position: "relative", scrollMarginTop: 100 }}>
      <div className="mp-sec">
        <div className="mp-roles-head" data-rv="1">
          <span className="m-eyebrow">{eyebrow}</span>
          <h2 className="m-h2">{title}</h2>
        </div>
        <div className="mp-roles">
          {roles.map((role, i) => (
            <div key={role.href} className="mp-role" data-rv={(i % 4) + 1}>
              <div>
                <b>
                  <Link href={role.href} className="mp-role-link">
                    {role.title}
                  </Link>
                </b>
                <small>{role.text}</small>
              </div>
              <div className="mp-role-tags">
                {role.place ? (
                  <span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={PIN} />
                    </svg>
                    {role.place}
                  </span>
                ) : null}
                <span>{role.type}</span>
              </div>
              <Link href={role.applyHref} className="mp-role-apply">
                {apply}
                <Arrow />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
