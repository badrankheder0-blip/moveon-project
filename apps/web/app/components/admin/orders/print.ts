/**
 * The orders screens' downloads: the "Excel" export (a CSV the way German
 * Excel opens it — BOM, semicolons, decimal commas) and the printable pages
 * the browser turns into a PDF.
 */

export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/** "1234,50" — what German Excel reads as a number. */
export const csvNumber = (value: number | string) => (Math.round((Number(value) || 0) * 100) / 100).toFixed(2).replace(".", ",");

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = `﻿${rows.map((row) => row.map(quote).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a printable page and prints it. False when the browser blocked the window. */
export function openPrint(html: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

const BASE_CSS =
  "body{font-family:Helvetica,Arial,sans-serif;color:#252b28;margin:48px;font-size:13px;line-height:1.5}" +
  "header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #d71635;padding-bottom:18px;margin-bottom:22px;gap:24px}" +
  "header img{height:34px}h1{font-size:22px;margin:0 0 2px}small{color:#737870}p{margin:0 0 8px}" +
  ".grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}" +
  "h2{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#737870;margin:22px 0 8px}" +
  "table{width:100%;border-collapse:collapse}td,th{padding:9px 0;border-bottom:1px solid #e3e5de;vertical-align:top;text-align:start}" +
  "th{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#737870;font-weight:600}" +
  ".r{text-align:end;white-space:nowrap}.t td{border-bottom:0;font-weight:700;font-size:16px;padding-top:14px}" +
  ".pad td,.pad th{padding-inline-end:12px}@media print{body{margin:24px}}";

function page(title: string, dir: "ltr" | "rtl", lang: string, body: string) {
  // Split so this file never contains a literal closing script tag.
  const tag = "scr" + "ipt";
  return `<!DOCTYPE html><html lang="${esc(lang)}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE_CSS}</style></head><body>${body}<${tag}>window.onload=function(){setTimeout(function(){window.print()},350)}</${tag}></body></html>`;
}

export interface OrderPrint {
  dir: "ltr" | "rtl";
  lang: string;
  logo: string;
  title: string;
  date: string;
  labels: { customer: string; schedule: string; addresses: string; price: string; subtotal: string; discount: string; net: string; vat: string; total: string };
  customer: string[];
  schedule: string[];
  addresses: { label: string; text: string }[];
  lines: { label: string; rate?: string; amount: string }[];
  subtotal: string;
  discount?: { code: string; amount: string } | null;
  net: string;
  vatRate: string;
  vat: string;
  total: string;
}

/** The order as one printable page: who, when, where and the price. */
export function orderPrintHtml(o: OrderPrint): string {
  const rows = o.lines
    .map((line) => `<tr><td>${esc(line.label)}${line.rate ? `<br><small>${esc(line.rate)}</small>` : ""}</td><td class="r">${esc(line.amount)}</td></tr>`)
    .join("");
  const body =
    `<header><img src="${esc(o.logo)}" alt="m.on"><div style="text-align:end"><h1>${esc(o.title)}</h1><small>${esc(o.date)}</small></div></header>` +
    `<div class="grid"><div><h2>${esc(o.labels.customer)}</h2><p>${o.customer.map((x, i) => (i === 0 ? `<b>${esc(x)}</b>` : esc(x))).join("<br>")}</p></div>` +
    `<div><h2>${esc(o.labels.schedule)}</h2>${o.schedule.map((x) => `<p>${esc(x)}</p>`).join("")}</div></div>` +
    `<h2>${esc(o.labels.addresses)}</h2>${o.addresses.map((a) => `<p><small>${esc(a.label)}</small><br>${esc(a.text)}</p>`).join("")}` +
    `<h2>${esc(o.labels.price)}</h2><table>${rows}` +
    `<tr><td>${esc(o.labels.subtotal)}</td><td class="r">${esc(o.subtotal)}</td></tr>` +
    (o.discount ? `<tr><td>${esc(o.labels.discount)} (${esc(o.discount.code)})</td><td class="r">−${esc(o.discount.amount)}</td></tr>` : "") +
    `<tr><td>${esc(o.labels.net)}</td><td class="r">${esc(o.net)}</td></tr>` +
    `<tr><td>${esc(o.labels.vat)} ${esc(o.vatRate)}%</td><td class="r">${esc(o.vat)}</td></tr>` +
    `<tr class="t"><td>${esc(o.labels.total)}</td><td class="r">${esc(o.total)}</td></tr></table>`;
  return page(o.title, o.dir, o.lang, body);
}

export interface ListPrint {
  dir: "ltr" | "rtl";
  lang: string;
  logo: string;
  title: string;
  sub: string;
  head: string[];
  /** Index of the columns to right-align (money). */
  numeric: number[];
  rows: string[][];
  footer?: string;
}

/** The orders list as a printable table. */
export function listPrintHtml(l: ListPrint): string {
  const cell = (value: string, i: number, tagName: "td" | "th") => `<${tagName}${l.numeric.includes(i) ? ' class="r"' : ""}>${esc(value)}</${tagName}>`;
  const body =
    `<header><img src="${esc(l.logo)}" alt="m.on"><div style="text-align:end"><h1>${esc(l.title)}</h1><small>${esc(l.sub)}</small></div></header>` +
    `<table class="pad"><thead><tr>${l.head.map((h, i) => cell(h, i, "th")).join("")}</tr></thead><tbody>` +
    l.rows.map((row) => `<tr>${row.map((v, i) => cell(v, i, "td")).join("")}</tr>`).join("") +
    `</tbody></table>${l.footer ? `<p style="margin-top:16px"><small>${esc(l.footer)}</small></p>` : ""}`;
  return page(l.title, l.dir, l.lang, body);
}
