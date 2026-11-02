"use client";

// Premium, presentation-ready analytics UI for /admin/analytics.
// This is a CLIENT component (Recharts needs the DOM). It receives already
// fetched, plain-object data from the server component — it never touches
// credentials. Every number here is real GA4 data; nothing is invented.

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";

/* ── formatters ─────────────────────────────────────────────────────────── */
const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const dur = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60); return m ? `${m}m ${s % 60}s` : `${s}s`; };
const pct = (x) => `${((x || 0) * 100).toFixed(1)}%`;
const shortDate = (iso) => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso);
const trunc = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const sum = (arr, k) => (arr || []).reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
const hasVals = (arr, k = "value") => (arr || []).some((r) => Number(r?.[k]) > 0);

/* ── palette (tuned for the dark brand surface) ─────────────────────────── */
const ACCENT = "#e8722a", ACCENT2 = "#ff8a4c", BLUE = "#4c9ef0", GREEN = "#35c46a";
const SERIES = [ACCENT, BLUE, GREEN, "#a78bfa", "#f5a623", "#2dd4bf", "#f2647f", "#ffcf5c"];
const AXIS = "#6b6b72", GRID = "rgba(255,255,255,.06)";

/* ── icons (inline, consistent stroke) ──────────────────────────────────── */
const svg = (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
const Ic = {
  users: svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  active: svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
  newUser: svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>),
  session: svg(<><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M2 9h20M6 14h6" /></>),
  eye: svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  clock: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  gauge: svg(<><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M12 4a8 8 0 0 0-8 8 8 8 0 0 0 2 5.3M20 17.3A8 8 0 0 0 12 4" /><path d="m14.5 9.5-1.9 1.9" /></>),
  bounce: svg(<><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-4 4" /></>),
  globe: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></>),
  page: svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>),
  link: svg(<><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></>),
  device: svg(<><rect x="2" y="4" width="14" height="12" rx="2" /><path d="M2 20h20M17 8h5v10a2 2 0 0 1-2 2h-3Z" /></>),
  browser: svg(<><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></>),
  chip: svg(<><rect x="6" y="6" width="12" height="12" rx="1.5" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>),
  pin: svg(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  building: svg(<><rect x="4" y="2" width="16" height="20" rx="1.5" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>),
  ga: svg(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
};

/* ── shared bits ────────────────────────────────────────────────────────── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const head = label ?? payload[0]?.payload?.label ?? payload[0]?.name;
  return (
    <div className="tip">
      {head != null && <div className="tip-h">{typeof head === "string" && head.length === 10 && head[4] === "-" ? head : String(head)}</div>}
      {payload.map((p, i) => (
        <div className="tip-r" key={i}>
          <span className="tip-dot" style={{ background: p.color || p.fill }} />
          <span className="tip-n">{p.name}</span>
          <b>{nf.format(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

const Skel = ({ h }) => <div className="skel" style={{ height: h }} />;
const Empty = ({ label = "No data recorded in this range yet" }) => <div className="empty">{label}</div>;

function ChartCard({ title, sub, icon, span, children }) {
  return (
    <section className={"card" + (span ? " span" : "")}>
      <header className="card-h">
        {icon && <span className="card-ic">{icon}</span>}
        <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      </header>
      <div className="card-b">{children}</div>
    </section>
  );
}

function Kpi({ icon, label, value, sub, series, dataKey, color = ACCENT, mounted, accent }) {
  const id = "spk-" + dataKey + "-" + label.replace(/\W/g, "");
  return (
    <div className={"kpi" + (accent ? " kpi-a" : "")}>
      <div className="kpi-top">
        <span className="kpi-ic" style={{ color }}>{icon}</span>
        {series && mounted && hasVals(series, dataKey) ? (
          <div className="kpi-spark">
            <ResponsiveContainer width="100%" height={38}>
              <AreaChart data={series} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-lab">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* Horizontal ranked bars */
function RankBars({ data, color = ACCENT, labelW = 128, cap = 8, mounted }) {
  const rows = (data || []).slice(0, cap);
  if (!rows.length || !hasVals(rows)) return <Empty />;
  const h = Math.max(120, rows.length * 42 + 8);
  if (!mounted) return <Skel h={h} />;
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart layout="vertical" data={rows} margin={{ top: 2, right: 52, bottom: 2, left: 4 }} barCategoryGap="26%">
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={labelW} axisLine={false} tickLine={false}
          tick={{ fill: "#cfc9c2", fontSize: 12 }} tickFormatter={(v) => trunc(v, 18)} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip />} />
        <Bar dataKey="value" radius={[0, 7, 7, 0]} barSize={15} fill={color}>
          <LabelList dataKey="value" position="right" formatter={(v) => nf.format(v)} fill="#f4f4f5" fontSize={12} fontWeight={700} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Vertical bars (few, short labels — e.g. traffic sources) */
function ColBars({ data, color = BLUE, mounted }) {
  const rows = data || [];
  if (!rows.length || !hasVals(rows)) return <Empty />;
  if (!mounted) return <Skel h={260} />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 18, right: 8, bottom: 4, left: -12 }}>
        <defs>
          <linearGradient id="colg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT2} /><stop offset="100%" stopColor={ACCENT} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0}
          tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => trunc(v, 10)} />
        <YAxis axisLine={false} tickLine={false} width={40} tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => compact.format(v)} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip />} />
        <Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={54} fill="url(#colg)">
          <LabelList dataKey="value" position="top" formatter={(v) => nf.format(v)} fill="#cfc9c2" fontSize={11} fontWeight={700} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Donut with side legend + centre total */
