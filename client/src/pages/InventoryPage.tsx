import { useEffect, useState } from 'react';
import { inventoryAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [tab, setTab] = useState<'inventory' | 'low_stock' | 'transfers' | 'purchase_orders'>('inventory');
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromShopId: '', toShopId: '', nagsPartNumber: '', quantity: 1 });
  const shopId = useAuthStore((s) => s.selectedShopId);

  useEffect(() => { loadData(); }, [pagination.page, shopId, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'inventory') {
        const params: any = { page: pagination.page };
        if (shopId) params.shopId = shopId;
        if (search) params.search = search;
        const { data } = await inventoryAPI.list(params);
        setInventory(data.data);
        setPagination(data.pagination);
      } else if (tab === 'low_stock') {
        const { data } = await inventoryAPI.lowStockAlerts();
        setLowStock(data.data);
      } else if (tab === 'transfers') {
        const { data } = await inventoryAPI.transfers({ shopId });
        setTransfers(data.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdjust = async () => {
    if (!adjustModal) return;
    try {
      await inventoryAPI.adjust(adjustModal.id, adjustAmount, 'manual');
      toast.success('Inventory adjusted');
      setAdjustModal(null);
      setAdjustAmount(0);
      loadData();
    } catch (err) { toast.error('Failed to adjust'); }
  };

  const handleTransfer = async () => {
    try {
      await inventoryAPI.createTransfer(transferForm);
      toast.success('Transfer created');
      setTransferModal(false);
      loadData();
    } catch (err) { toast.error('Failed to create transfer'); }
  };

  const invColumns = [
    { header: 'NAGS #', accessor: (r: any) => <span className="font-mono text-primary-600">{r.nagsPart?.nagsPartNumber}</span> },
    { header: 'Description', accessor: (r: any) => <span className="text-sm">{r.nagsPart?.description}</span> },
    { header: 'Shop', accessor: (r: any) => r.shop?.code || '-' },
    { header: 'Type', accessor: (r: any) => <span className="uppercase text-xs">{r.nagsPart?.partType}</span> },
    { header: 'Qty', accessor: (r: any) => <span className={`font-bold ${r.quantity <= r.reorderPoint ? 'text-red-600' : 'text-green-600'}`}>{r.quantity}</span> },
    { header: 'Min/Max', accessor: (r: any) => `${r.minQuantity}/${r.maxQuantity}` },
    { header: 'Reorder', accessor: (r: any) => r.reorderPoint },
    { header: 'Bin', accessor: (r: any) => r.binLocation || '-' },
    { header: 'Cost', accessor: (r: any) => `$${r.cost?.toFixed(2)}` },
    { header: 'Retail', accessor: (r: any) => `$${r.retailPrice?.toFixed(2)}` },
    { header: 'Status', accessor: (r: any) => <StatusBadge status={r.status} /> },
    { header: 'Actions', accessor: (r: any) => <button onClick={(e) => { e.stopPropagation(); setAdjustModal(r); }} className="text-primary-600 text-xs hover:underline">Adjust</button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <button onClick={() => setTransferModal(true)} className="btn-secondary">Transfer Stock</button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['inventory', 'low_stock', 'transfers', 'purchase_orders'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'}>
            {t === 'low_stock' ? 'Low Stock Alerts' : t === 'purchase_orders' ? 'Purchase Orders' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="flex gap-2">
            <input className="input-field w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search NAGS #, make, model..." />
            <button type="submit" className="btn-secondary">Search</button>
          </form>
          <DataTable columns={invColumns} data={inventory} loading={loading} />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
        </>
      )}

      {tab === 'low_stock' && (
        <div className="card">
          <h3 className="font-semibold mb-3 text-red-600">Low Stock Alerts</h3>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-2">
              {(lowStock as any[]).map((item: any, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <span className="font-mono font-medium">{item.nagsPartNumber}</span> - {item.description}
                    <p className="text-sm text-gray-500">{item.shopName} ({item.shopCode})</p>
                  </div>
                  <span className="text-red-600 font-bold">Qty: {item.quantity}</span>
                </div>
              ))}
              {lowStock.length === 0 && <p className="text-green-600">All stock levels are good!</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div className="card">
          <h3 className="font-semibold mb-3">Inter-Shop Transfers</h3>
          <div className="space-y-2">
            {transfers.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{t.transferNumber} - {t.nagsPartNumber}</p>
                  <p className="text-sm text-gray-500">{t.fromShop?.name} &rarr; {t.toShop?.name} | Qty: {t.quantity}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      <Modal isOpen={!!adjustModal} onClose={() => setAdjustModal(null)} title="Adjust Inventory">
        <div className="space-y-4">
          <p className="text-sm">Adjusting: <strong>{adjustModal?.nagsPart?.nagsPartNumber}</strong> - Current Qty: <strong>{adjustModal?.quantity}</strong></p>
          <div>
            <label className="label">Adjustment (+/-)</label>
            <input type="number" className="input-field" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} />
            <p className="text-xs text-gray-500 mt-1">New quantity will be: {(adjustModal?.quantity || 0) + adjustAmount}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdjustModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdjust} className="btn-primary">Adjust</button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="Transfer Stock Between Shops">
        <div className="space-y-4">
          <div><label className="label">From Shop ID</label><input className="input-field" value={transferForm.fromShopId} onChange={(e) => setTransferForm({ ...transferForm, fromShopId: e.target.value })} /></div>
          <div><label className="label">To Shop ID</label><input className="input-field" value={transferForm.toShopId} onChange={(e) => setTransferForm({ ...transferForm, toShopId: e.target.value })} /></div>
          <div><label className="label">NAGS Part Number</label><input className="input-field" value={transferForm.nagsPartNumber} onChange={(e) => setTransferForm({ ...transferForm, nagsPartNumber: e.target.value })} /></div>
          <div><label className="label">Quantity</label><input type="number" className="input-field" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setTransferModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleTransfer} className="btn-primary">Create Transfer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
