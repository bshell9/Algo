import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { podAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function PodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pod, setPod] = useState<any>(null);

  useEffect(() => { podAPI.get(id!).then(({ data }) => setPod(data.data)); }, [id]);

  if (!pod) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/pods')} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{pod.name} ({pod.code})</h1>
          <StatusBadge status={pod.status} />
        </div>
        <p className="text-sm text-gray-500">{pod.shop?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Pod Details</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Vehicle:</span> {pod.vehicleYear} {pod.vehicleMake} {pod.vehicleModel}</div>
            <div><span className="text-gray-500">Plate:</span> {pod.vehiclePlate || 'N/A'}</div>
            <div><span className="text-gray-500">Max Jobs/Day:</span> {pod.maxJobsPerDay}</div>
            <div><span className="text-gray-500">Service Radius:</span> {pod.serviceRadius} mi</div>
            {pod.currentLat && <div><span className="text-gray-500">Last Location:</span> {pod.currentLat?.toFixed(4)}, {pod.currentLng?.toFixed(4)}</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Technicians</h3>
          {pod.technicians?.map((t: any) => (
            <div key={t.id} className="p-2 bg-gray-50 rounded mb-2 text-sm">
              <p className="font-medium">{t.firstName} {t.lastName}</p>
              <p className="text-gray-500">{t.phone} | {t.email}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Pod Inventory</h3>
          {pod.podInventory?.length > 0 ? (
            <div className="space-y-1">
              {pod.podInventory.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm p-1">
                  <span className="font-mono">{item.nagsPart?.nagsPartNumber}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No parts loaded</p>}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Today's Jobs</h3>
        <div className="space-y-2">
          {pod.workOrders?.map((wo: any) => (
            <div key={wo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/work-orders/${wo.id}`)}>
              <div>
                <p className="font-medium">{wo.orderNumber} - {wo.customer?.firstName} {wo.customer?.lastName}</p>
                <p className="text-sm text-gray-500">{wo.vehicle?.year} {wo.vehicle?.make} {wo.vehicle?.model} | {wo.serviceAddress || 'In-shop'}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={wo.status} />
                <p className="text-sm font-medium mt-1">${wo.totalAmount?.toFixed(2)}</p>
              </div>
            </div>
          ))}
          {(!pod.workOrders || pod.workOrders.length === 0) && <p className="text-sm text-gray-500">No jobs for today</p>}
        </div>
      </div>
    </div>
  );
}
