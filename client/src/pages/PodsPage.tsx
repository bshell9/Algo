import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { podAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

export default function PodsPage() {
  const [pods, setPods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadPods(); }, []);

  const loadPods = async () => {
    try {
      const { data } = await podAPI.list();
      setPods(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (podId: string, status: string) => {
    try {
      await podAPI.updateStatus(podId, status);
      toast.success('Pod status updated');
      loadPods();
    } catch (err) { toast.error('Failed to update'); }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pods (Mobile Units)</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">{pods.filter((p) => p.status === 'available').length} Available</span>
          <span className="text-blue-600 font-medium">{pods.filter((p) => ['dispatched', 'en_route', 'on_site'].includes(p.status)).length} Active</span>
          <span className="text-gray-500">{pods.length} Total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pods.map((pod) => (
          <div key={pod.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/pods/${pod.id}`)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{pod.name}</h3>
                <p className="text-sm text-gray-500">{pod.code} - {pod.shop?.name}</p>
              </div>
              <StatusBadge status={pod.status} />
            </div>

            {pod.vehicleMake && (
              <p className="text-sm text-gray-500 mb-2">
                {pod.vehicleYear} {pod.vehicleMake} {pod.vehicleModel} - {pod.vehiclePlate}
              </p>
            )}

            <div className="text-sm mb-3">
              <span className="text-gray-500">Technicians: </span>
              {pod.technicians?.length > 0
                ? pod.technicians.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ')
                : <span className="text-gray-400">None assigned</span>
              }
            </div>

            <div className="text-sm mb-3">
              <span className="text-gray-500">Active Jobs: </span>
              <span className="font-medium">{pod.workOrders?.length || 0}</span>
              <span className="text-gray-400"> / {pod.maxJobsPerDay} max</span>
            </div>

            {pod.workOrders?.length > 0 && (
              <div className="space-y-1 mt-2">
                {pod.workOrders.slice(0, 2).map((wo: any) => (
                  <div key={wo.id} className="text-xs bg-gray-50 rounded p-2 flex justify-between">
                    <span>{wo.customer?.firstName} {wo.customer?.lastName}</span>
                    <StatusBadge status={wo.status} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              {pod.status === 'available' && <button onClick={() => updateStatus(pod.id, 'dispatched')} className="btn-primary text-xs flex-1">Dispatch</button>}
              {pod.status === 'dispatched' && <button onClick={() => updateStatus(pod.id, 'en_route')} className="btn-primary text-xs flex-1">En Route</button>}
              {['dispatched', 'en_route', 'on_site'].includes(pod.status) && <button onClick={() => updateStatus(pod.id, 'available')} className="btn-secondary text-xs flex-1">Return</button>}
              {pod.status !== 'off_duty' && <button onClick={() => updateStatus(pod.id, 'off_duty')} className="btn-secondary text-xs">Off Duty</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
