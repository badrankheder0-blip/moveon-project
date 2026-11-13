import type { CSSProperties } from "react";

/**
 * The animated routes over the NRW map: a pulsing m.on hub in the middle and
 * nine city pins, each joined to it by a dashed curve with red dots running
 * along it. The prototype's `coverage()`, drawn twice — once for wide screens
 * and once, with everything larger, for phones — and switched in CSS.
 *
 * SVG SMIL animations, so it moves without a line of client JavaScript.
 */

const VW = 1431;
const VH = 1402;
const HUB_X = 625;
const HUB_Y = 655;
const RED = "#d71635";

const CITIES: [number, number, string][] = [
  [122, 1084, "Aachen"],
  [441, 990, "Köln"],
  [491, 1106, "Bonn"],
  [373, 822, "Düsseldorf"],
  [369, 702, "Duisburg"],
  [683, 392, "Münster"],
  [1013, 351, "Bielefeld"],
  [1095, 535, "Paderborn"],
  [828, 1026, "Siegen"],
];

const round = (n: number) => Math.round(n * 10) / 10;

function coverageSvg(small: boolean): string {
  const pinScale = small ? 2.2 : 1.35;
  const lineScale = small ? 2 : 1.3;
  const hubScale = small ? 1.7 : 1.25;
  const id = small ? "s" : "l";
  let lines = "";
  let dots = "";
  let pins = "";

  CITIES.forEach(([x, y, name], i) => {
    const angle = Math.atan2(y - HUB_Y, x - HUB_X);
    const sx = HUB_X + 66 * hubScale * Math.cos(angle);
    const sy = HUB_Y + 66 * hubScale * Math.sin(angle);
    const k = (i % 2 ? 1 : -1) * 0.16;
    const cx = (sx + x) / 2 - (y - sy) * k;
    const cy = (sy + y) / 2 + (x - sx) * k;
    const dur = (3.4 + (i % 3) * 0.6).toFixed(1);
    const begin = -((i * 0.53) % Number(dur));

    lines += `<path id="mcv${id}${i}" d="M${round(sx)} ${round(sy)}Q${round(cx)} ${round(cy)} ${x} ${y}" fill="none" stroke="#8f9491" stroke-width="${1.4 * lineScale}" stroke-dasharray="${3 * lineScale} ${6 * lineScale}" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="0" to="${-9 * lineScale}" dur="1.4s" repeatCount="indefinite"/></path>`;

    [5.5, 4, 2.8].forEach((r, j) => {
      const at = round(begin + j * 0.13);
      dots += `<circle r="${round(r * lineScale)}" fill="${RED}" opacity="0"><animateMotion dur="${dur}s" begin="${at}s" repeatCount="indefinite"><mpath href="#mcv${id}${i}"/></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.88;1" dur="${dur}s" begin="${at}s" repeatCount="indefinite"/></circle>`;
    });

    pins +=
      `<g transform="translate(${x} ${y}) scale(${pinScale})"><ellipse cx="0" cy="2" rx="8" ry="2.2" fill="#1d2220" opacity=".16"/><text y="22" text-anchor="middle" font-family="Outfit,DM Sans,Arial,sans-serif" font-size="13" font-weight="700" fill="#1d2220" stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${name}</text>` +
      `<g class="mh"><title>${name}</title><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${(2.6 + (i % 4) * 0.35).toFixed(2)}s" begin="-${(i * 0.41).toFixed(2)}s" repeatCount="indefinite"/>` +
      `<circle cy="-26" r="20" fill="none" stroke="${RED}" stroke-width="1.6" opacity="0"><animate attributeName="r" values="19;36;36" keyTimes="0;.22;1" dur="${dur}s" begin="${round(begin)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".85;0;0" keyTimes="0;.22;1" dur="${dur}s" begin="${round(begin)}s" repeatCount="indefinite"/></circle>` +
      `<path d="M0 0C-5 -7 -17 -15 -17 -26A17 17 0 1 1 17 -26C17 -15 5 -7 0 0Z" fill="${RED}"/><circle cy="-26" r="11.5" fill="#ffffff"/><path d="M-6 -21V-27L0 -32.5L6 -27V-21ZM-1.8 -21V-25H1.8V-21" fill="none" stroke="${RED}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></g></g></g>`;
  });

  const hub = `<g transform="translate(${HUB_X} ${HUB_Y}) scale(${hubScale})"><circle r="72" fill="none" stroke="${RED}" stroke-width="1.4"><animate attributeName="r" values="72;100" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="2.6s" repeatCount="indefinite"/></circle><circle r="72" fill="#ffffff" stroke="${RED}" stroke-width="1.2"/><circle r="84" fill="none" stroke="${RED}" stroke-width="1" stroke-dasharray="2 9" stroke-linecap="round" opacity=".55"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite"/></circle><circle r="63" fill="${RED}"/></g>`;

  return `<svg class="m-cov-svg ${small ? "is-sm" : "is-lg"}" data-cov="1" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="m.on coverage across North Rhine-Westphalia">${lines}${dots}${hub}${pins}</svg>`;
}

const SVG = coverageSvg(false) + coverageSvg(true);

export function CoverageMap({ map, symbol }: { map: string; symbol: string }) {
  return (
    <div className="m-cov">
      <img src={map} alt="" />
      <div className="m-cov-layer">
        <div style={{ position: "relative", width: "100%" }}>
          <div dangerouslySetInnerHTML={{ __html: SVG }} />
          <img
            className="m-cov-sym"
            src={symbol}
            alt=""
            aria-hidden="true"
            style={
              {
                left: `${(HUB_X / VW) * 100}%`,
                top: `${(HUB_Y / VH) * 100}%`,
                "--w-lg": `${((64 * 1.25) / VW) * 100}%`,
                "--w-sm": `${((64 * 1.7) / VW) * 100}%`,
              } as CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
}
