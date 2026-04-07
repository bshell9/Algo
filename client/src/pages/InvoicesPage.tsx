import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const shopId = useAuthStore((s) => s.selectedShopId);
  const navigate = useNavigate();

  useEffect(() => { loadInvoices(); }, [pagination.page, statusFilter, shopId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page };
      if (statusFilter) params.status = statusFilter;
      if (shopId) params.shopId = shopId;
      if (search) params.search = search;
      const { data } = await invoiceAPI.list(params);
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: 'Invoice #', accessor: (r: any) => <span className="font-mono text-primary-600 font-medium">{r.invoiceNumber}</span> },
    { header: 'Work Order', accessor: (r: any) => r.workOrder?.orderNumber || '-' },
    { header: 'Customer', accessor: (r: any) => `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}` },
    { header: 'Shop', accessor: (r: any) => r.shop?.code || '-' },
    { header: 'Total', accessor: (r: any) => <span className="font-medium">${r.total?.toFixed(2)}</span> },
    { header: 'Paid', accessor: (r: any) => <span className="text-green-600">${r.amountPaid?.toFixed(2)}</span> },
    { header: 'Due', accessor: (r: any) => <span className={r.amountDue > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>${r.amountDue?.toFixed(2)}</span> },
    { header: 'Due Date', accessor: (r: any) => new Date(r.dueDate).toLocaleDateString() },
    { header: 'Status', accessor: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <div className="flex gap-3">
        <form onSubmit={(e) => { e.preventDefault(); loadInvoices(); }} className="flex gap-2">
          <input className="input-field w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-40">
          <option value="">All Statuses</option>
          {['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} data={invoices} onRowClick={(r) => navigate(`/invoices/${r.id}`)} loading={loading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
    </div>
  );
}
