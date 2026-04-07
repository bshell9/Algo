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

  useEffect(() => {
    loadDashboard();
  }, [shopId]);

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
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  const statCards = stats ? [
    { label: "Today's Jobs", value: stats.todayJobs, color: 'text-primary-600' },
    { label: "Today's Revenue", value: `$${(stats.todayRevenue || 0).toLocaleString()}`, color: 'text-green-600' },
    { label: 'Pending Jobs', value: stats.pendingJobs, color: 'text-yellow-600' },
    { label: 'Active Pods', value: stats.activePods, color: 'text-purple-600' },
    { label: 'Open Claims', value: stats.openClaims, color: 'text-blue-600' },
    { label: 'Overdue Invoices', value: stats.overdueInvoices, color: 'text-red-600' },
    { label: 'Weekly Revenue', value: `$${(stats.weeklyRevenue || 0).toLocaleString()}`, color: 'text-emerald-600' },
    { label: 'Monthly Revenue', value: `$${(stats.monthlyRevenue || 0).toLocaleString()}`, color: 'text-teal-600' },
    { label: 'Avg Job Value', value: `$${stats.averageJobValue || 0}`, color: 'text-indigo-600' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, color: 'text-green-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">AutoGlass Pod System Overview</p>
        </div>
        <button onClick={() => navigate('/work-orders/new')} className="btn-primary">
          + New Work Order
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500">No jobs scheduled for today</p>
            ) : (
              schedule.slice(0, 8).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/work-orders/${entry.workOrder?.id}`)}>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.workOrder?.customer?.firstName} {entry.workOrder?.customer?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.startTime} - {entry.workOrder?.vehicle?.year} {entry.workOrder?.vehicle?.make} {entry.workOrder?.vehicle?.model}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={entry.workOrder?.status || 'pending'} />
                    {entry.pod && <p className="text-xs text-gray-500 mt-1">{entry.pod.name}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pod Status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pod Status</h2>
          <div className="space-y-3">
            {pods.length === 0 ? (
              <p className="text-sm text-gray-500">No pods configured</p>
            ) : (
              pods.map((pod: any) => (
                <div key={pod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/pods/${pod.id}`)}>
                  <div>
                    <p className="text-sm font-medium">{pod.name}</p>
                    <p className="text-xs text-gray-500">
                      {pod.technicians?.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ') || 'No technician'}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={pod.status} />
                    <p className="text-xs text-gray-500 mt-1">{pod.workOrders?.length || 0} active jobs</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Work Orders</h2>
          <div className="space-y-2">
            {activity?.recentOrders?.slice(0, 6).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 rounded" onClick={() => navigate(`/work-orders/${order.id}`)}>
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.customer?.firstName} {order.customer?.lastName} - {order.vehicle?.year} {order.vehicle?.make}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} />
                  <p className="text-xs text-gray-500 mt-1">${order.totalAmount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
          <div className="space-y-2">
            {activity?.recentPayments?.slice(0, 6).map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0 px-2">
                <div>
                  <p className="text-sm font-medium">{payment.receiptNumber}</p>
                  <p className="text-xs text-gray-500">{payment.paymentMethod.replace(/_/g, ' ')} - {payment.invoice?.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">${payment.amount}</p>
                  <p className="text-xs text-gray-500">{payment.transactionType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
