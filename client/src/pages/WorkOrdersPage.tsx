import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrderAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const shopId = useAuthStore((s) => s.selectedShopId);
  const navigate = useNavigate();

  useEffect(() => { loadOrders(); }, [pagination.page, statusFilter, shopId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      if (shopId) params.shopId = shopId;
      if (search) params.search = search;
      const { data } = await workOrderAPI.list(params);
      setOrders(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadOrders();
  };

  const statuses = ['', 'quote', 'pending', 'scheduled', 'dispatched', 'en_route', 'on_site', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'];

  const columns = [
    { header: 'Order #', accessor: (row: any) => <span className="font-mono text-primary-600 font-medium">{row.orderNumber}</span> },
    { header: 'Customer', accessor: (row: any) => `${row.customer?.firstName || ''} ${row.customer?.lastName || ''}` },
    { header: 'Vehicle', accessor: (row: any) => row.vehicle ? `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}` : '-' },
    { header: 'Type', accessor: (row: any) => <span className="capitalize">{row.jobType?.replace(/_/g, ' ')}</span> },
    { header: 'Glass', accessor: (row: any) => <span className="capitalize">{row.glassPosition?.replace(/_/g, ' ')}</span> },
    { header: 'Pod', accessor: (row: any) => row.pod?.name || '-' },
    { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
    { header: 'Total', accessor: (row: any) => <span className="font-medium">${row.totalAmount?.toFixed(2)}</span> },
    { header: 'Shop', accessor: (row: any) => row.shop?.code || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <button onClick={() => navigate('/work-orders/new')} className="btn-primary">+ New Work Order</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="input-field w-64" />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-40">
          <option value="">All Statuses</option>
          {statuses.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={orders} onRowClick={(row) => navigate(`/work-orders/${row.id}`)} loading={loading} emptyMessage="No work orders found" />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
    </div>
  );
}
