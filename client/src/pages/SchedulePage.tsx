import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';

export default function SchedulePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<'day' | 'week'>('day');
  const shopId = useAuthStore((s) => s.selectedShopId);
  const navigate = useNavigate();

  useEffect(() => { loadSchedule(); }, [selectedDate, shopId]);

  const loadSchedule = async () => {
    try {
      const startDate = selectedDate;
      const endDate = view === 'week'
        ? new Date(new Date(selectedDate).getTime() + 7 * 86400000).toISOString().slice(0, 10)
        : new Date(new Date(selectedDate).getTime() + 86400000).toISOString().slice(0, 10);
      const params: any = { startDate, endDate };
      if (shopId) params.shopId = shopId;
      const { data } = await scheduleAPI.list(params);
      setEntries(data.data);
    } catch (err) { console.error(err); }
  };

  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const pods = [...new Map(entries.filter((e) => e.pod).map((e) => [e.pod.id, e.pod])).values()];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule & Dispatch</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => setView('day')} className={view === 'day' ? 'btn-primary' : 'btn-secondary'}>Day</button>
          <button onClick={() => setView('week')} className={view === 'week' ? 'btn-primary' : 'btn-secondary'}>Week</button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field" />
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }} className="btn-secondary">&larr;</button>
          <button onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} className="btn-secondary">Today</button>
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }} className="btn-secondary">&rarr;</button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-header w-20">Time</th>
              {pods.length > 0 ? pods.map((pod) => (
                <th key={pod.id} className="table-header text-center">
                  {pod.name} ({pod.code})
                  <br />
                  <StatusBadge status={pod.status} />
                </th>
              )) : <th className="table-header text-center">No pods scheduled</th>}
              <th className="table-header text-center">In-Shop</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((time) => (
              <tr key={time} className="border-t">
                <td className="table-cell font-mono text-xs text-gray-500 w-20">{time}</td>
                {pods.map((pod) => {
                  const entry = entries.find((e) => e.podId === pod.id && e.startTime <= time && e.endTime > time);
                  return (
                    <td key={pod.id} className="table-cell text-center">
                      {entry ? (
                        <div
                          className="bg-primary-50 border border-primary-200 rounded p-1 text-xs cursor-pointer hover:bg-primary-100"
                          onClick={() => navigate(`/work-orders/${entry.workOrder?.id}`)}
                        >
                          <p className="font-medium">{entry.workOrder?.customer?.firstName} {entry.workOrder?.customer?.lastName}</p>
                          <p className="text-gray-500">{entry.workOrder?.vehicle?.year} {entry.workOrder?.vehicle?.make}</p>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
                <td className="table-cell text-center">
                  {entries.filter((e) => !e.podId && e.startTime <= time && e.endTime > time).map((entry) => (
                    <div key={entry.id} className="bg-green-50 border border-green-200 rounded p-1 text-xs mb-1 cursor-pointer" onClick={() => navigate(`/work-orders/${entry.workOrder?.id}`)}>
                      <p className="font-medium">{entry.workOrder?.customer?.firstName} {entry.workOrder?.customer?.lastName}</p>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day Summary */}
      <div className="card">
        <h3 className="font-semibold mb-3">All Appointments ({entries.length})</h3>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/work-orders/${entry.workOrder?.id}`)}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-gray-500">{entry.startTime}-{entry.endTime}</span>
                <div>
                  <p className="text-sm font-medium">{entry.workOrder?.customer?.firstName} {entry.workOrder?.customer?.lastName}</p>
                  <p className="text-xs text-gray-500">{entry.workOrder?.vehicle?.year} {entry.workOrder?.vehicle?.make} {entry.workOrder?.vehicle?.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {entry.pod && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">{entry.pod.name}</span>}
                {entry.technician && <span className="text-xs">{entry.technician.firstName}</span>}
                <StatusBadge status={entry.workOrder?.status || 'scheduled'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
