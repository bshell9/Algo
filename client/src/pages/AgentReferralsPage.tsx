import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS = ['new', 'contacted', 'scheduled', 'completed', 'declined'] as const;
type Status = typeof STATUS_OPTIONS[number];

interface Referral {
  id: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  agencyName: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerCity: string | null;
  customerZip: string | null;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  damage: string | null;
  carrier: string | null;
  claimNumber: string | null;
  notes: string | null;
  status: Status;
  receivedAt: string;
  firstContactAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
}

interface Stats {
  total: number;
  last30: number;
  byStatus: { status: string; count: number }[];
  topAgents: { agentName: string; agentEmail: string; count: number }[];
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(dt: string) {
  const ms = Date.now() - new Date(dt).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function AgentReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Referral | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        api.get('/referrals', { params: { page: pagination.page, status: statusFilter || undefined, search: search || undefined } }),
        api.get('/referrals/stats'),
      ]);
      setReferrals(list.data.data);
      setPagination(list.data.pagination);
      setStats(s.data.data);
    } catch (err) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pagination.page, statusFilter]);

  const updateStatus = async (id: string, status: Status) => {
    try {
      await api.patch(`/referrals/${id}`, { status });
      toast.success(`Marked as ${status}`);
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Referrals</h1>
          <p className="text-xs text-gray-500">Inbound from MA insurance agent portal — share <span className="font-mono text-emerald-700">/refer</span></p>
        </div>
        <a href="/refer" target="_blank" rel="noreferrer" className="btn-ga-outline">Open agent portal ↗</a>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total referrals" value={stats.total} />
          <StatCard label="Last 30 days" value={stats.last30} />
          <StatCard label="New (untouched)" value={stats.byStatus.find((b) => b.status === 'new')?.count ?? 0} highlight={(stats.byStatus.find((b) => b.status === 'new')?.count ?? 0) > 0} />
          <StatCard label="Completed" value={stats.byStatus.find((b) => b.status === 'completed')?.count ?? 0} />
        </div>
      )}

      <div className="ga-panel p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label-ga">Search</label>
            <input className="input-ga w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="agent, customer, carrier..." onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
          </div>
          <div>
            <label className="label-ga">Status</label>
            <select className="select-ga w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={load} className="btn-ga-green">Refresh</button>
        </div>
      </div>

      <div className="ga-panel overflow-hidden">
        <table className="ga-grid">
          <thead>
            <tr>
              <th>Received</th>
              <th>Agent</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Carrier</th>
              <th>Damage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-6">Loading...</td></tr>
            )}
            {!loading && referrals.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-6">No referrals yet. Share <span className="font-mono">/refer</span> with your MA agents.</td></tr>
            )}
            {!loading && referrals.map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                <td title={fmt(r.receivedAt)}>
                  <div className="font-medium">{timeAgo(r.receivedAt)}</div>
                  <div className="text-[10px] text-gray-500">{fmt(r.receivedAt)}</div>
                </td>
                <td>
                  <div className="font-medium">{r.agentName}</div>
                  <div className="text-[10px] text-gray-500">{r.agencyName || r.agentEmail}</div>
                </td>
                <td className="font-medium">{r.customerName}</td>
                <td>
                  <a href={`tel:${r.customerPhone.replace(/\D/g, '')}`} className="text-emerald-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                    {r.customerPhone}
                  </a>
                </td>
                <td>{r.carrier || '—'}</td>
                <td className="text-xs">{r.damage || '—'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className="select-ga text-xs"
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value as Status)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />

      {stats && stats.topAgents.length > 0 && (
        <div className="ga-panel p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Top referring agents</h2>
          <table className="ga-grid">
            <thead>
              <tr><th>Agent</th><th>Email</th><th className="text-right">Referrals</th></tr>
            </thead>
            <tbody>
              {stats.topAgents.map((a) => (
                <tr key={a.agentEmail}>
                  <td className="font-medium">{a.agentName}</td>
                  <td className="text-gray-600">{a.agentEmail}</td>
                  <td className="text-right font-semibold">{a.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `Referral · ${selected.customerName}` : ''} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Received">{fmt(selected.receivedAt)}</Field>
              <Field label="Status"><StatusBadge status={selected.status} /></Field>
              <Field label="Agent">{selected.agentName}</Field>
              <Field label="Agency">{selected.agencyName || '—'}</Field>
              <Field label="Agent email">{selected.agentEmail}</Field>
              <Field label="Agent phone">{selected.agentPhone || '—'}</Field>
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <Field label="Customer">{selected.customerName}</Field>
              <Field label="Customer phone">
                <a href={`tel:${selected.customerPhone.replace(/\D/g, '')}`} className="text-emerald-700 hover:underline">{selected.customerPhone}</a>
              </Field>
              <Field label="Customer email">{selected.customerEmail || '—'}</Field>
              <Field label="ZIP / City">{selected.customerZip || selected.customerCity || '—'}</Field>
              <Field label="Carrier">{selected.carrier || '—'}</Field>
              <Field label="Damage">{selected.damage || '—'}</Field>
              <Field label="Vehicle">{[selected.vehicleYear, selected.vehicleMake, selected.vehicleModel].filter(Boolean).join(' ') || '—'}</Field>
              <Field label="Claim #">{selected.claimNumber || '—'}</Field>
            </div>
            {selected.notes && (
              <div className="border-t pt-3">
                <div className="text-xs uppercase tracking-wider text-gray-500">Notes</div>
                <div className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3">{selected.notes}</div>
              </div>
            )}
            <div className="border-t pt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(selected.id, s)}
                  className={`px-3 py-1.5 text-xs rounded border ${selected.status === s ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`ga-panel p-3 ${highlight ? 'ring-2 ring-emerald-400' : ''}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900">{children}</div>
    </div>
  );
}
