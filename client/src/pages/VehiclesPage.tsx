import { useEffect, useState } from 'react';
import { vehicleAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customerId: '', vin: '', year: new Date().getFullYear(), make: '', model: '', subModel: '', bodyStyle: '', color: '', plateNumber: '', plateState: '' });

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await vehicleAPI.list({ search: search || undefined });
      setVehicles(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      await vehicleAPI.create(form);
      toast.success('Vehicle added');
      setShowCreate(false);
      loadVehicles();
    } catch (err) { toast.error('Failed to add vehicle'); }
  };

  const columns = [
    { header: 'Year/Make/Model', accessor: (r: any) => <span className="font-medium">{r.year} {r.make} {r.model} {r.subModel || ''}</span> },
    { header: 'VIN', accessor: (r: any) => <span className="font-mono text-xs">{r.vin || '-'}</span> },
    { header: 'Color', accessor: (r: any) => r.color || '-' },
    { header: 'Plate', accessor: (r: any) => r.plateNumber ? `${r.plateNumber} (${r.plateState || ''})` : '-' },
    { header: 'Customer', accessor: (r: any) => r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '-' },
    { header: 'Phone', accessor: (r: any) => r.customer?.phone || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Vehicle</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); loadVehicles(); }} className="flex gap-2">
        <input className="input-field w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search VIN, make, model..." />
        <button type="submit" className="btn-secondary">Search</button>
      </form>
      <DataTable columns={columns} data={vehicles} loading={loading} />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Vehicle">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Customer ID</label><input className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required /></div>
          <div><label className="label">Year</label><input type="number" className="input-field" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          <div><label className="label">Make</label><input className="input-field" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required /></div>
          <div><label className="label">Model</label><input className="input-field" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
          <div><label className="label">Sub Model</label><input className="input-field" value={form.subModel} onChange={(e) => setForm({ ...form, subModel: e.target.value })} /></div>
          <div><label className="label">VIN</label><input className="input-field" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></div>
          <div><label className="label">Color</label><input className="input-field" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          <div><label className="label">Plate #</label><input className="input-field" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} /></div>
          <div><label className="label">Plate State</label><input className="input-field" value={form.plateState} onChange={(e) => setForm({ ...form, plateState: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Add Vehicle</button>
        </div>
      </Modal>
    </div>
  );
}
