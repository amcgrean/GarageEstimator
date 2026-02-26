'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── LOGOUT ────────────────────────────────────────────────────────────────────

function useLogout() {
  return async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  };
}

// ── SVG LINE CHART (quotes per day) ──────────────────────────────────────────

function LineChart({ data }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--gray-5)', fontSize: 13 }}>No data yet.</p>;

  const W = 440, H = 140, padL = 32, padB = 28, padT = 10, padR = 10;
  const counts = data.map(d => Number(d.count));
  const maxC = Math.max(...counts, 1);
  const xScale = (i) => padL + (i / (data.length - 1 || 1)) * (W - padL - padR);
  const yScale = (v) => padT + (1 - v / maxC) * (H - padT - padB);

  const points = data.map((d, i) => `${xScale(i)},${yScale(Number(d.count))}`).join(' ');
  const area = `${padL},${H - padB} ` + data.map((d, i) => `${xScale(i)},${yScale(Number(d.count))}`).join(' ') + ` ${xScale(data.length - 1)},${H - padB}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-area">
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8181E" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#C8181E" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={padL} y1={padT + (1-f)*(H-padT-padB)} x2={W-padR} y2={padT + (1-f)*(H-padT-padB)}
            stroke="#ebebeb" strokeWidth="1" />
          <text x={padL-4} y={padT + (1-f)*(H-padT-padB) + 4} fontSize="9" fill="#888" textAnchor="end">
            {Math.round(maxC * f)}
          </text>
        </g>
      ))}
      {/* Area fill */}
      <polygon points={area} fill="url(#chart-grad)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#C8181E" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(Number(d.count))} r="3" fill="#C8181E" />
      ))}
      {/* X axis labels — show every ~5 days */}
      {data.filter((_, i) => i % 5 === 0).map((d, _, arr) => {
        const origIdx = data.indexOf(d);
        const label = new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <text key={d.day} x={xScale(origIdx)} y={H - padB + 14} fontSize="9" fill="#888" textAnchor="middle">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── SVG BAR CHART (top sizes) ─────────────────────────────────────────────────

function BarChart({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--gray-5)', fontSize: 13 }}>No data yet.</p>;

  const W = 440, H = 160, padL = 40, padB = 36, padT = 10, padR = 10;
  const vals = data.map(d => Number(d[valueKey]));
  const maxV = Math.max(...vals, 1);
  const barW = (W - padL - padR) / data.length - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-area">
      {/* Grid */}
      {[0, 0.5, 1].map((f, i) => (
        <g key={i}>
          <line x1={padL} y1={padT + (1-f)*(H-padT-padB)} x2={W-padR} y2={padT + (1-f)*(H-padT-padB)}
            stroke="#ebebeb" strokeWidth="1" />
          <text x={padL-4} y={padT + (1-f)*(H-padT-padB) + 4} fontSize="9" fill="#888" textAnchor="end">
            {Math.round(maxV * f)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * ((W - padL - padR) / data.length) + 2;
        const barH = (Number(d[valueKey]) / maxV) * (H - padT - padB);
        const y = padT + (H - padT - padB) - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#C8181E" rx="2" opacity="0.85" />
            <text x={x + barW/2} y={H - padB + 14} fontSize="8" fill="#555" textAnchor="middle"
              transform={`rotate(-40, ${x + barW/2}, ${H - padB + 14})`}>
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── TAB 1: METRICS ────────────────────────────────────────────────────────────

function MetricsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [initMsg, setInitMsg] = useState('');

  const loadMetrics = () => {
    setLoading(true);
    fetch('/api/admin/metrics', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  };

  useEffect(() => { loadMetrics(); }, []);

  const initDb = async () => {
    setInitializing(true);
    setInitMsg('');
    try {
      const res = await fetch('/api/admin/init-db', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setInitMsg('Database initialized successfully. Reloading…');
        setTimeout(() => loadMetrics(), 1000);
      } else {
        setInitMsg(`Error: ${json.error}`);
      }
    } catch {
      setInitMsg('Network error — please try again.');
    }
    setInitializing(false);
  };

  if (loading) return <p style={{color:'var(--gray-5)'}}>Loading metrics…</p>;
  if (!data)   return <p style={{color:'var(--gray-5)'}}>Failed to load metrics.</p>;

  if (data.tablesReady === false) {
    return (
      <div style={{padding:'32px 0',maxWidth:520}}>
        <div style={{background:'#fff8e1',border:'1px solid #ffe082',borderRadius:6,padding:'20px 24px',marginBottom:16}}>
          <strong style={{display:'block',marginBottom:8}}>Database tables not yet created</strong>
          <p style={{fontSize:13,color:'var(--gray-7)',margin:'0 0 16px'}}>
            The <code>quotes</code> and <code>truss_prices</code> tables are missing from the database.
            Click the button below to create them now.
          </p>
          <button
            className="btn btn-primary"
            style={{width:'auto',height:36,fontSize:13}}
            onClick={initDb}
            disabled={initializing}
          >
            {initializing ? 'Initializing…' : 'Initialize Database Tables'}
          </button>
          {initMsg && <p style={{fontSize:13,marginTop:10,color:'var(--gray-7)'}}>{initMsg}</p>}
        </div>
      </div>
    );
  }

  const sizeLabels = data.topSizes.map(s => `${s.width}×${s.length}`);
  const sizeData   = data.topSizes.map(s => ({ label: `${s.width}×${s.length}`, count: s.count }));

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card" style={{gridColumn:'1/-1'}}>
          <h3>Quotes per Day — Last 30 Days</h3>
          <LineChart data={data.dailyVolume} />
        </div>

        <div className="metric-card">
          <h3>Top 10 Garage Sizes (W × L)</h3>
          <BarChart data={sizeData} labelKey="label" valueKey="count" />
        </div>

        <div className="metric-card">
          <h3>Popular Configurations</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Pitch</th><th>Siding</th><th className="right">Count</th><th className="right">%</th></tr></thead>
              <tbody>
                {data.pitchSiding.map((r,i) => (
                  <tr key={i}>
                    <td>{r.roof_pitch}</td>
                    <td>{r.siding_type}</td>
                    <td className="qty">{r.count}</td>
                    <td className="qty">{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="metric-card">
          <h3>Quotes by Branch</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Branch</th><th className="right">Count</th></tr></thead>
              <tbody>
                {data.byBranch.map((r,i) => (
                  <tr key={i}>
                    <td>{r.branch?.replace('_',' ')}</td>
                    <td className="qty">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="metric-card" style={{gridColumn:'1/-1'}}>
          <h3>Quotes by Agent</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Branch</th><th className="right">Quotes</th><th>Last Active</th></tr>
              </thead>
              <tbody>
                {data.byAgent.map((r,i) => (
                  <tr key={i}>
                    <td className="description">{r.name}</td>
                    <td>{r.branch?.replace('_',' ')}</td>
                    <td className="qty">{r.count}</td>
                    <td style={{fontSize:12,color:'var(--gray-5)'}}>
                      {r.last_active ? new Date(r.last_active).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB 2: QUOTE LOG ──────────────────────────────────────────────────────────

function QuoteRow({ q, expanded, setExpanded }) {
  const isOpen = expanded === q.id;
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : q.id)}>
        <td style={{ fontSize: 12 }}>{new Date(q.created_at).toLocaleDateString()}</td>
        <td className="description">{q.job_name}</td>
        <td>{q.agent_name}</td>
        <td>{q.branch?.replace('_', ' ')}</td>
        <td>{q.width}&apos;×{q.length}&apos;</td>
        <td>{q.roof_pitch}</td>
        <td>{q.siding_type}</td>
        <td className="qty">{q.overhead_doors}</td>
        <td className="qty">{q.windows}</td>
        <td style={{ textAlign: 'center', color: 'var(--gray-5)', fontSize: 12 }}>
          {isOpen ? '▲' : '▼'}
        </td>
      </tr>
      {isOpen && (
        <tr className="expand-row">
          <td colSpan={10}>
            <div className="expand-content">
              <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--gray-5)' }}>
                <strong>Perimeter:</strong> {q.perimeter_lf} LF &nbsp;
                <strong>Roof SF:</strong> {q.roof_sf} &nbsp;
                <strong>Wall SF:</strong> {q.wall_sf}
              </div>
              {q.takeoff_rows && q.takeoff_rows.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Group</th><th>Description</th><th>UOM</th><th>Item Code</th><th className="right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.takeoff_rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.group}</td>
                          <td className="description">{r.description}</td>
                          <td className="uom">{r.uom}</td>
                          <td className="code">{r.itemCode}</td>
                          <td className="qty">{r.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function QuoteLogTab() {
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({ branch: '', agentId: '' });
  const [agents, setAgents] = useState([]);
  const limit = 25;

  useEffect(() => {
    fetch('/api/admin/agents')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAgents(d); })
      .catch(() => {});
  }, []);

  const loadQuotes = useCallback(async (p, f) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit });
    if (f.branch) params.set('branch', f.branch);
    if (f.agentId) params.set('agentId', f.agentId);
    try {
      const res = await fetch(`/api/admin/quotes?${params}`);
      const data = await res.json();
      setQuotes(data.quotes ?? []);
      setTotal(data.total ?? 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadQuotes(page, filters); }, [page]);

  const applyFilters = () => { setPage(1); loadQuotes(1, filters); };
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="search-bar">
        <div className="field">
          <label>Branch</label>
          <select value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}>
            <option value="">All Branches</option>
            <option value="Grimes">Grimes</option>
            <option value="Coralville">Coralville</option>
            <option value="Fort_Dodge">Fort Dodge</option>
          </select>
        </div>
        <div className="field">
          <label>Agent</label>
          <select value={filters.agentId} onChange={e => setFilters(f => ({ ...f, agentId: e.target.value }))}>
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" style={{ height: 34, marginTop: 16 }} onClick={applyFilters}>
          Apply Filter
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--gray-5)' }}>Loading quotes…</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Job Name</th><th>Agent</th><th>Branch</th>
                  <th>Size</th><th>Pitch</th><th>Siding</th>
                  <th className="right">OD</th><th className="right">Win</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <QuoteRow key={q.id} q={q} expanded={expanded} setExpanded={setExpanded} />
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--gray-5)', padding: 32 }}>
                      No quotes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span className="pg-info">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB 3: TRUSS PRICING ──────────────────────────────────────────────────────

const BRANCHES = ['Grimes', 'Coralville', 'Fort_Dodge'];
const PITCHES  = ['4/12', '6/12', '8/12'];
const WIDTHS   = [28, 34];

function TrussPricingTab() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/truss-prices')
      .then(r => r.json())
      .then(rows => {
        const tbl = {};
        for (const r of rows) {
          if (!tbl[r.branch]) tbl[r.branch] = {};
          if (!tbl[r.branch][r.pitch]) tbl[r.branch][r.pitch] = {};
          tbl[r.branch][r.pitch][r.snapped_width] =
            r.price_per_sf !== null ? String(r.price_per_sf) : '';
        }
        setPrices(tbl);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getVal = (branch, pitch, width) =>
    prices?.[branch]?.[pitch]?.[width] ?? '';

  const setVal = (branch, pitch, width, val) => {
    setPrices(prev => ({
      ...prev,
      [branch]: {
        ...(prev[branch] ?? {}),
        [pitch]: {
          ...(prev[branch]?.[pitch] ?? {}),
          [width]: val,
        },
      },
    }));
  };

  // When Grimes changes, auto-fill Fort_Dodge = Grimes × 1.15 if not manually set
  const handleGrimesChange = (pitch, width, val) => {
    setVal('Grimes', pitch, width, val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const fdVal = (num * 1.15).toFixed(4);
      setVal('Fort_Dodge', pitch, width, fdVal);
      // Coralville = Grimes
      setVal('Coralville', pitch, width, val);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const updates = [];
    for (const branch of BRANCHES) {
      for (const pitch of PITCHES) {
        for (const width of WIDTHS) {
          updates.push({ branch, pitch, snappedWidth: width, pricePersf: getVal(branch, pitch, width) });
        }
      }
    }
    try {
      const res = await fetch('/api/admin/truss-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) setMsg('Prices saved successfully.');
      else setMsg('Save failed. Please try again.');
    } catch {
      setMsg('Network error.');
    }
    setSaving(false);
  };

  if (loading) return <p style={{color:'var(--gray-5)'}}>Loading truss prices…</p>;

  const colCount = 1 + BRANCHES.length * WIDTHS.length;

  return (
    <div>
      <p style={{fontSize:13,color:'var(--gray-5)',marginBottom:16}}>
        Truss prices are per SF of floor area. Fort Dodge defaults to Grimes × 1.15; Coralville = Grimes.
        Cells highlighted in red have never been set — enter prices before agents use those configurations.
      </p>

      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse',minWidth:580}}>
          <thead>
            <tr>
              <th style={{background:'var(--gray-9)',color:'#fff',padding:'8px 14px',textAlign:'left',fontSize:11}}>
                Pitch
              </th>
              {BRANCHES.map(b => WIDTHS.map(w => (
                <th key={`${b}-${w}`} style={{background:'var(--gray-9)',color:'#fff',padding:'8px 10px',textAlign:'center',fontSize:11,minWidth:90}}>
                  {b.replace('_',' ')} {w}&apos;
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {PITCHES.map(pitch => (
              <tr key={pitch} style={{borderBottom:'1px solid var(--gray-2)'}}>
                <td style={{padding:'8px 14px',fontWeight:600,background:'var(--gray-1)',fontSize:13}}>
                  {pitch}
                </td>
                {BRANCHES.map(branch => WIDTHS.map(width => {
                  const val = getVal(branch, pitch, width);
                  const unset = val === '' || val === null;
                  const isGrimes = branch === 'Grimes';
                  return (
                    <td key={`${branch}-${width}`} style={{padding:'6px 8px',borderLeft:'1px solid var(--gray-2)'}}>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        style={{
                          width:'100%',height:32,padding:'0 6px',textAlign:'right',
                          border:`1px solid ${unset?'#f5b8b8':'var(--gray-3)'}`,
                          background: unset ? '#fff8f8' : '#fff',
                          borderRadius:3,fontSize:13,
                          fontVariantNumeric:'tabular-nums',
                        }}
                        value={val}
                        onChange={e => isGrimes
                          ? handleGrimesChange(pitch, width, e.target.value)
                          : setVal(branch, pitch, width, e.target.value)
                        }
                        placeholder="—"
                      />
                      {!isGrimes && (
                        <div style={{fontSize:10,color:'var(--gray-5)',textAlign:'center',marginTop:2}}>
                          {branch === 'Coralville' ? 'same as Grimes' : 'Grimes × 1.15'}
                        </div>
                      )}
                    </td>
                  );
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:16}}>
        <button className="btn btn-primary" style={{width:'auto',height:36,fontSize:13}}
          onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Prices'}
        </button>
        {msg && <span style={{fontSize:13,color:'var(--gray-7)'}}>{msg}</span>}
      </div>
    </div>
  );
}

// ── TAB 4: SALES AGENTS ───────────────────────────────────────────────────────

const BLANK_AGENT = { name: '', username: '', branch: 'Grimes', pin: '0000', active: true };

function AgentsTab() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newAgent, setNewAgent] = useState(BLANK_AGENT);
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (Array.isArray(data)) setAgents(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (a) => {
    setEditId(a.id);
    setEditData({ name: a.name, username: a.username, branch: a.branch, pin: '', active: a.active });
  };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/admin/agents/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) { setEditId(null); load(); setMsg('Agent updated.'); }
      else { const d = await res.json(); setMsg(d.error || 'Update failed.'); }
    } catch { setMsg('Network error.'); }
  };

  const toggleActive = async (agent) => {
    try {
      await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agent, active: !agent.active, pin: '' }),
      });
      load();
    } catch {}
  };

  const addAgent = async () => {
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      if (res.ok) {
        setNewAgent(BLANK_AGENT);
        setShowAdd(false);
        load();
        setMsg('Agent added.');
      } else {
        const d = await res.json();
        setMsg(d.error || 'Add failed.');
      }
    } catch { setMsg('Network error.'); }
  };

  if (loading) return <p style={{color:'var(--gray-5)'}}>Loading agents…</p>;

  return (
    <div>
      {msg && <div className="success-box" style={{marginBottom:12}}>{msg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button className="btn btn-primary" style={{width:'auto',height:36,fontSize:13}}
          onClick={() => setShowAdd(s => !s)}>
          {showAdd ? 'Cancel' : '+ Add Agent'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{marginBottom:16,padding:0}}>
          <div className="card-head"><h2>New Agent</h2></div>
          <div className="card-body">
            <div className="field-row">
              <div className="field">
                <label>Name</label>
                <input type="text" value={newAgent.name}
                  onChange={e => setNewAgent(a => ({...a, name: e.target.value}))} />
              </div>
              <div className="field">
                <label>Username</label>
                <input type="text" value={newAgent.username}
                  onChange={e => setNewAgent(a => ({...a, username: e.target.value}))} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Branch</label>
                <select value={newAgent.branch} onChange={e => setNewAgent(a => ({...a, branch: e.target.value}))}>
                  <option value="Grimes">Grimes</option>
                  <option value="Coralville">Coralville</option>
                  <option value="Fort_Dodge">Fort Dodge</option>
                </select>
              </div>
              <div className="field">
                <label>Initial PIN</label>
                <input type="text" maxLength={4} value={newAgent.pin}
                  className="pin-input"
                  onChange={e => setNewAgent(a => ({...a, pin: e.target.value.replace(/\D/g,'').slice(0,4)}))} />
              </div>
            </div>
            <button className="btn btn-primary" style={{width:'auto',height:36,fontSize:13}}
              onClick={addAgent}>
              Save New Agent
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Username</th><th>Branch</th>
              <th style={{textAlign:'center'}}>Active</th><th style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              editId === a.id ? (
                <tr key={a.id} style={{background:'#fef6f6'}}>
                  <td>
                    <input type="text" value={editData.name}
                      onChange={e => setEditData(d => ({...d, name: e.target.value}))}
                      style={{height:30,padding:'0 6px',fontSize:13,border:'1px solid var(--gray-3)',borderRadius:3,width:'100%'}} />
                  </td>
                  <td>
                    <input type="text" value={editData.username}
                      onChange={e => setEditData(d => ({...d, username: e.target.value}))}
                      style={{height:30,padding:'0 6px',fontSize:13,border:'1px solid var(--gray-3)',borderRadius:3,width:'100%'}} />
                  </td>
                  <td>
                    <select value={editData.branch}
                      onChange={e => setEditData(d => ({...d, branch: e.target.value}))}
                      style={{height:30,fontSize:13,border:'1px solid var(--gray-3)',borderRadius:3,width:'100%'}}>
                      <option value="Grimes">Grimes</option>
                      <option value="Coralville">Coralville</option>
                      <option value="Fort_Dodge">Fort Dodge</option>
                    </select>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <input type="text" maxLength={4} placeholder="new PIN"
                      value={editData.pin}
                      onChange={e => setEditData(d => ({...d, pin: e.target.value.replace(/\D/g,'').slice(0,4)}))}
                      style={{height:30,width:80,padding:'0 6px',textAlign:'center',fontSize:13,border:'1px solid var(--gray-3)',borderRadius:3,letterSpacing:'.2em'}} />
                  </td>
                  <td style={{textAlign:'right',whiteSpace:'nowrap'}}>
                    <button className="btn btn-primary" style={{width:'auto',height:28,fontSize:12,padding:'0 10px'}} onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" style={{height:28,fontSize:12,padding:'0 10px',marginLeft:6}} onClick={cancelEdit}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td className="description">{a.name}</td>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray-5)'}}>{a.username}</td>
                  <td>{a.branch?.replace('_',' ')}</td>
                  <td style={{textAlign:'center'}}>
                    <button
                      className={`toggle ${a.active ? 'on' : ''}`}
                      onClick={() => toggleActive(a)}
                      title={a.active ? 'Deactivate' : 'Activate'}
                    />
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn btn-secondary" style={{height:28,fontSize:12,padding:'0 10px'}}
                      onClick={() => startEdit(a)}>Edit</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD PAGE ──────────────────────────────────────────────────────

const TABS = [
  { id: 'metrics',  label: 'Metrics Dashboard' },
  { id: 'quotes',   label: 'Quote Log' },
  { id: 'truss',    label: 'Truss Pricing' },
  { id: 'agents',   label: 'Sales Agents' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('metrics');
  const logout = useLogout();

  return (
    <>
      <header className="site-header">
        <a href="/" className="logo" aria-label="Beisser Lumber Garage Estimator">
          <img src="/beisser-logo.svg" alt="Beisser Lumber Company" className="header-logo-image" />
          <span className="logo-subtitle">Garage Estimator</span>
        </a>
        <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{color:'rgba(255,255,255,.85)',fontSize:13,textDecoration:'none'}}>← Calculator</Link>
          <button
            onClick={logout}
            style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',
                    padding:'4px 12px',borderRadius:4,fontSize:12,cursor:'pointer',fontWeight:600}}>
            Log Out
          </button>
        </nav>
      </header>

      <div className="admin-page">
        <h1>Admin Panel</h1>
        <p className="sub">Internal tools for branch managers — Beisser Lumber</p>

        <div className="tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'metrics' && <MetricsTab />}
        {tab === 'quotes'  && <QuoteLogTab />}
        {tab === 'truss'   && <TrussPricingTab />}
        {tab === 'agents'  && <AgentsTab />}
      </div>
    </>
  );
}
