import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    customerAPI.get(id!).then(({ data }) => setCustomer(data.data));
  }, [id]);

  if (!customer) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/customers')} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
        <p className="text-sm text-gray-500">{customer.phone} {customer.email && `| ${customer.email}`}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Contact Info</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Phone:</span> {customer.phone}</div>
            {customer.altPhone && <div><span className="text-gray-500">Alt Phone:</span> {customer.altPhone}</div>}
            {customer.email && <div><span className="text-gray-500">Email:</span> {customer.email}</div>}
            {customer.address && <div><span className="text-gray-500">Address:</span> {customer.address}, {customer.city} {customer.state} {customer.zip}</div>}
            {customer.company && <div><span className="text-gray-500">Company:</span> {customer.company}</div>}
            <div><span className="text-gray-500">Source:</span> <span className="capitalize">{customer.source?.replace(/_/g, ' ')}</span></div>
            {customer.isFleet && <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Fleet Account</span>}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card"><p className="text-xs text-gray-500">Total Jobs</p><p className="text-2xl font-bold">{customer.totalJobs}</p></div>
            <div className="stat-card"><p className="text-xs text-gray-500">Revenue</p><p className="text-2xl font-bold text-green-600">${(customer.totalRevenue || 0).toFixed(0)}</p></div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Vehicles ({customer.vehicles?.length || 0})</h3>
          <div className="space-y-2">
            {customer.vehicles?.map((v: any) => (
              <div key={v.id} className="p-2 bg-gray-50 rounded text-sm">
                <p className="font-medium">{v.year} {v.make} {v.model}</p>
                <p className="text-xs text-gray-500">VIN: {v.vin || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Work Order History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Order #</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
                <th className="table-header">Total</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customer.workOrders?.map((wo: any) => (
                <tr key={wo.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                  <td className="table-cell font-mono text-primary-600">{wo.orderNumber}</td>
                  <td className="table-cell">{wo.vehicle?.year} {wo.vehicle?.make} {wo.vehicle?.model}</td>
                  <td className="table-cell capitalize">{wo.jobType?.replace(/_/g, ' ')}</td>
                  <td className="table-cell"><StatusBadge status={wo.status} /></td>
                  <td className="table-cell">${wo.totalAmount?.toFixed(2)}</td>
                  <td className="table-cell">{new Date(wo.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