function Donut({ data, centerLabel = "total", mounted }) {
  const rows = (data || []).filter((r) => Number(r.value) > 0);
  if (!rows.length) return <Empty />;
  const total = sum(rows, "value");
  return (
    <div className="donut">
      <div className="donut-c">
        {mounted ? (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                {rows.map((r, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : <Skel h={210} />}
        <div className="donut-center"><div className="dc-n">{compact.format(total)}</div><div className="dc-l">{centerLabel}</div></div>
      </div>
      <ul className="legend">
        {rows.map((r, i) => (
          <li key={i}>
            <span className="sw" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="lg-l">{r.label}</span>
            <span className="lg-v">{nf.format(r.value)}<em>{total ? Math.round((r.value / total) * 100) : 0}%</em></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Big daily area (1-2 series) */
function AreaTrend({ data, keys, id, mounted }) {
  const rows = data || [];
  if (!rows.length) return <Empty label="No daily data recorded in this range yet" />;
  if (!mounted) return <Skel h={300} />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={rows} margin={{ top: 10, right: 14, bottom: 0, left: -10 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={id + k.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={k.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={shortDate} />
        <YAxis axisLine={false} tickLine={false} width={40} tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v) => compact.format(v)} allowDecimals={false} />
        <Tooltip content={<Tip />} />
        {keys.map((k) => (
          <Area key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2.4} fill={`url(#${id + k.key})`} dot={false} activeDot={{ r: 4 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── main ───────────────────────────────────────────────────────────────── */
const RANGE_PRESETS = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "365d", label: "12M", days: 365 },
];
const isoDay = (d) => d.toISOString().slice(0, 10);
const daysAgoIso = (n) => isoDay(new Date(Date.now() - n * 86400000));
const validIso = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "");

export default function AnalyticsDashboard({ data: initialData, realtime: initialRealtime }) {
  const [mounted, setMounted] = useState(false);

  // Live dashboard state — seeded from the server render, then updated in place
  // when the user changes the date range (client fetch to /api/analytics).
  const [data, setData] = useState(initialData);
  const [realtime, setRealtime] = useState(initialRealtime);
  const [loading, setLoading] = useState(false);
  const [rangeErr, setRangeErr] = useState(null);
  const [from, setFrom] = useState(validIso(initialData.range?.startDate));
  const [to, setTo] = useState(validIso(initialData.range?.endDate));
  const [maxDate, setMaxDate] = useState("");
  const [activePreset, setActivePreset] = useState(null);

  // Seed "today"-relative fields after mount so the initial render stays
  // deterministic (server + client identical → no hydration mismatch).
  useEffect(() => {
    setMounted(true);
    const today = isoDay(new Date());
    setMaxDate(today);
    setTo((prev) => prev || today);
  }, []);

  async function applyRange(start, end, presetKey = null) {
    if (!start || !end) { setRangeErr("Pick both a start and end date."); return; }
    if (start > end) { setRangeErr("Start date is after the end date."); return; }
    setRangeErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?start=${start}&end=${end}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Could not load that range.");
      setData(j);
      setRealtime(j.realtime);
      setFrom(start);
      setTo(end);
      setActivePreset(presetKey);
    } catch (e) {
      setRangeErr(e.message || "Could not load that range.");
    } finally {
      setLoading(false);
    }
  }
  const applyPreset = (p) => applyRange(daysAgoIso(p.days), isoDay(new Date()), p.key);

  const t = data.totals;
  const daily = data.daily || [];

  // GA breakdowns → {label,value}
  const gaTop = (data.topPages || []).map((p) => ({ label: p.path, value: p.views }));
  const gaSrc = (data.sources || []).map((s) => ({ label: s.channel, value: s.sessions }));
  const gaCountry = (data.countries || []).map((c) => ({ label: c.country, value: c.users }));
  const gaCity = (data.cities || []).map((c) => ({ label: c.city, value: c.users }));
  const gaDev = (data.devices || []).map((d) => ({ label: d.device, value: d.users }));
  const gaBro = (data.browsers || []).map((b) => ({ label: b.browser, value: b.users }));

  return (
    <div className="pldash">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── header ── */}
      <header className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">Powerline · Analytics</p>
            <h1 className="title">Marketing Dashboard</h1>
            <div className="hero-meta">
              <span className="live-badge"><span className="live-dot" /> Connected to GA4</span>
              <span>Property {data.propertyId}</span>
              <span className="dot-sep">·</span>
              <span>{data.range?.startDate} → {data.range?.endDate}</span>
            </div>
          </div>
          <div className="hero-right">
            <a className="signout" href="/admin/crm">CRM →</a>
            <a className="signout" href="/api/admin/login">Sign out</a>
            <span className="hero-note">Live · refreshes on load</span>
          </div>
        </div>
      </header>

      {/* ── date-range filter ── */}
      <div className="filterbar">
        <div className="fb-inner">
          <span className="fb-label">Date range</span>
          <div className="presets">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                className={`preset ${activePreset === p.key ? "on" : ""}`}
                onClick={() => applyPreset(p)}
                disabled={loading}
              >{p.label}</button>
            ))}
          </div>
          <div className="custom">
            <input
              type="date" value={from} max={to || maxDate}
              onChange={(e) => { setFrom(e.target.value); setActivePreset(null); }}
              disabled={loading} aria-label="Start date"
            />
            <span className="arrow">→</span>
            <input
              type="date" value={to} min={from} max={maxDate}
              onChange={(e) => { setTo(e.target.value); setActivePreset(null); }}
              disabled={loading} aria-label="End date"
            />
            <button className="apply" onClick={() => applyRange(from, to)} disabled={loading}>Apply</button>
          </div>
          {loading ? <span className="fb-status">Loading…</span>
            : rangeErr ? <span className="fb-status err">{rangeErr}</span> : null}
        </div>
      </div>

      <div className="wrap">
        {/* ── realtime ── */}
        <section className="rt">
          <div className="rt-main">
            <div className="rt-eyebrow"><span className="live-dot" /> Right now · last 30 min</div>
            <div className="rt-figure">
              <span className="rt-num">{realtime ? nf.format(realtime.activeUsers) : "—"}</span>
              <span className="rt-unit">active<br />users</span>
              <div className="eq" aria-hidden="true">{Array.from({ length: 7 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</div>
            </div>
          </div>
          <div className="rt-side">
            <div className="rt-side-h">Active users by country</div>
            {realtime && realtime.byCountry?.length ? (
              <RankBars data={realtime.byCountry.map((c) => ({ label: c.country, value: c.users }))} color={GREEN} labelW={110} cap={5} mounted={mounted} />
            ) : (
              <Empty label={realtime ? "No one on the site this minute — open the site to watch this update live." : "Realtime unavailable right now."} />
            )}
          </div>
        </section>

        {/* ── Google Analytics ── */}
          <div className="panel">
            <div className="kpis">
              <Kpi icon={Ic.users} label="Total users" value={nf.format(t.totalUsers)} series={daily} dataKey="users" mounted={mounted} accent />
              <Kpi icon={Ic.active} label="Active users" value={nf.format(t.activeUsers)} series={daily} dataKey="users" color={GREEN} mounted={mounted} />
              <Kpi icon={Ic.newUser} label="New users" value={nf.format(t.newUsers)} series={daily} dataKey="users" color={BLUE} mounted={mounted} />
              <Kpi icon={Ic.session} label="Sessions" value={nf.format(t.sessions)} series={daily} dataKey="sessions" color={BLUE} mounted={mounted} />
              <Kpi icon={Ic.eye} label="Page views" value={nf.format(t.pageViews)} series={daily} dataKey="pageViews" color="#a78bfa" mounted={mounted} />
              <Kpi icon={Ic.clock} label="Avg. session" value={dur(t.avgSessionDuration)} />
              <Kpi icon={Ic.gauge} label="Engagement" value={pct(t.engagementRate)} />
              <Kpi icon={Ic.bounce} label="Bounce rate" value={pct(t.bounceRate)} />
            </div>

            <ChartCard title="Daily active users" sub="Users, sessions & page views per day" icon={Ic.active} span>
              <AreaTrend data={daily} id="ga" mounted={mounted} keys={[
                { key: "users", name: "Users", color: ACCENT },
                { key: "pageViews", name: "Page views", color: BLUE },
              ]} />
            </ChartCard>

            {data.acquisition && data.acquisition.bySource?.length ? (
              <ChartCard span title="Session acquisition sources"
                sub={`GA4 · Traffic acquisition — real sessions by source / medium · ${nf.format(data.acquisition.total)} total`}
                icon={Ic.link}>
                {data.acquisition.warning ? (
                  <div className="acq-warn">
                    <span className="acq-warn-ic">⚠</span>
                    <div>
                      <b>Internal / private-IP referral detected — {data.acquisition.warning.host}</b>
                      <p>
                        {nf.format(data.acquisition.warning.sessions)} sessions
                        ({data.acquisition.warning.pctOfReferral.toFixed(0)}% of all referral traffic,
                        {" "}{data.acquisition.warning.pctOfTotal.toFixed(0)}% of total). This is internal
                        proxy / load-balancer / monitoring / self-referral traffic — <b>not real acquisition</b>.
                        It's separated into “Internal / excluded” below so the mix isn't misleading. To correct
                        it at the source, add this host to <b>GA4 → Admin → Data Streams → Configure tag settings
                        → List unwanted referrals</b>.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="acq">
                  <div className="acq-col">
                    <div className="acq-col-h">Sessions by source</div>
                    <div className="acq-list">
                      {data.acquisition.bySource.map((s, i) => (
                        <div className={"acq-row" + (s.internal ? " acq-int" : "")} key={s.source}>
                          <span className="acq-name">{s.internal ? "⚠ " : ""}{s.source}</span>
                          <span className="acq-bar">
                            <span className="acq-fill" style={{ width: `${Math.max(1.5, s.pct)}%`, background: s.internal ? "#e0a03a" : SERIES[i % SERIES.length] }} />
                          </span>
                          <span className="acq-val">{nf.format(s.sessions)}</span>
                          <span className="acq-pct">{s.pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="acq-col">
                    <div className="acq-col-h">Source / medium drill-down</div>
                    <div className="acq-tbl-wrap">
                      <table className="acq-tbl">
                        <thead><tr><th>Source</th><th>Medium</th><th className="ra">Sessions</th><th className="ra">%</th></tr></thead>
                        <tbody>
                          {data.acquisition.drill.map((d, i) => (
                            <tr key={i} className={d.internal ? "acq-int" : ""}>
                              <td className="acq-s">{d.internal ? "⚠ " : ""}{d.source}</td>
                              <td><span className={"acq-med" + (d.internal ? " acq-med-int" : "")}>{d.internal ? "internal" : d.medium}</span></td>
                              <td className="ra">{nf.format(d.sessions)}</td>
                              <td className="ra acq-dim">{d.pct.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ChartCard>
            ) : null}

            <div className="grid">
              <ChartCard title="Top pages" sub="By page views" icon={Ic.page}><RankBars data={gaTop} color={ACCENT} labelW={132} mounted={mounted} /></ChartCard>
              <ChartCard title="Traffic sources" sub="Sessions by channel" icon={Ic.link}><ColBars data={gaSrc} mounted={mounted} /></ChartCard>
              <ChartCard title="Devices" sub="Users by device category" icon={Ic.device}><Donut data={gaDev} centerLabel="users" mounted={mounted} /></ChartCard>
              <ChartCard title="Browsers" sub="Users by browser" icon={Ic.browser}><RankBars data={gaBro} color={BLUE} labelW={118} mounted={mounted} /></ChartCard>
              <ChartCard title="Top countries" sub="Users by country" icon={Ic.globe}><RankBars data={gaCountry} color={GREEN} labelW={124} mounted={mounted} /></ChartCard>
              <ChartCard title="Top cities" sub="Users by city" icon={Ic.building}><RankBars data={gaCity} color="#a78bfa" labelW={124} mounted={mounted} /></ChartCard>
            </div>

            <p className="foot">Live figures from the Google Analytics 4 Data API — fetched server-side, credentials never reach the browser. Data collection began 06–07 Jul 2026. This page is <b>noindex</b>.</p>
          </div>
      </div>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────── */
const CSS = `
.pldash{--bg:#060507;--card-bg:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
  --line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.16);--text:#f4f4f5;--dim:#a1a1aa;--faint:#6b6b72;
  --accent:#e8722a;--accent2:#ff8a4c;--green:#35c46a;
  min-height:100vh;color:var(--text);font-family:var(--font-poppins),system-ui,sans-serif;line-height:1.5;
  padding-bottom:5rem;font-variant-numeric:tabular-nums;
  background:radial-gradient(1200px 620px at 82% -12%,rgba(232,114,42,.12),transparent 60%),
    radial-gradient(1000px 560px at -12% 8%,rgba(76,158,240,.07),transparent 55%),#060507}
.pldash *{box-sizing:border-box;margin:0}
.pldash .wrap{max-width:120rem;margin-inline:auto;padding-inline:clamp(1rem,3vw,2.5rem)}
.pldash .mono{font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,monospace}
.pldash h1,.pldash h2,.pldash h3{font-family:var(--font-head,var(--font-montserrat));line-height:1.1}

/* header */
.pldash .hero{position:relative;overflow:hidden;border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 90%)}
.pldash .hero::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--accent) 18%,var(--accent2) 50%,var(--accent) 82%,transparent)}
.pldash .hero .wrap{padding-block:clamp(1.6rem,4vw,2.7rem);display:flex;justify-content:space-between;align-items:flex-end;gap:1.5rem;flex-wrap:wrap}
.pldash .eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:.7rem}
.pldash .eyebrow::before{content:"";width:1.7rem;height:2px;background:var(--accent)}
.pldash h1.title{font-weight:800;font-size:clamp(2rem,5vw,3.3rem);letter-spacing:-.02em;text-transform:uppercase;margin:.6rem 0 .7rem}
.pldash .hero-meta{display:flex;gap:.85rem;align-items:center;flex-wrap:wrap;color:var(--dim);font-size:.83rem}
.pldash .dot-sep{color:var(--faint)}
.pldash .live-badge{display:inline-flex;align-items:center;gap:.5rem;padding:.4rem .8rem;border-radius:999px;background:rgba(53,196,106,.12);border:1px solid rgba(53,196,106,.34);color:#7ee2a0;font-weight:600;font-size:.78rem}
.pldash .live-dot{width:.5rem;height:.5rem;border-radius:50%;background:#3fd07a;box-shadow:0 0 0 0 rgba(63,208,122,.6);animation:plpulse 1.8s infinite}
@keyframes plpulse{0%{box-shadow:0 0 0 0 rgba(63,208,122,.5)}70%{box-shadow:0 0 0 10px rgba(63,208,122,0)}100%{box-shadow:0 0 0 0 rgba(63,208,122,0)}}
.pldash .hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:.6rem}
.pldash .signout{font-size:.78rem;color:var(--dim);text-decoration:none;border:1px solid var(--line);padding:.45rem .9rem;border-radius:9px}
.pldash .signout:hover{color:#fff;border-color:var(--line2);background:rgba(255,255,255,.04)}
.pldash .hero-note{font-size:.72rem;color:var(--faint)}
.pldash .filterbar{border-bottom:1px solid var(--line);background:rgba(255,255,255,.015)}
.pldash .fb-inner{max-width:1240px;margin-inline:auto;padding:.8rem clamp(1rem,4vw,2.4rem);display:flex;align-items:center;gap:.9rem;flex-wrap:wrap}
.pldash .fb-label{font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.pldash .presets{display:inline-flex;gap:.25rem;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:10px;padding:.25rem}
.pldash .preset{border:none;background:transparent;color:var(--dim);font-size:.8rem;font-weight:700;padding:.35rem .75rem;border-radius:7px;cursor:pointer}
.pldash .preset:hover:not(:disabled){color:#fff}
.pldash .preset.on{background:linear-gradient(180deg,var(--accent2),var(--accent));color:#160c04}
.pldash .preset:disabled{opacity:.55;cursor:not-allowed}
.pldash .custom{display:inline-flex;align-items:center;gap:.5rem}
.pldash .custom input[type=date]{background:rgba(0,0,0,.3);border:1px solid var(--line);color:var(--text);border-radius:8px;padding:.4rem .55rem;font-size:.82rem;font-family:inherit;color-scheme:dark}
.pldash .custom input[type=date]:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.pldash .custom .arrow{color:var(--faint)}
.pldash .apply{border:1px solid var(--line2);background:rgba(255,255,255,.04);color:#e7e2dc;font-weight:700;font-size:.8rem;padding:.44rem .95rem;border-radius:8px;cursor:pointer}
.pldash .apply:hover:not(:disabled){border-color:var(--accent);color:#fff}
.pldash .apply:disabled{opacity:.55;cursor:not-allowed}
.pldash .fb-status{font-size:.78rem;color:var(--dim)}
.pldash .fb-status.err{color:#f0a89f}

/* realtime */
.pldash .rt{margin-top:clamp(1.4rem,3vw,2rem);display:grid;grid-template-columns:minmax(300px,.9fr) 1.1fr;gap:1.2rem}
.pldash .rt-main{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:20px;padding:1.5rem 1.7rem;
  background:linear-gradient(135deg,rgba(232,114,42,.16),rgba(232,114,42,.03) 55%),#0c0b0e}
.pldash .rt-main::after{content:"";position:absolute;inset:0;background:radial-gradient(360px 200px at 90% 120%,rgba(232,114,42,.22),transparent 70%);pointer-events:none}
.pldash .rt-eyebrow{display:inline-flex;align-items:center;gap:.55rem;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#f0b088}
.pldash .rt-figure{display:flex;align-items:center;gap:1rem;margin-top:1rem;position:relative}
.pldash .rt-num{font-family:var(--font-head,var(--font-montserrat));font-size:clamp(3.4rem,9vw,5rem);font-weight:800;line-height:.85;letter-spacing:-.03em}
.pldash .rt-unit{font-size:.82rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);font-weight:600;line-height:1.15}
.pldash .eq{display:flex;align-items:flex-end;gap:3px;height:2.6rem;margin-left:auto}
.pldash .eq span{width:5px;background:linear-gradient(180deg,var(--accent2),var(--accent));border-radius:3px;height:30%;animation:eq 1.1s ease-in-out infinite}
@keyframes eq{0%,100%{height:24%}50%{height:100%}}
@media (prefers-reduced-motion:reduce){.pldash .eq span{animation:none;height:55%}.pldash .live-dot{animation:none}}
.pldash .rt-side{border:1px solid var(--line);border-radius:20px;padding:1.3rem 1.5rem;background:var(--card-bg)}
.pldash .rt-side-h{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:.5rem}

/* panels + cards */
.pldash .panel{margin-top:1.4rem;animation:fade .35s var(--ease,ease)}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.pldash .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.pldash .kpi{position:relative;border:1px solid var(--line);border-radius:16px;padding:1.1rem 1.2rem;background:var(--card-bg);overflow:hidden}
.pldash .kpi-a{border-color:rgba(232,114,42,.35);background:linear-gradient(180deg,rgba(232,114,42,.09),rgba(255,255,255,.012))}
.pldash .kpi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;height:2.4rem}
.pldash .kpi-ic{display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid var(--line)}
.pldash .kpi-spark{width:56%;max-width:120px;height:38px;opacity:.9}
.pldash .kpi-val{font-family:var(--font-head,var(--font-montserrat));font-size:1.95rem;font-weight:800;line-height:1;margin-top:.7rem;letter-spacing:-.01em}
.pldash .kpi-lab{font-size:.78rem;color:var(--dim);margin-top:.4rem;font-weight:500}
.pldash .kpi-sub{font-size:.72rem;color:var(--faint);margin-top:.15rem}

.pldash .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.2rem;margin-top:1.2rem}
.pldash .card{border:1px solid var(--line);border-radius:18px;background:var(--card-bg);padding:1.25rem 1.35rem;overflow:hidden}
.pldash .card.span{grid-column:1/-1;margin-top:1.2rem}
.pldash .card-h{display:flex;align-items:center;gap:.7rem;margin-bottom:1.1rem}
.pldash .card-ic{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--accent)}
.pldash .card-h h3{font-size:1.02rem;font-weight:700;letter-spacing:-.01em}
.pldash .card-h p{font-size:.76rem;color:var(--faint);margin-top:.1rem}
.pldash .acq{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem}
@media(max-width:820px){.pldash .acq{grid-template-columns:1fr;gap:1.3rem}}
.pldash .acq-col-h{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:.85rem}
.pldash .acq-list{display:flex;flex-direction:column;gap:.55rem}
.pldash .acq-row{display:grid;grid-template-columns:6.5rem 1fr 3.4rem 3rem;align-items:center;gap:.6rem}
.pldash .acq-name{font-size:.85rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pldash .acq-bar{height:9px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}
.pldash .acq-fill{display:block;height:100%;border-radius:6px;min-width:3px}
.pldash .acq-val{font-size:.85rem;font-weight:700;color:#f4f4f5;text-align:right;font-variant-numeric:tabular-nums}
.pldash .acq-pct{font-size:.78rem;color:var(--dim);text-align:right;font-variant-numeric:tabular-nums}
.pldash .acq-tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:11px}
.pldash .acq-tbl{width:100%;border-collapse:collapse;min-width:340px}
.pldash .acq-tbl th{text-align:left;font-size:.66rem;text-transform:uppercase;letter-spacing:.09em;color:var(--faint);font-weight:700;padding:.55rem .8rem;border-bottom:1px solid var(--line)}
.pldash .acq-tbl td{padding:.5rem .8rem;border-bottom:1px solid rgba(255,255,255,.05);font-size:.84rem}
.pldash .acq-tbl tbody tr:last-child td{border-bottom:none}
.pldash .acq-tbl .ra{text-align:right;font-variant-numeric:tabular-nums}
.pldash .acq-s{font-weight:600;color:var(--text)}
.pldash .acq-dim{color:var(--dim)}
.pldash .acq-med{font-size:.72rem;color:#cbd5e1;background:rgba(91,157,255,.12);border:1px solid rgba(91,157,255,.28);padding:.1rem .5rem;border-radius:20px;white-space:nowrap}
.pldash .acq-med-int{color:#e6c778;background:rgba(224,160,58,.14);border-color:rgba(224,160,58,.4)}
.pldash .acq-int .acq-name,.pldash .acq-int .acq-s{color:#e6c778}
.pldash .acq-warn{display:flex;gap:.8rem;align-items:flex-start;margin-bottom:1.3rem;padding:.9rem 1.05rem;border:1px solid rgba(224,160,58,.4);border-radius:12px;background:rgba(224,160,58,.09)}
.pldash .acq-warn-ic{font-size:1.05rem;line-height:1.3;flex:none}
.pldash .acq-warn b{color:#f0d795}
.pldash .acq-warn p{font-size:.8rem;color:#c9c2b4;line-height:1.65;margin-top:.3rem}
.pldash .card-b{min-height:40px}
.pldash .skel{width:100%;border-radius:12px;background:linear-gradient(100deg,rgba(255,255,255,.04),rgba(255,255,255,.08),rgba(255,255,255,.04));background-size:200% 100%;animation:sh 1.3s infinite}
@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.pldash .empty{color:var(--faint);font-size:.88rem;padding:1.4rem .2rem;text-align:center}

/* donut */
.pldash .donut{display:grid;grid-template-columns:210px 1fr;gap:1.2rem;align-items:center}
.pldash .donut-c{position:relative;width:210px;height:210px}
.pldash .donut-center{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}
.pldash .dc-n{font-family:var(--font-head,var(--font-montserrat));font-size:1.7rem;font-weight:800;line-height:1}
.pldash .dc-l{font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);margin-top:.15rem}
.pldash .legend{list-style:none;display:flex;flex-direction:column;gap:.55rem;padding:0}
.pldash .legend li{display:flex;align-items:center;gap:.6rem;font-size:.85rem}
.pldash .legend .sw{width:.7rem;height:.7rem;border-radius:3px;flex:0 0 auto}
.pldash .legend .lg-l{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-transform:capitalize}
.pldash .legend .lg-v{font-weight:700;display:flex;gap:.45rem;align-items:baseline}
.pldash .legend .lg-v em{font-style:normal;font-size:.72rem;color:var(--faint);font-weight:600}

/* tooltip */
.pldash .tip{background:#131217;border:1px solid var(--line2);border-radius:11px;padding:.6rem .75rem;box-shadow:0 18px 44px -14px rgba(0,0,0,.7)}
.pldash .tip-h{font-size:.74rem;color:var(--dim);margin-bottom:.4rem;font-weight:600}
.pldash .tip-r{display:flex;align-items:center;gap:.5rem;font-size:.82rem}
.pldash .tip-r+.tip-r{margin-top:.2rem}
.pldash .tip-dot{width:.6rem;height:.6rem;border-radius:50%}
.pldash .tip-n{color:var(--dim)}
.pldash .tip-r b{margin-left:auto;font-weight:700}

.pldash .foot{margin-top:1.6rem;color:var(--faint);font-size:.8rem;line-height:1.6}

/* responsive */
@media (max-width:1080px){.pldash .kpis{grid-template-columns:repeat(2,1fr)}.pldash .rt{grid-template-columns:1fr}}
@media (max-width:820px){.pldash .grid{grid-template-columns:1fr}.pldash .donut{grid-template-columns:1fr;justify-items:center}.pldash .legend{width:100%;max-width:340px}}
@media (max-width:560px){.pldash .kpis{grid-template-columns:1fr 1fr}}
`;
