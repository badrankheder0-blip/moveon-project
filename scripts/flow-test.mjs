/**
 * End-to-end flow test for every "edit in the dashboard → it shows up for a
 * visitor" path.
 *
 * Each domain is driven the way the dashboard drives it: write a draft, prove
 * the public side has NOT moved yet, publish, prove it has, then put the
 * original back and prove that too.
 */
const API = 'http://localhost:4000';
const WEB = 'http://localhost:3200';
const CRED = { email: 'admin@umzugplus.de', password: 'ChangeMe123!' };
const MARK = 'ZZ' + Date.now().toString().slice(-6);

let TOK = '';
const results = [];

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(auth && TOK ? { authorization: 'Bearer ' + TOK } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const draft = (d, ref, value) => api(`/api/admin/config/drafts/${d}`, { method: 'POST', body: { ref, value } });
const publish = () => api('/api/admin/config/publish', { method: 'POST' });
const summary = () => api('/api/admin/config/summary');
const dropDrafts = () => api('/api/admin/config/drafts', { method: 'DELETE' });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const short = (v) => JSON.stringify(v ?? null).slice(0, 52);

function rec(domain, step, ok, detail) {
  results.push({ domain, step, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ' — ' + detail : ''}`);
}

async function flow({ name, domain, ref, read, draftValue, expect, restoreValue }) {
  console.log(`\n### ${name}  [${domain}]`);
  const before = await read();
  if (before === undefined || before === null) { rec(domain, 'read original', false, 'could not read'); return; }
  rec(domain, 'read original', true, short(before));

  const d = await draft(domain, ref, draftValue(before));
  rec(domain, 'write draft', d.status === 200, `HTTP ${d.status}${d.status === 200 ? '' : ' ' + d.text.slice(0, 110)}`);
  if (d.status !== 200) { await dropDrafts(); return; }

  const s = await summary();
  rec(domain, 'shows as pending', (s.json?.byDomain?.[domain] ?? 0) > 0, `pending=${s.json?.byDomain?.[domain] ?? 0}`);
  rec(domain, 'NOT public before publish', eq(await read(), before), 'visitor still sees the old value');

  const p = await publish();
  rec(domain, 'publish', p.status === 200, `HTTP ${p.status} published=${p.json?.published ?? '?'}`);

  const after = await read();
  rec(domain, 'public after publish', expect(after), short(after));

  // Restore: object-valued domains need the whole record back, not the one
  // field this test read.
  await draft(domain, ref, restoreValue ? restoreValue(before) : before);
  await publish();
  rec(domain, 'restored', eq(await read(), before), short(await read()));
}

async function main() {
  const login = await api('/api/auth/login', { method: 'POST', body: CRED, auth: false });
  if (login.status !== 200) { console.log('login failed', login.status); process.exit(1); }
  TOK = login.json.accessToken;
  console.log('signed in as', CRED.email, '\nmarker:', MARK);
  await dropDrafts();

  // ── 1. Website copy ────────────────────────────────────────────────
  await flow({
    name: 'Homepage headline → website', domain: 'content', ref: 'home|hero.headline|de',
    read: async () => (await api('/api/site/content?locale=de&section=home', { auth: false })).json?.sections?.home?.['hero.headline'],
    draftValue: () => MARK + ' headline', expect: (a) => a === MARK + ' headline',
  });

  // ── 2. A page photo (image block) ──────────────────────────────────
  await flow({
    name: 'Homepage photo → website', domain: 'content', ref: 'home|services.1.img|de',
    read: async () => (await api('/api/site/content?locale=de&section=home', { auth: false })).json?.sections?.home?.['services.1.img'],
    draftValue: () => '/images/mon/photos/team-care.webp', expect: (a) => a === '/images/mon/photos/team-care.webp',
  });

  // ── 3. Brand settings ──────────────────────────────────────────────
  await flow({
    name: 'Company name → site chrome', domain: 'settings', ref: 'brand.name',
    read: async () => (await api('/api/site/settings')).json?.settings?.find((x) => x.key === 'brand.name')?.value,
    draftValue: () => MARK, expect: (a) => a === MARK,
  });

  // ── 4. A price the quote engine uses ───────────────────────────────
  await flow({
    name: 'Per-km rate → quote engine', domain: 'pricing', ref: 'km',
    read: async () => (await api('/api/pricing')).json?.rates?.find((r) => r.key === 'km')?.value,
    draftValue: () => '7.77', expect: (a) => String(a) === '7.77',
  });

  // ── 5. Service zone ────────────────────────────────────────────────
  const z = (await api('/api/zones')).json?.zones?.[0];
  if (z) await flow({
    name: 'Service zone → coverage check', domain: 'zones', ref: z.id,
    read: async () => (await api('/api/zones')).json?.zones?.find((x) => x.id === z.id)?.name,
    draftValue: () => ({ ...z, name: MARK + ' zone' }), expect: (a) => a === MARK + ' zone',
    restoreValue: () => ({ ...z }),
  });

  // ── 6. Discount code ───────────────────────────────────────────────
  const c = (await api('/api/discounts')).json?.codes?.[0];
  if (c) await flow({
    name: 'Discount code → checkout', domain: 'discounts', ref: c.code,
    read: async () => (await api('/api/discounts')).json?.codes?.find((x) => x.code === c.code)?.value,
    draftValue: () => ({ kind: c.kind, value: '12.00', validUntil: c.validUntil, isActive: c.isActive, audience: c.audience ?? [] }),
    expect: (a) => String(a) === '12.00',
    restoreValue: (b) => ({ kind: c.kind, value: b, validUntil: c.validUntil, isActive: c.isActive, audience: c.audience ?? [] }),
  });

  // ── 7. A service's name, as the booking planner shows it ───────────
  const svc = (await api('/api/services')).json?.services?.find((s) => s.key === 'moving');
  const base = svc && { key: 'moving', isActive: true, name: svc.name, description: svc.description ?? {},
    tagline: svc.tagline ?? {}, image: svc.image ?? '', icon: svc.icon ?? null,
    pricingModel: svc.pricingModel, flow: svc.flow ?? [], sortOrder: svc.sortOrder ?? 0 };
  if (svc) await flow({
    name: 'Service name → planner & menu', domain: 'services', ref: 'moving',
    read: async () => (await api('/api/services', { auth: false })).json?.services?.find((s) => s.key === 'moving')?.name?.de,
    draftValue: () => ({ ...base, name: { ...svc.name, de: MARK + ' Umzug' } }),
    expect: (a) => a === MARK + ' Umzug',
    restoreValue: () => ({ ...base }),
  });

  // ── 8. Upload → object store → page photo ─────────────────────────
  console.log('\n### Photo upload → MinIO → page  [uploads]');
  const probe = await api('/api/site/uploads?kind=image', { method: 'POST' });
  if (probe.status === 503) {
    rec('uploads', 'storage configured', false, 'API answers 503 — S3_* not set');
  } else {
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync('apps/web/public/images/mon/photos/team-care.webp');
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'image/webp' }), 'team-care.webp');
    const up = await fetch(API + '/api/site/uploads?kind=image', { method: 'POST', headers: { authorization: 'Bearer ' + TOK }, body: form });
    const upJson = await up.json().catch(() => null);
    rec('uploads', 'upload accepted', (up.status === 200 || up.status === 201) && !!upJson?.url, `HTTP ${up.status}`);

    if (upJson?.url) {
      rec('uploads', 'URL is https (the only kind a block may hold)', upJson.url.startsWith('https://'), upJson.url.slice(0, 48) + '…');
      const back = await fetch(upJson.url);
      const got = Buffer.from(await back.arrayBuffer());
      rec('uploads', 'object readable by anyone', back.status === 200, `HTTP ${back.status} ${got.length} bytes`);
      rec('uploads', 'bytes survive the round trip', got.equals(bytes), `${got.length} == ${bytes.length}`);

      const slot = 'home|services.1.img|de';
      const original = (await api('/api/site/content?locale=de&section=home', { auth: false })).json?.sections?.home?.['services.1.img'];
      await draft('content', slot, upJson.url);
      await publish();
      const nowSrc = (await api('/api/site/content?locale=de&section=home', { auth: false })).json?.sections?.home?.['services.1.img'];
      rec('uploads', 'attaches to a page block', nowSrc === upJson.url, 'content block now points at the upload');
      await draft('content', slot, original);
      await publish();
      rec('uploads', 'page photo restored', (await api('/api/site/content?locale=de&section=home', { auth: false })).json?.sections?.home?.['services.1.img'] === original, original);
    }
  }

  // ── 9. A special item, added in the dashboard, priced by the engine ──
  console.log('\n### Special item → quote engine  [catalogue]');
  const quoteBody = {
    input: {
      serviceType: 'moving', customerType: 'private',
      originAddress: 'Köln 50667', destinationAddress: 'Düsseldorf 40210',
      originFloor: 2, destinationFloor: 1, originHasElevator: false, destinationHasElevator: true,
      calculationMethod: 'area', areaSqm: 60,
      extras: { packingService: false, parkingZone: false, transportInsurance: true },
      crewSize: 2, secondVan: false, scheduledDate: '2027-03-15',
    },
  };
  const priceOf = async (specialItems) => {
    const body = { input: { ...quoteBody.input, ...(specialItems ? { specialItems } : {}) } };
    const res = await api('/api/quotes', { method: 'POST', body, auth: false });
    return res.json?.breakdown ?? {};
  };

  const plain = await priceOf(null);
  rec('catalogue', 'a quote prices without specials', Boolean(plain.totalGross), plain.totalGross);

  // One fixed row, reused: retiring an item keeps its name (that is what stops
  // a duplicate), so minting a new one per run would pile up dead rows. This
  // creates it once and revives it afterwards, and leaves it retired.
  const code = 'zz-flow-test';
  const name = 'Flow-Test Gegenstand (nicht buchbar)';
  const existing = ((await api('/api/catalog?includeInactive=true')).json?.items ?? []).find((item) => item.code === code);

  const made = existing
    ? await api(`/api/catalog/${existing.id}`, { method: 'PATCH', body: { isActive: true, price: '200.00' } })
    : await api('/api/catalog', { method: 'POST', body: { kind: 'special', category: 'Besondere Gegenstände', code, name, price: '200.00' } });
  rec('catalogue', 'special item ready', made.status === 200 || made.status === 201, `HTTP ${made.status}`);

  if (made.json?.id) {
    const offered = (await api(`/api/catalog?kind=special`, { auth: false })).json?.items ?? [];
    rec('catalogue', 'planner is offered it', offered.some((item) => item.code === code), `${offered.length} on offer`);

    const withTwo = await priceOf({ [code]: 2 });
    const line = (withTwo.lines ?? []).find((entry) => entry.key === 'line.special');
    rec('catalogue', 'engine prices it', line?.amount === '400.00', `2 × 200 = ${line?.amount}`);
    rec('catalogue', 'line carries the name the office gave it', line?.params?.name === name, String(line?.params?.name));

    await api(`/api/catalog/${made.json.id}`, { method: 'PATCH', body: { price: '350.00' } });
    const repriced = (await priceOf({ [code]: 2 })).lines?.find((entry) => entry.key === 'line.special');
    rec('catalogue', 'reprice reaches the engine at once', repriced?.amount === '700.00', `2 × 350 = ${repriced?.amount}`);

    await api(`/api/catalog/${made.json.id}`, { method: 'DELETE' });
    const retired = (await priceOf({ [code]: 2 })).lines?.find((entry) => entry.key === 'line.special');
    rec('catalogue', 'retired item prices at nothing', retired === undefined, 'no special line');
    rec('catalogue', 'and no longer offered', !((await api('/api/catalog?kind=special', { auth: false })).json?.items ?? []).some((i) => i.code === code), 'gone from the planner');
  }

  console.log('\n--- drafts left behind (must be empty) ---');
  console.log(JSON.stringify((await summary()).json));
  await dropDrafts();

  // ── Website-level proof: the page itself, not just the API ─────────
  console.log('\n### Website render (ISR, revalidate 60s)');
  await draft('content', 'home|hero.headline|de', MARK + ' live');
  await publish();
  let seen = false;
  for (let i = 0; i < 10 && !seen; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    seen = (await (await fetch(WEB + '/de')).text()).includes(MARK + ' live');
  }
  rec('website', 'headline reaches the rendered page', seen, seen ? 'within ISR window' : 'not seen in 80s');

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n===== ${pass}/${results.length} checks passed =====`);
  for (const f of results.filter((r) => !r.ok)) console.log(`  FAIL ${f.domain} / ${f.step} — ${f.detail}`);
}
main().catch((e) => { console.error('crashed:', e); process.exit(1); });
