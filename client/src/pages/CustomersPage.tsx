import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: '', zip: '', company: '', source: 'walk_in', isFleet: false, notes: '' });
  const navigate = useNavigate();

  useEffect(() => { loadCustomers(); }, [pagination.page]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await customerAPI.list({ page: pagination.page, search: search || undefined });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      await customerAPI.create(form);
      toast.success('Customer created');
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: '', zip: '', company: '', source: 'walk_in', isFleet: false, notes: '' });
      loadCustomers();
    } catch (err) { toast.error('Failed to create customer'); }
  };

  const columns = [
    { header: 'Name', accessor: (r: any) => <span className="font-medium">{r.firstName} {r.lastName}</span> },
    { header: 'Phone', accessor: 'phone' as const },
    { header: 'Email', accessor: (r: any) => r.email || '-' },
    { header: 'Company', accessor: (r: any) => r.company || '-' },
    { header: 'Source', accessor: (r: any) => <span className="capitalize text-xs">{r.source?.replace(/_/g, ' ')}</span> },
    { header: 'Vehicles', accessor: (r: any) => r._count?.vehicles || 0 },
    { header: 'Orders', accessor: (r: any) => r._count?.workOrders || 0 },
    { header: 'Revenue', accessor: (r: any) => `$${(r.totalRevenue || 0).toFixed(0)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Customer</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); loadCustomers(); }} className="flex gap-2">
        <input type="text" className="input-field w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      <DataTable columns={columns} data={customers} onRowClick={(r) => navigate(`/customers/${r.id}`)} loading={loading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Customer" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">First Name *</label><input className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
          <div><label className="label">Last Name *</label><input className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
          <div><label className="label">Phone *</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
          <div><label className="label">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-span-2"><label className="label">Address</label><input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">City</label><input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">State</label><input className="input-field" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div><label className="label">Zip</label><input className="input-field" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
          <div><label className="label">Company</label><input className="input-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div>
            <label className="label">Source</label>
            <select className="input-field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {['walk_in', 'phone', 'website', 'insurance_referral', 'fleet', 'dealer', 'repeat', 'referral', 'advertising'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div><label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.isFleet} onChange={(e) => setForm({ ...form, isFleet: e.target.checked })} className="rounded" /><span className="text-sm">Fleet Account</span></label></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Create Customer</button>
        </div>
      </Modal>
    </div>
  );
}
