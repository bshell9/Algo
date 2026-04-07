import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const shopId = useAuthStore((s) => s.selectedShopId);
  const navigate = useNavigate();

  useEffect(() => { loadDashboard(); }, [shopId]);

  const loadDashboard = async () => {
    try {
      const params = shopId ? { shopId } : {};
      const [statsRes, schedRes, podsRes, actRes] = await Promise.all([
        dashboardAPI.stats(params),
        dashboardAPI.todaySchedule(params),
        dashboardAPI.podStatus(),
        dashboardAPI.recentActivity(),
      ]);
      setStats(statsRes.data.data);
      setSchedule(schedRes.data.data);
      setPods(podsRes.data.data);
      setActivity(actRes.data.data);
    } catch (err) { console.error(err); }
  };

  const statCards = stats ? [
    { label: "Today's Jobs", value: stats.todayJobs, color: '#1a7a1a' },
    { label: "Today's Revenue", value: `$${(stats.todayRevenue || 0).toLocaleString()}`, color: '#1a7a1a' },
    { label: 'Pending Jobs', value: stats.pendingJobs, color: '#cc8800' },
    { label: 'Active Pods', value: stats.activePods, color: '#1a7a1a' },
    { label: 'Open Claims', value: stats.openClaims, color: '#2255aa' },
    { label: 'Overdue Invoices', value: stats.overdueInvoices, color: '#cc3333' },
    { label: 'Weekly Revenue', value: `$${(stats.weeklyRevenue || 0).toLocaleString()}`, color: '#1a7a1a' },
    { label: 'Monthly Revenue', value: `$${(stats.monthlyRevenue || 0).toLocaleString()}`, color: '#0d5e0d' },
    { label: 'Avg Job Value', value: `$${stats.averageJobValue || 0}`, color: '#1a7a1a' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, color: '#1a7a1a' },
  ] : [];

  return (
    <div className="p-4 space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="ga-panel p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Schedule */}
        <div className="ga-panel">
          <div className="px-3 py-2 font-medium text-sm border-b" style={{ borderColor: '#c0c0c0', background: '#1a7a1a', color: 'white' }}>Today's Schedule</div>
          <div className="p-2 space-y-1">
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No jobs scheduled for today</p>
            ) : schedule.slice(0, 8).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer rounded text-xs" onClick={() => navigate(`/work-orders/${entry.workOrder?.id}`)}>
                <div>
                  <span className="font-medium">{entry.workOrder?.customer?.firstName} {entry.workOrder?.customer?.lastName}</span>
                  <span className="text-gray-400 ml-2">{entry.startTime} - {entry.workOrder?.vehicle?.year} {entry.workOrder?.vehicle?.make}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.workOrder?.status || 'pending'} />
                  {entry.pod && <span className="text-xs px-1 rounded" style={{ background: '#e8f5e8', color: '#1a7a1a' }}>{entry.pod.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pod Status */}
        <div className="ga-panel">
          <div className="px-3 py-2 font-medium text-sm border-b" style={{ borderColor: '#c0c0c0', background: '#1a7a1a', color: 'white' }}>Pod Status</div>
          <div className="p-2 space-y-1">
            {pods.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No pods configured</p>
            ) : pods.map((pod: any) => (
              <div key={pod.id} className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer rounded text-xs" onClick={() => navigate(`/pods/${pod.id}`)}>
                <div>
                  <span className="font-medium">{pod.name}</span>
                  <span className="text-gray-400 ml-2">{pod.technicians?.map((t: any) => `${t.firstName}`).join(', ') || 'No tech'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={pod.status} />
                  <span className="text-xs">{pod.workOrders?.length || 0} jobs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="ga-panel">
          <div className="px-3 py-2 font-medium text-sm border-b" style={{ borderColor: '#c0c0c0', background: '#1a7a1a', color: 'white' }}>Recent Work Orders</div>
          <div className="p-2 space-y-1">
            {activity?.recentOrders?.slice(0, 6).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer rounded text-xs" onClick={() => navigate(`/work-orders/${order.id}`)}>
                <div>
                  <span className="font-mono font-medium" style={{ color: '#1a7a1a' }}>{order.orderNumber}</span>
                  <span className="text-gray-500 ml-2">{order.customer?.firstName} {order.customer?.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <span className="font-medium">${order.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="ga-panel">
          <div className="px-3 py-2 font-medium text-sm border-b" style={{ borderColor: '#c0c0c0', background: '#1a7a1a', color: 'white' }}>Recent Payments</div>
          <div className="p-2 space-y-1">
            {activity?.recentPayments?.slice(0, 6).map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-2 text-xs">
                <div>
                  <span className="font-mono">{payment.receiptNumber}</span>
                  <span className="text-gray-400 ml-2 capitalize">{payment.paymentMethod?.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-medium" style={{ color: '#1a7a1a' }}>${payment.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
