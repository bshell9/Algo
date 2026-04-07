import { useEffect, useState } from 'react';
import { nagsAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function NAGSCatalogPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [filters, setFilters] = useState({ make: '', model: '', year: '', position: '', partType: '' });
  const [loading, setLoading] = useState(true);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

  useEffect(() => { loadParts(); loadMakes(); }, [pagination.page]);

  const loadParts = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page };
      if (search) params.search = search;
      if (filters.make) params.make = filters.make;
      if (filters.model) params.model = filters.model;
      if (filters.year) params.year = filters.year;
      if (filters.position) params.position = filters.position;
      if (filters.partType) params.partType = filters.partType;
      const { data } = await nagsAPI.searchParts(params);
      setParts(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadMakes = async () => {
    try {
      const { data } = await nagsAPI.makes();
      setMakes(data.data);
    } catch { /* ok */ }
  };

  const loadModels = async (make: string) => {
    try {
      const { data } = await nagsAPI.models(make);
      setModels(data.data);
    } catch { /* ok */ }
  };

  const handleMakeChange = (make: string) => {
    setFilters({ ...filters, make, model: '' });
    if (make) loadModels(make);
    else setModels([]);
  };

  const handleLookup = async () => {
    if (!filters.year || !filters.make || !filters.model) {
      toast.error('Year, make, and model required for lookup');
      return;
    }
    try {
      const { data } = await nagsAPI.lookup({ year: filters.year, make: filters.make, model: filters.model, position: filters.position || undefined });
      setLookupResults(data.data);
      setShowLookup(true);
    } catch (err) { toast.error('Lookup failed'); }
  };

  const columns = [
    { header: 'NAGS #', accessor: (r: any) => <span className="font-mono font-medium text-primary-600">{r.nagsPartNumber}</span> },
    { header: 'Description', accessor: (r: any) => r.description },
    { header: 'Type', accessor: (r: any) => <span className="uppercase text-xs font-medium">{r.partType}</span> },
    { header: 'Position', accessor: (r: any) => <span className="capitalize">{r.glassPosition?.replace(/_/g, ' ') || '-'}</span> },
    { header: 'Fits', accessor: (r: any) => r.fitsMake ? `${r.fitsYearFrom}-${r.fitsYearTo} ${r.fitsMake} ${r.fitsModel || ''}` : '-' },
    { header: 'Features', accessor: (r: any) => (
      <div className="flex gap-1 flex-wrap">
        {r.tinted && <span className="text-xs bg-gray-100 px-1 rounded">Tinted</span>}
        {r.heated && <span className="text-xs bg-orange-100 px-1 rounded">Heated</span>}
        {r.sensor && <span className="text-xs bg-blue-100 px-1 rounded">Sensor</span>}
        {r.adasCompatible && <span className="text-xs bg-purple-100 px-1 rounded">ADAS</span>}
        {r.antenna && <span className="text-xs bg-green-100 px-1 rounded">Antenna</span>}
      </div>
    )},
    { header: 'Cost', accessor: (r: any) => `$${r.cost?.toFixed(2)}` },
    { header: 'List', accessor: (r: any) => `$${r.listPrice?.toFixed(2)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">NAGS Parts Catalog</h1>
        <button onClick={handleLookup} className="btn-primary">Vehicle Glass Lookup</button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="label text-xs">Search</label>
            <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Part # or description" />
          </div>
          <div>
            <label className="label text-xs">Make</label>
            <select className="input-field" value={filters.make} onChange={(e) => handleMakeChange(e.target.value)}>
              <option value="">All Makes</option>
              {makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Model</label>
            <select className="input-field" value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })}>
              <option value="">All Models</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Year</label>
            <input type="number" className="input-field" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} placeholder="e.g. 2024" />
          </div>
          <div>
            <label className="label text-xs">Position</label>
            <select className="input-field" value={filters.position} onChange={(e) => setFilters({ ...filters, position: e.target.value })}>
              <option value="">All</option>
              {['windshield', 'rear', 'front_left', 'front_right', 'rear_left', 'rear_right'].map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setPagination((p) => ({ ...p, page: 1 })); loadParts(); }} className="btn-primary w-full">Filter</button>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={parts} loading={loading} />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />

      {/* Lookup Results Modal */}
      <Modal isOpen={showLookup} onClose={() => setShowLookup(false)} title="Glass Lookup Results" size="xl">
        <p className="text-sm text-gray-500 mb-4">
          {filters.year} {filters.make} {filters.model} {filters.position ? `- ${filters.position}` : ''}
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {lookupResults.map((part) => (
            <div key={part.id} className="p-3 border rounded-lg">
              <div className="flex justify-between">
                <div>
                  <span className="font-mono font-medium text-primary-600">{part.nagsPartNumber}</span>
                  <span className="ml-2 uppercase text-xs bg-gray-100 px-2 py-0.5 rounded">{part.partType}</span>
                </div>
                <span className="font-medium">${part.cost?.toFixed(2)} cost / ${part.listPrice?.toFixed(2)} list</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{part.description}</p>
              {part.shopInventory?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {part.shopInventory.map((inv: any) => (
                    <span key={inv.id} className={`text-xs px-2 py-1 rounded ${inv.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {inv.shop?.code}: {inv.quantity} in stock
                    </span>
                  ))}
                </div>
              )}
              {part.moldingKits?.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  Molding: {part.moldingKits.map((m: any) => `${m.moldingPartNumber} ($${m.cost})`).join(', ')}
                </div>
              )}
            </div>
          ))}
          {lookupResults.length === 0 && <p className="text-gray-500">No parts found for this vehicle</p>}
        </div>
      </Modal>
    </div>
  );
}
