import { useEffect, useState } from 'react';
import { reportAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ReportsPage() {
  const [tab, setTab] = useState<'revenue' | 'tech' | 'inventory' | 'jobs' | 'insurance' | 'pos'>('revenue');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const shopId = useAuthStore((s) => s.selectedShopId);

  useEffect(() => { loadReport(); }, [tab, shopId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let result;
      const params = { ...dateRange, shopId };
      switch (tab) {
        case 'revenue': result = await reportAPI.revenue(params); break;
        case 'tech': result = await reportAPI.techPerformance(dateRange); break;
        case 'inventory': result = await reportAPI.inventoryValue(); break;
        case 'jobs': result = await reportAPI.jobsByType(params); break;
        case 'insurance': result = await reportAPI.insuranceSummary(); break;
        case 'pos': result = await reportAPI.posSummary(params); break;
      }
      setData(result?.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'tech', label: 'Tech Performance' },
    { key: 'inventory', label: 'Inventory Value' },
    { key: 'jobs', label: 'Jobs by Type' },
    { key: 'insurance', label: 'Insurance Summary' },
    { key: 'pos', label: 'POS Summary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap gap-2 items-center">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} className={tab === t.key ? 'btn-primary' : 'btn-secondary'}>
            {t.label}
          </button>
        ))}
        <div className="flex gap-2 ml-auto items-center">
          <input type="date" className="input-field" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
          <span className="text-gray-500">to</span>
          <input type="date" className="input-field" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
          <button onClick={loadReport} className="btn-secondary">Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading report...</div>
      ) : (
        <>
          {/* Revenue Report */}
          {tab === 'revenue' && Array.isArray(data) && (
            <div className="card">
              <h3 className="font-semibold mb-4">Revenue by Period</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead><tr><th className="table-header">Period</th><th className="table-header text-right">Revenue</th><th className="table-header text-right">Insurance</th><th className="table-header text-right">Cash</th><th className="table-header text-right">Jobs</th><th className="table-header text-right">Avg Ticket</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((row: any) => (
                      <tr key={row.period}><td className="table-cell">{row.period}</td><td className="table-cell text-right font-medium">${row.totalRevenue?.toFixed(0)}</td><td className="table-cell text-right text-blue-600">${row.insuranceRevenue?.toFixed(0)}</td><td className="table-cell text-right text-green-600">${row.cashRevenue?.toFixed(0)}</td><td className="table-cell text-right">{row.jobCount}</td><td className="table-cell text-right">${row.averageTicket}</td></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2">
                      <td className="table-cell">TOTAL</td>
                      <td className="table-cell text-right">${data.reduce((s: number, r: any) => s + r.totalRevenue, 0).toFixed(0)}</td>
                      <td className="table-cell text-right">${data.reduce((s: number, r: any) => s + r.insuranceRevenue, 0).toFixed(0)}</td>
                      <td className="table-cell text-right">${data.reduce((s: number, r: any) => s + r.cashRevenue, 0).toFixed(0)}</td>
                      <td className="table-cell text-right">{data.reduce((s: number, r: any) => s + r.jobCount, 0)}</td>
                      <td className="table-cell text-right">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tech Performance */}
          {tab === 'tech' && Array.isArray(data) && (
            <div className="card">
              <h3 className="font-semibold mb-4">Technician Performance</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead><tr><th className="table-header">Technician</th><th className="table-header text-right">Jobs</th><th className="table-header text-right">Revenue</th><th className="table-header text-right">Avg Time (min)</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((tech: any) => (
                    <tr key={tech.technicianId}><td className="table-cell font-medium">{tech.technicianName}</td><td className="table-cell text-right">{tech.jobsCompleted}</td><td className="table-cell text-right text-green-600">${tech.totalRevenue?.toFixed(0)}</td><td className="table-cell text-right">{tech.averageJobTime}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory Value */}
          {tab === 'inventory' && data && (
            <div className="card">
              <h3 className="font-semibold mb-4">Inventory Value by Shop</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {data.byShop?.map((shop: any) => (
                  <div key={shop.code} className="stat-card">
                    <p className="text-sm text-gray-500">{shop.shop} ({shop.code})</p>
                    <p className="text-2xl font-bold text-green-600">${shop.totalValue?.toFixed(0)}</p>
                    <p className="text-xs text-gray-400">{shop.totalParts} parts / {shop.itemCount} SKUs</p>
                  </div>
                ))}
              </div>
              <div className="stat-card bg-primary-50">
                <p className="text-sm text-gray-500">Grand Total Inventory Value</p>
                <p className="text-3xl font-bold text-primary-600">${data.grandTotal?.toFixed(0)}</p>
              </div>
            </div>
          )}

          {/* Jobs by Type */}
          {tab === 'jobs' && Array.isArray(data) && (
            <div className="card">
              <h3 className="font-semibold mb-4">Jobs by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {data.map((j: any) => (
                  <div key={j.jobType} className="stat-card text-center">
                    <p className="text-sm text-gray-500 capitalize">{j.jobType?.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold">{j.count}</p>
                    <p className="text-sm text-green-600">${(j.revenue || 0).toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance Summary */}
          {tab === 'insurance' && Array.isArray(data) && (
            <div className="card">
              <h3 className="font-semibold mb-4">Insurance Company Summary</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead><tr><th className="table-header">Company</th><th className="table-header">Code</th><th className="table-header text-right">Claims</th><th className="table-header text-right">Approved</th><th className="table-header text-right">Deductibles</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((c: any) => (
                    <tr key={c.code}><td className="table-cell">{c.company}</td><td className="table-cell font-mono">{c.code}</td><td className="table-cell text-right">{c.claimCount}</td><td className="table-cell text-right text-green-600">${c.totalApproved?.toFixed(0)}</td><td className="table-cell text-right">${c.totalDeductibles?.toFixed(0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* POS Summary */}
          {tab === 'pos' && data && (
            <div className="card">
              <h3 className="font-semibold mb-4">POS Daily Summary - {data.date}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card"><p className="text-xs text-gray-500">Total Transactions</p><p className="text-2xl font-bold">{data.totalTransactions}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">Total Sales</p><p className="text-2xl font-bold text-green-600">${data.totalSales?.toFixed(2)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">Refunds</p><p className="text-2xl font-bold text-red-600">${data.totalRefunds?.toFixed(2)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">Net Revenue</p><p className="text-2xl font-bold text-primary-600">${data.netRevenue?.toFixed(2)}</p></div>
              </div>
              {data.byMethod && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">By Payment Method</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(data.byMethod).map(([method, info]: any) => (
                      <div key={method} className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 capitalize">{method.replace(/_/g, ' ')}</p>
                        <p className="font-bold">${info.total?.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{info.count} txns</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
