import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { claimAPI } from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadClaims(); }, [pagination.page, statusFilter]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page };
      if (statusFilter) params.status = statusFilter;
      const { data } = await claimAPI.list(params);
      setClaims(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: 'Claim #', accessor: (r: any) => <span className="font-mono font-medium">{r.claimNumber}</span> },
    { header: 'Insurance', accessor: (r: any) => r.insuranceCompanyName },
    { header: 'Policy #', accessor: (r: any) => r.policyNumber },
    { header: 'Work Order', accessor: (r: any) => r.workOrder?.orderNumber || '-' },
    { header: 'Customer', accessor: (r: any) => {
      const c = r.workOrder?.customer;
      return c ? `${c.firstName} ${c.lastName}` : '-';
    }},
    { header: 'Vehicle', accessor: (r: any) => {
      const v = r.workOrder?.vehicle;
      return v ? `${v.year} ${v.make} ${v.model}` : '-';
    }},
    { header: 'Approved', accessor: (r: any) => `$${(r.approvedAmount || 0).toFixed(2)}` },
    { header: 'Deductible', accessor: (r: any) => `$${(r.deductible || 0).toFixed(2)}` },
    { header: 'Status', accessor: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insurance Claims</h1>
          <p className="text-sm text-gray-500">EDI processing handled via Omega/Mainstreet license</p>
        </div>
      </div>
      <div className="flex gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-48">
          <option value="">All Statuses</option>
          {['draft', 'submitted', 'acknowledged', 'approved', 'denied', 'pending_info', 'in_review', 'paid', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} data={claims} onRowClick={(r) => navigate(`/claims/${r.id}`)} loading={loading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
    </div>
  );
}
