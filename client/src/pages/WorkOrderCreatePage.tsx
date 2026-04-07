import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrderAPI, customerAPI, vehicleAPI, nagsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const shopId = useAuthStore((s) => s.selectedShopId);
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [nagsParts, setNagsParts] = useState<any[]>([]);
  const [form, setForm] = useState({
    jobType: 'replacement',
    glassPosition: 'windshield',
    serviceLocation: 'mobile',
    serviceAddress: '',
    serviceCity: '',
    serviceState: '',
    serviceZip: '',
    nagsPartNumber: '',
    partDescription: '',
    partType: 'aftermarket',
    retailPrice: 0,
    partCost: 0,
    laborCost: 50,
    moldingCost: 0,
    kitCost: 25,
    calibrationCost: 0,
    otherCharges: 0,
    discount: 0,
    taxAmount: 0,
    totalAmount: 0,
    isInsuranceJob: false,
    insuranceCompanyCode: '',
    claimNumber: '',
    policyNumber: '',
    deductible: 0,
    insurancePays: 0,
    customerPays: 0,
    requiresCalibration: false,
    calibrationType: '',
    csrNotes: '',
  });

  const searchCustomers = async () => {
    try {
      const { data } = await customerAPI.list({ search: customerSearch });
      setCustomers(data.data);
    } catch (err) { toast.error('Search failed'); }
  };

  const selectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    try {
      const { data } = await customerAPI.vehicles(customer.id);
      setVehicles(data.data);
      setStep(2);
    } catch (err) { toast.error('Failed to load vehicles'); }
  };

  const selectVehicle = async (vehicle: any) => {
    setSelectedVehicle(vehicle);
    try {
      const { data } = await nagsAPI.lookup({ year: vehicle.year, make: vehicle.make, model: vehicle.model, position: form.glassPosition });
      setNagsParts(data.data);
    } catch { /* nags lookup optional */ }
    setStep(3);
  };

  const selectPart = (part: any) => {
    const retailPrice = Math.round(part.cost * 1.45 * 100) / 100;
    const total = retailPrice + form.laborCost + form.kitCost;
    setForm({
      ...form,
      nagsPartNumber: part.nagsPartNumber,
      partDescription: part.description,
      partType: part.partType,
      partCost: part.cost,
      retailPrice,
      totalAmount: total,
      customerPays: form.isInsuranceJob ? form.deductible : total,
      insurancePays: form.isInsuranceJob ? total - form.deductible : 0,
    });
  };

  const recalcTotal = (updates: any = {}) => {
    const f = { ...form, ...updates };
    const subtotal = f.retailPrice + f.laborCost + f.moldingCost + f.kitCost + f.calibrationCost + f.otherCharges - f.discount;
    const total = subtotal + f.taxAmount;
    const customerPays = f.isInsuranceJob ? f.deductible : total;
    const insurancePays = f.isInsuranceJob ? total - f.deductible : 0;
    setForm({ ...f, totalAmount: total, customerPays, insurancePays });
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedVehicle) { toast.error('Select customer and vehicle'); return; }
    try {
      const { data } = await workOrderAPI.create({
        shopId: shopId || '',
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
        ...form,
      });
      toast.success(`Work order ${data.data.orderNumber} created!`);
      navigate(`/work-orders/${data.data.id}`);
    } catch (err) {
      toast.error('Failed to create work order');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/work-orders')} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-2xl font-bold">New Work Order</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-6">
        {['Customer', 'Vehicle', 'Job Details', 'Pricing', 'Review'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium' : 'text-gray-500'}`}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Customer */}
      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Select Customer</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" className="input-field flex-1" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name, phone, or email" onKeyDown={(e) => e.key === 'Enter' && searchCustomers()} />
            <button onClick={searchCustomers} className="btn-primary">Search</button>
          </div>
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex justify-between">
                <div>
                  <p className="font-medium">{c.firstName} {c.lastName}</p>
                  <p className="text-sm text-gray-500">{c.phone} {c.email && `- ${c.email}`}</p>
                </div>
                <span className="text-sm text-gray-400">{c._count?.workOrders || 0} orders</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Vehicle */}
      {step === 2 && selectedCustomer && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Select Vehicle for {selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div key={v.id} onClick={() => selectVehicle(v)} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <p className="font-medium">{v.year} {v.make} {v.model} {v.subModel}</p>
                <p className="text-sm text-gray-500">VIN: {v.vin || 'N/A'} | Color: {v.color || 'N/A'}</p>
              </div>
            ))}
            {vehicles.length === 0 && <p className="text-gray-500">No vehicles found. Add one first.</p>}
          </div>
          <button onClick={() => setStep(1)} className="btn-secondary mt-4">Back</button>
        </div>
      )}

      {/* Step 3: Job Details */}
      {step === 3 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Job Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job Type</label>
              <select className="input-field" value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}>
                {['replacement', 'repair', 'calibration', 'tint', 'chip_repair', 'rear_glass', 'side_glass', 'quarter_glass', 'sunroof'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Glass Position</label>
              <select className="input-field" value={form.glassPosition} onChange={(e) => setForm({ ...form, glassPosition: e.target.value })}>
                {['windshield', 'rear', 'front_left', 'front_right', 'rear_left', 'rear_right', 'quarter_left', 'quarter_right', 'sunroof'].map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Service Location</label>
              <select className="input-field" value={form.serviceLocation} onChange={(e) => setForm({ ...form, serviceLocation: e.target.value })}>
                <option value="mobile">Mobile (Customer Location)</option>
                <option value="shop">In-Shop</option>
                <option value="customer">Customer Address</option>
              </select>
            </div>
            <div>
              <label className="label">Part Type</label>
              <select className="input-field" value={form.partType} onChange={(e) => setForm({ ...form, partType: e.target.value })}>
                {['aftermarket', 'oem', 'oee', 'dealer', 'used'].map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">NAGS Part Number</label>
              <input className="input-field" value={form.nagsPartNumber} onChange={(e) => setForm({ ...form, nagsPartNumber: e.target.value })} placeholder="e.g. FW04567" />
            </div>
            {nagsParts.length > 0 && (
              <div className="col-span-2">
                <label className="label">Matching NAGS Parts</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nagsParts.map((p) => (
                    <div key={p.id} onClick={() => selectPart(p)} className="p-2 border rounded text-sm cursor-pointer hover:bg-blue-50 flex justify-between">
                      <span className="font-mono">{p.nagsPartNumber} - {p.description}</span>
                      <span>${p.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isInsuranceJob} onChange={(e) => { setForm({ ...form, isInsuranceJob: e.target.checked }); }} className="rounded" />
                <span className="text-sm font-medium">Insurance Job</span>
              </label>
            </div>
            {form.isInsuranceJob && (
              <>
                <div>
                  <label className="label">Insurance Company</label>
                  <input className="input-field" value={form.insuranceCompanyCode} onChange={(e) => setForm({ ...form, insuranceCompanyCode: e.target.value })} />
                </div>
                <div>
                  <label className="label">Claim #</label>
                  <input className="input-field" value={form.claimNumber} onChange={(e) => setForm({ ...form, claimNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Policy #</label>
                  <input className="input-field" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Deductible</label>
                  <input type="number" className="input-field" value={form.deductible} onChange={(e) => recalcTotal({ deductible: Number(e.target.value) })} />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="label">CSR Notes</label>
              <textarea className="input-field" rows={2} value={form.csrNotes} onChange={(e) => setForm({ ...form, csrNotes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={() => { recalcTotal(); setStep(4); }} className="btn-primary">Next: Pricing</button>
          </div>
        </div>
      )}

      {/* Step 4: Pricing */}
      {step === 4 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Retail Price (Glass)', key: 'retailPrice' },
              { label: 'Part Cost', key: 'partCost' },
              { label: 'Labor', key: 'laborCost' },
              { label: 'Molding/Trim', key: 'moldingCost' },
              { label: 'Urethane Kit', key: 'kitCost' },
              { label: 'Calibration', key: 'calibrationCost' },
              { label: 'Other Charges', key: 'otherCharges' },
              { label: 'Discount', key: 'discount' },
              { label: 'Tax', key: 'taxAmount' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type="number" step="0.01" className="input-field" value={(form as any)[key]} onChange={(e) => recalcTotal({ [key]: Number(e.target.value) })} />
              </div>
            ))}
            <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${form.totalAmount.toFixed(2)}</span>
              </div>
              {form.isInsuranceJob && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-blue-600"><span>Insurance Pays:</span><span>${form.insurancePays.toFixed(2)}</span></div>
                  <div className="flex justify-between text-amber-600"><span>Customer Pays:</span><span>${form.customerPays.toFixed(2)}</span></div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(5)} className="btn-primary">Review & Create</button>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Review Work Order</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Customer:</span> {selectedCustomer?.firstName} {selectedCustomer?.lastName}</div>
            <div><span className="text-gray-500">Vehicle:</span> {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}</div>
            <div><span className="text-gray-500">Job Type:</span> {form.jobType}</div>
            <div><span className="text-gray-500">Glass:</span> {form.glassPosition}</div>
            <div><span className="text-gray-500">NAGS #:</span> {form.nagsPartNumber || 'N/A'}</div>
            <div><span className="text-gray-500">Total:</span> <strong>${form.totalAmount.toFixed(2)}</strong></div>
            {form.isInsuranceJob && <div className="col-span-2"><span className="text-gray-500">Insurance:</span> {form.insuranceCompanyCode} - Claim #{form.claimNumber} - Deductible ${form.deductible}</div>}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(4)} className="btn-secondary">Back</button>
            <button onClick={handleSubmit} className="btn-success text-lg px-8">Create Work Order</button>
          </div>
        </div>
      )}
    </div>
  );
}
