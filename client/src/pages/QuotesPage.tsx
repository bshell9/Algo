import { useEffect, useState } from 'react';
import { quoteAPI, nagsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const shopId = useAuthStore((s) => s.selectedShopId);
  const [form, setForm] = useState({
    shopId: shopId || '', vehicleYear: new Date().getFullYear(), vehicleMake: '', vehicleModel: '', glassPosition: 'windshield',
    jobType: 'replacement', nagsPartNumber: '', partDescription: '', partType: 'aftermarket',
    partCost: 0, laborCost: 50, moldingCost: 0, kitCost: 25, calibrationCost: 0, otherCharges: 0,
    discount: 0, taxAmount: 0, totalAmount: 0, isInsuranceJob: false, deductible: 0, customerPays: 0, insurancePays: 0,
  });

  useEffect(() => { loadQuotes(); }, [pagination.page, shopId]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page };
      if (shopId) params.shopId = shopId;
      const { data } = await quoteAPI.list(params);
      setQuotes(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const recalcTotal = (updates: any = {}) => {
    const f = { ...form, ...updates };
    const retailPrice = Math.round(f.partCost * 1.45 * 100) / 100;
    const total = retailPrice + f.laborCost + f.moldingCost + f.kitCost + f.calibrationCost + f.otherCharges - f.discount + f.taxAmount;
    const customerPays = f.isInsuranceJob ? f.deductible : total;
    const insurancePays = f.isInsuranceJob ? total - f.deductible : 0;
    setForm({ ...f, totalAmount: total, customerPays, insurancePays });
  };

  const handleCreate = async () => {
    try {
      await quoteAPI.create(form);
      toast.success('Quote created');
      setShowCreate(false);
      loadQuotes();
    } catch (err) { toast.error('Failed to create quote'); }
  };

  const convertToWorkOrder = async (quoteId: string) => {
    toast('Conversion requires customer and vehicle selection - use Work Order create page', { icon: 'i' });
  };

  const columns = [
    { header: 'Quote #', accessor: (r: any) => <span className="font-mono text-primary-600">{r.quoteNumber}</span> },
    { header: 'Vehicle', accessor: (r: any) => `${r.vehicleYear} ${r.vehicleMake} ${r.vehicleModel}` },
    { header: 'Glass', accessor: (r: any) => <span className="capitalize">{r.glassPosition?.replace(/_/g, ' ')}</span> },
    { header: 'Type', accessor: (r: any) => <span className="capitalize">{r.jobType?.replace(/_/g, ' ')}</span> },
    { header: 'NAGS #', accessor: (r: any) => <span className="font-mono text-xs">{r.nagsPartNumber || '-'}</span> },
    { header: 'Total', accessor: (r: any) => <span className="font-medium">${r.totalAmount?.toFixed(2)}</span> },
    { header: 'Customer', accessor: (r: any) => r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '-' },
    { header: 'Insurance', accessor: (r: any) => r.isInsuranceJob ? `Ded: $${r.deductible}` : 'Cash' },
    { header: 'Converted', accessor: (r: any) => r.isConverted ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span> },
    { header: 'Actions', accessor: (r: any) => !r.isConverted && <button onClick={() => convertToWorkOrder(r.id)} className="text-primary-600 text-xs hover:underline">Convert</button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Quote</button>
      </div>
      <DataTable columns={columns} data={quotes} loading={loading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Quote" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Year</label><input type="number" className="input-field" value={form.vehicleYear} onChange={(e) => setForm({ ...form, vehicleYear: Number(e.target.value) })} /></div>
          <div><label className="label">Make</label><input className="input-field" value={form.vehicleMake} onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })} /></div>
          <div><label className="label">Model</label><input className="input-field" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} /></div>
          <div>
            <label className="label">Position</label>
            <select className="input-field" value={form.glassPosition} onChange={(e) => setForm({ ...form, glassPosition: e.target.value })}>
              {['windshield', 'rear', 'front_left', 'front_right', 'rear_left', 'rear_right'].map((p) => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label className="label">NAGS #</label><input className="input-field" value={form.nagsPartNumber} onChange={(e) => setForm({ ...form, nagsPartNumber: e.target.value })} /></div>
          <div><label className="label">Part Cost</label><input type="number" step="0.01" className="input-field" value={form.partCost} onChange={(e) => recalcTotal({ partCost: Number(e.target.value) })} /></div>
          <div><label className="label">Labor</label><input type="number" step="0.01" className="input-field" value={form.laborCost} onChange={(e) => recalcTotal({ laborCost: Number(e.target.value) })} /></div>
          <div><label className="label">Kit</label><input type="number" step="0.01" className="input-field" value={form.kitCost} onChange={(e) => recalcTotal({ kitCost: Number(e.target.value) })} /></div>
          <div><label className="label">Calibration</label><input type="number" step="0.01" className="input-field" value={form.calibrationCost} onChange={(e) => recalcTotal({ calibrationCost: Number(e.target.value) })} /></div>
          <div><label className="label">Discount</label><input type="number" step="0.01" className="input-field" value={form.discount} onChange={(e) => recalcTotal({ discount: Number(e.target.value) })} /></div>
          <div className="col-span-2 p-3 bg-gray-50 rounded-lg text-lg font-bold flex justify-between">
            <span>Total:</span><span>${form.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Create Quote</button>
        </div>
      </Modal>
    </div>
  );
}
