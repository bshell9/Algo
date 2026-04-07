import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleAPI, podAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
const TIME_KEYS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export default function SchedulePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<'day' | 'week'>('day');
  const [filters, setFilters] = useState({ mobile: true, shop: true, auto: true, flat: true });
  const shopId = useAuthStore((s) => s.selectedShopId);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, [selectedDate, shopId]);

  const loadData = async () => {
    try {
      const endDate = new Date(new Date(selectedDate).getTime() + 86400000).toISOString().slice(0, 10);
      const params: any = { startDate: selectedDate, endDate };
      if (shopId) params.shopId = shopId;
      const [schedRes, podsRes] = await Promise.all([
        scheduleAPI.list(params),
        podAPI.list({ shopId }),
      ]);
      setEntries(schedRes.data.data);
      setPods(podsRes.data.data);
    } catch (err) { console.error(err); }
  };

  const prevDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const today = () => setSelectedDate(new Date().toISOString().slice(0, 10));

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  // Build technician columns from pods
  const techColumns = [
    { id: 'unassigned', name: 'Unassigned Auto', icon: '🚗' },
    ...pods.flatMap((pod: any) =>
      pod.technicians?.length > 0
        ? pod.technicians.map((tech: any) => ({
            id: tech.id,
            name: `${tech.lastName?.toUpperCase()} ${tech.firstName?.toUpperCase()}`,
            podName: pod.name,
            icon: '🚐',
          }))
        : [{ id: pod.id, name: pod.name, podName: pod.code, icon: '🚐' }]
    ),
  ];

  const getEntriesForSlot = (techId: string, timeKey: string) => {
    return entries.filter((e) => {
      const matchesTech = techId === 'unassigned'
        ? !e.technicianId && !e.podId
        : e.technicianId === techId || e.podId === techId;
      const matchesTime = e.startTime <= timeKey && e.endTime > timeKey;
      return matchesTech && matchesTime;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Sub Tabs ─── */}
      <div className="ga-tabs">
        <button className="ga-tab active">Calendar</button>
        <button className="ga-tab">Jobs</button>
      </div>

      {/* ─── Controls Bar ─── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b" style={{ borderColor: '#c0c0c0' }}>
        <button onClick={today} className="btn-ga-green text-xs">Today</button>
        <button onClick={prevDay} className="btn-ga-outline text-xs">&lt;</button>
        <button onClick={nextDay} className="btn-ga-outline text-xs">&gt;</button>
        <span className="font-medium text-sm px-3 py-1 rounded" style={{ background: '#e8e0a0' }}>{dateLabel}</span>
        <button onClick={() => setView('day')} className={view === 'day' ? 'btn-ga-green text-xs' : 'btn-ga-outline text-xs'}>Day</button>
        <button onClick={() => setView('week')} className={view === 'week' ? 'btn-ga-green text-xs' : 'btn-ga-outline text-xs'}>Week</button>

        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Store</span>
            <select className="select-ga w-48">
              <option>Combine All Stores</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Sort Techs</span>
            <select className="select-ga w-24"><option>Name</option></select>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-1"><input type="checkbox" checked={filters.mobile} onChange={(e) => setFilters({ ...filters, mobile: e.target.checked })} className="rounded" style={{ accentColor: '#1a7a1a' }} /> Mobile</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={filters.shop} onChange={(e) => setFilters({ ...filters, shop: e.target.checked })} className="rounded" style={{ accentColor: '#1a7a1a' }} /> Shop</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={filters.auto} onChange={(e) => setFilters({ ...filters, auto: e.target.checked })} className="rounded" style={{ accentColor: '#1a7a1a' }} /> Auto</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={filters.flat} onChange={(e) => setFilters({ ...filters, flat: e.target.checked })} className="rounded" style={{ accentColor: '#1a7a1a' }} /> Flat</label>
          </div>
        </div>
      </div>

      {/* ─── Schedule Grid ─── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${techColumns.length * 140 + 80}px` }}>
          {/* Technician Header Row */}
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-xs font-normal text-gray-500 bg-white border-b border-r" style={{ width: '70px', borderColor: '#c0c0c0' }}></th>
              {techColumns.map((tech) => (
                <th key={tech.id} className="px-1 py-2 text-center border-b border-r" style={{ borderColor: '#c0c0c0', background: '#1a7a1a', minWidth: '130px' }}>
                  <div className="text-white text-xs font-bold">{tech.name}</div>
                  <div className="text-white/70 text-xs">{tech.icon}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* All Day Row */}
            <tr>
              <td className="px-2 py-1 text-xs text-gray-500 border-r border-b font-medium" style={{ borderColor: '#ddd' }}>All Day</td>
              {techColumns.map((tech) => (
                <td key={tech.id} className="border-r border-b p-0.5" style={{ borderColor: '#ddd', background: '#f8f8f8' }}></td>
              ))}
            </tr>

            {/* Time Slot Rows */}
            {TIME_SLOTS.map((label, idx) => (
              <tr key={label}>
                <td className="px-2 py-1 text-xs text-gray-500 border-r border-b font-medium align-top" style={{ borderColor: '#ddd' }}>{label}</td>
                {techColumns.map((tech) => {
                  const slotEntries = getEntriesForSlot(tech.id, TIME_KEYS[idx]);
                  return (
                    <td key={tech.id} className="border-r border-b p-0.5 align-top" style={{ borderColor: '#ddd', minHeight: '60px' }}>
                      {slotEntries.map((entry: any) => {
                        const wo = entry.workOrder;
                        const customer = wo?.customer;
                        const vehicle = wo?.vehicle;
                        return (
                          <div
                            key={entry.id}
                            className="ga-schedule-card mb-0.5"
                            onClick={() => navigate(`/work-orders/${wo?.id}`)}
                          >
                            <div className="font-bold">{customer?.lastName?.toUpperCase()}, {customer?.firstName?.toUpperCase()}</div>
                            <div>{wo?.orderNumber}</div>
                            <div>{vehicle?.year} {vehicle?.make?.toUpperCase()}</div>
                            <div>{vehicle?.model?.toUpperCase()}</div>
                            <div className="mt-0.5 opacity-75">Pref: {entry.startTime} - {entry.endTime}</div>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
