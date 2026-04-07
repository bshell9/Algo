import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrderAPI, customerAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const TABS = ['Customer', 'Auto', 'Glass', 'Additional Parts', 'Schedule', 'Payments', 'Notes', 'Tax', 'Communications'];
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const shopId = useAuthStore((s) => s.selectedShopId);
  const [activeTab, setActiveTab] = useState('Customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Customer form
  const [cust, setCust] = useState({
    salutation: '', firstName: '', lastName: '',
    address: '', zipCode: '', city: '', state: '',
    phone: '', cell: '', email: '',
    terms: 'NET 10', advertisingSource: '', jobLocation: 'shop',
    optOutEmail: false, optOutSurvey: false,
  });

  // Bill To / EDI
  const [billTo, setBillTo] = useState({
    search: '', name: '', ediCode: 'None',
    agentSearch: '', agentName: '', referredBy: '',
    customerPO: '', custJobNumber: '',
  });

  // Vehicle
  const [vehicle, setVehicle] = useState({
    year: new Date().getFullYear(), make: '', model: '', subModel: '',
    bodyStyle: '', color: '', vin: '', plateNumber: '', plateState: '',
  });

  // Glass / Pricing
  const [glass, setGlass] = useState({
    nagsPartNumber: '', partDescription: '', partType: 'aftermarket',
    jobType: 'replacement', glassPosition: 'windshield',
    partCost: 0, retailPrice: 0, laborCost: 50, moldingCost: 0, kitCost: 25,
    calibrationCost: 0, otherCharges: 0, discount: 0, taxAmount: 0, totalAmount: 0,
    isInsuranceJob: false, deductible: 0, insurancePays: 0, customerPays: 0,
    requiresCalibration: false, claimNumber: '', policyNumber: '', insuranceCompanyCode: '',
  });

  // Schedule
  const [sched, setSched] = useState({
    scheduledDate: '', startTime: '', endTime: '', csrNotes: '', techNotes: '',
  });

  const searchCustomers = async () => {
    if (!customerSearch) return;
    try {
      const { data } = await customerAPI.list({ search: customerSearch });
      setCustomerResults(data.data);
    } catch { toast.error('Search failed'); }
  };

  const selectCustomer = async (c: any) => {
    setSelectedCustomerId(c.id);
    setCust({
      ...cust,
      firstName: c.firstName, lastName: c.lastName, address: c.address || '',
      zipCode: c.zip || '', city: c.city || '', state: c.state || '',
      phone: c.phone || '', cell: c.altPhone || '', email: c.email || '',
      advertisingSource: c.source || '',
    });
    setCustomerResults([]);
    setCustomerSearch('');
    // Load vehicles
    try {
      const { data } = await customerAPI.vehicles(c.id);
      if (data.data.length > 0) {
        const v = data.data[0];
        setSelectedVehicleId(v.id);
        setVehicle({ year: v.year, make: v.make, model: v.model, subModel: v.subModel || '', bodyStyle: v.bodyStyle || '', color: v.color || '', vin: v.vin || '', plateNumber: v.plateNumber || '', plateState: v.plateState || '' });
      }
    } catch { /* ok */ }
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setCust({ salutation: '', firstName: '', lastName: '', address: '', zipCode: '', city: '', state: '', phone: '', cell: '', email: '', terms: 'NET 10', advertisingSource: '', jobLocation: 'shop', optOutEmail: false, optOutSurvey: false });
  };

  const recalcTotal = (updates: any = {}) => {
    const g = { ...glass, ...updates };
    const retail = g.partCost > 0 ? Math.round(g.partCost * 1.45 * 100) / 100 : g.retailPrice;
    const sub = retail + g.laborCost + g.moldingCost + g.kitCost + g.calibrationCost + g.otherCharges - g.discount;
    const total = sub + g.taxAmount;
    const customerPays = g.isInsuranceJob ? g.deductible : total;
    const insurancePays = g.isInsuranceJob ? total - g.deductible : 0;
    setGlass({ ...g, retailPrice: retail, totalAmount: total, customerPays, insurancePays });
  };

  const handleSave = async () => {
    if (!selectedCustomerId) { toast.error('Select or create a customer first'); return; }
    if (!selectedVehicleId) { toast.error('Vehicle required'); return; }
    try {
      const { data } = await workOrderAPI.create({
        shopId: shopId || '', customerId: selectedCustomerId, vehicleId: selectedVehicleId,
        ...glass, serviceLocation: cust.jobLocation,
        csrNotes: sched.csrNotes, scheduledDate: sched.scheduledDate || undefined,
        scheduledTime: sched.startTime || undefined,
      });
      toast.success(`Work order ${data.data.orderNumber} created!`);
      navigate(`/work-orders/${data.data.id}`);
    } catch { toast.error('Failed to create work order'); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="ga-tabs">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`ga-tab ${activeTab === tab ? 'active' : ''}`}>{tab}</button>
        ))}
        <div className="ml-auto px-3">
          <button onClick={handleSave} className="btn-ga-action">Save Work Order</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">

            {/* ═══ CUSTOMER TAB ═══ */}
            {activeTab === 'Customer' && (
              <div className="flex gap-6">
                {/* LEFT: Customer Info */}
                <div className="flex-1" style={{ maxWidth: '520px' }}>
                  {/* Search */}
                  <div className="flex items-center gap-2 mb-3 relative">
                    <input className="input-ga flex-1" placeholder="CUSTOMER SEARCH" value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomers()} />
                    <button onClick={searchCustomers} className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#1a7a1a' }}>+</button>
                    <button onClick={clearCustomer} className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#cc3333' }}>X</button>
                    {customerResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border shadow-lg z-20 max-h-48 overflow-y-auto" style={{ borderColor: '#c0c0c0' }}>
                        {customerResults.map((c) => (
                          <div key={c.id} onClick={() => selectCustomer(c)} className="px-3 py-2 hover:bg-green-50 cursor-pointer text-xs border-b flex justify-between">
                            <span className="font-medium">{c.firstName} {c.lastName}</span>
                            <span className="text-gray-400">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="font-bold text-sm mb-2" style={{ color: '#1a7a1a' }}>Cash Customer</div>

                  {/* Salutation / Name */}
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-2"><label className="label-ga">Salutation</label><select className="select-ga" value={cust.salutation} onChange={(e) => setCust({ ...cust, salutation: e.target.value })}><option value=""></option><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option></select></div>
                    <div className="col-span-5"><label className="label-ga">First Name</label><input className="input-ga" value={cust.firstName} onChange={(e) => setCust({ ...cust, firstName: e.target.value })} /></div>
                    <div className="col-span-5"><label className="label-ga">Last Name</label><input className="input-ga" value={cust.lastName} onChange={(e) => setCust({ ...cust, lastName: e.target.value })} /></div>
                  </div>

                  {/* Address / Zip */}
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-8"><label className="label-ga">Address</label><input className="input-ga" placeholder="ADDRESS" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} /></div>
                    <div className="col-span-4"><label className="label-ga">Zip Code</label><input className="input-ga" placeholder="ZIP CODE" value={cust.zipCode} onChange={(e) => setCust({ ...cust, zipCode: e.target.value })} /></div>
                  </div>

                  {/* City / State / Validate */}
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5"><label className="label-ga">City</label><input className="input-ga" placeholder="CITY" value={cust.city} onChange={(e) => setCust({ ...cust, city: e.target.value })} /></div>
                    <div className="col-span-4"><label className="label-ga">State</label><select className="select-ga" value={cust.state} onChange={(e) => setCust({ ...cust, state: e.target.value })}><option value=""></option>{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="col-span-3 flex items-end"><button className="btn-ga-outline w-full">Validate</button></div>
                  </div>

                  {/* Phone / Cell */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div><label className="label-ga">Phone</label><input className="input-ga" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
                    <div><label className="label-ga">Cell</label><input className="input-ga" value={cust.cell} onChange={(e) => setCust({ ...cust, cell: e.target.value })} /></div>
                  </div>

                  {/* Email / Terms / History */}
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5"><label className="label-ga">Email</label><input className="input-ga" placeholder="Email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} /></div>
                    <div className="col-span-1 flex items-end justify-center"><button className="text-lg" style={{ color: '#1a7a1a' }}>&#9993;</button></div>
                    <div className="col-span-3"><label className="label-ga">Terms</label><select className="select-ga" value={cust.terms} onChange={(e) => setCust({ ...cust, terms: e.target.value })}><option>NET 10</option><option>NET 30</option><option>COD</option><option>Due on Receipt</option></select></div>
                    <div className="col-span-3 flex items-end"><button className="btn-ga-outline w-full">History</button></div>
                  </div>

                  {/* Ad Source / Job Location */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div><label className="label-ga">Advertising Source</label><select className="select-ga" value={cust.advertisingSource} onChange={(e) => setCust({ ...cust, advertisingSource: e.target.value })}><option value="">Select</option><option value="walk_in">Walk In</option><option value="phone">Phone</option><option value="website">Website</option><option value="insurance_referral">Insurance Referral</option><option value="fleet">Fleet</option><option value="dealer">Dealer</option><option value="repeat">Repeat</option><option value="referral">Referral</option></select></div>
                    <div className="flex items-end gap-1"><div className="flex-1"><label className="label-ga">Job Location</label><select className="select-ga" value={cust.jobLocation} onChange={(e) => setCust({ ...cust, jobLocation: e.target.value })}><option value="shop">Shop (waiting)</option><option value="mobile">Mobile</option><option value="customer">Customer</option></select></div><button className="text-lg mb-0.5" style={{ color: '#1a7a1a' }}>&#128279;</button></div>
                  </div>

                  {/* Opt-out */}
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cust.optOutEmail} onChange={(e) => setCust({ ...cust, optOutEmail: e.target.checked })} /> Opt Out Email</label>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cust.optOutSurvey} onChange={(e) => setCust({ ...cust, optOutSurvey: e.target.checked })} /> Opt Out Email Survey</label>
                  </div>
                </div>

                {/* RIGHT: Bill To / EDI / Agent */}
                <div className="flex-1" style={{ maxWidth: '480px' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#1a7a1a' }}>Bill To</div>
                  <div className="flex items-center gap-2 mb-2">
                    <input className="input-ga flex-1" placeholder="BILL TO SEARCH" value={billTo.search} onChange={(e) => setBillTo({ ...billTo, search: e.target.value })} />
                    <button className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#1a7a1a' }}>+</button>
                    <button className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#cc3333' }}>X</button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1"><label className="label-ga">Name</label><input className="input-ga" value={billTo.name} onChange={(e) => setBillTo({ ...billTo, name: e.target.value })} /></div>
                    <button className="mt-4 text-lg" style={{ color: '#1a7a1a' }}>&#9998;</button>
                    <button className="mt-4 text-lg" style={{ color: '#666' }}>&#128203;</button>
                  </div>

                  <label className="label-ga">EDI Code</label>
                  <div className="flex items-center gap-2 mb-4">
                    <select className="select-ga flex-1" value={billTo.ediCode} onChange={(e) => setBillTo({ ...billTo, ediCode: e.target.value })}>
                      <option>None</option><option>SAF - Safelite Solutions</option><option>LYN - Lynx Services</option><option>HRS - Harmon Solutions</option><option>STA - State Farm</option><option>ALL - Allstate</option><option>PRG - Progressive</option><option>GEI - GEICO</option><option>USR - USAA</option><option>FRM - Farmers</option><option>LIB - Liberty Mutual</option><option>NAT - Nationwide</option>
                    </select>
                    <button className="text-gray-400">&#10005;</button>
                    <button className="btn-ga-green">Claim</button>
                    <button className="btn-ga-green">ClaimLaunch</button>
                    <button className="text-lg" style={{ color: '#1a7a1a' }}>&#9993;</button>
                  </div>

                  <div className="font-bold text-sm mb-2" style={{ color: '#1a7a1a' }}>Agent</div>
                  <div className="flex items-center gap-2 mb-2">
                    <input className="input-ga flex-1" placeholder="AGENT SEARCH" value={billTo.agentSearch} onChange={(e) => setBillTo({ ...billTo, agentSearch: e.target.value })} />
                    <button className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#1a7a1a' }}>+</button>
                    <button className="w-6 h-6 rounded text-white text-xs flex items-center justify-center" style={{ background: '#cc3333' }}>X</button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1"><label className="label-ga">Name</label><input className="input-ga" value={billTo.agentName} onChange={(e) => setBillTo({ ...billTo, agentName: e.target.value })} /></div>
                    <button className="mt-4 text-lg" style={{ color: '#1a7a1a' }}>&#9998;</button>
                    <button className="mt-4 text-lg" style={{ color: '#666' }}>&#128203;</button>
                  </div>

                  <label className="label-ga">Referred By</label>
                  <select className="select-ga mb-3" value={billTo.referredBy} onChange={(e) => setBillTo({ ...billTo, referredBy: e.target.value })}><option value="">Select</option></select>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-ga">Customer PO/RO</label><input className="input-ga" placeholder="PO NO." value={billTo.customerPO} onChange={(e) => setBillTo({ ...billTo, customerPO: e.target.value })} /></div>
                    <div><label className="label-ga">Cust. Job #</label><input className="input-ga" placeholder="JOB NUMBER" value={billTo.custJobNumber} onChange={(e) => setBillTo({ ...billTo, custJobNumber: e.target.value })} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ AUTO TAB ═══ */}
            {activeTab === 'Auto' && (
              <div className="grid grid-cols-3 gap-4 max-w-4xl">
                <div><label className="label-ga">Year</label><input type="number" className="input-ga" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: Number(e.target.value) })} /></div>
                <div><label className="label-ga">Make</label><input className="input-ga" value={vehicle.make} onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })} /></div>
                <div><label className="label-ga">Model</label><input className="input-ga" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} /></div>
                <div><label className="label-ga">Sub Model</label><input className="input-ga" value={vehicle.subModel} onChange={(e) => setVehicle({ ...vehicle, subModel: e.target.value })} /></div>
                <div><label className="label-ga">Body Style</label><input className="input-ga" value={vehicle.bodyStyle} onChange={(e) => setVehicle({ ...vehicle, bodyStyle: e.target.value })} /></div>
                <div><label className="label-ga">Color</label><input className="input-ga" value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} /></div>
                <div className="col-span-2"><label className="label-ga">VIN</label><input className="input-ga font-mono" value={vehicle.vin} onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })} /></div>
                <div><label className="label-ga">Plate</label><input className="input-ga" value={vehicle.plateNumber} onChange={(e) => setVehicle({ ...vehicle, plateNumber: e.target.value })} /></div>
              </div>
            )}

            {/* ═══ GLASS TAB ═══ */}
            {activeTab === 'Glass' && (
              <div>
                <div className="flex gap-2 mb-3">
                  <button className="btn-ga-green">Glass Options</button>
                  <button className="btn-ga-green">VinPro Search</button>
                  <button className="btn-ga-green">ScanPro Check</button>
                  <button className="btn-ga-red">Repairs</button>
                  <div className="ml-auto flex items-center gap-2">
                    <label className="label-ga">Part Number</label>
                    <input className="input-ga w-48" value={glass.nagsPartNumber} onChange={(e) => setGlass({ ...glass, nagsPartNumber: e.target.value })} />
                  </div>
                </div>
                <div className="ga-panel p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="label-ga">NAGS Part #</label><input className="input-ga font-mono" value={glass.nagsPartNumber} onChange={(e) => setGlass({ ...glass, nagsPartNumber: e.target.value })} /></div>
                    <div><label className="label-ga">Part Cost</label><input type="number" step="0.01" className="input-ga" value={glass.partCost} onChange={(e) => recalcTotal({ partCost: Number(e.target.value) })} /></div>
                    <div><label className="label-ga">Labor</label><input type="number" step="0.01" className="input-ga" value={glass.laborCost} onChange={(e) => recalcTotal({ laborCost: Number(e.target.value) })} /></div>
                    <div><label className="label-ga">Molding</label><input type="number" step="0.01" className="input-ga" value={glass.moldingCost} onChange={(e) => recalcTotal({ moldingCost: Number(e.target.value) })} /></div>
                    <div><label className="label-ga">Kit</label><input type="number" step="0.01" className="input-ga" value={glass.kitCost} onChange={(e) => recalcTotal({ kitCost: Number(e.target.value) })} /></div>
                    <div><label className="label-ga">Calibration</label><input type="number" step="0.01" className="input-ga" value={glass.calibrationCost} onChange={(e) => recalcTotal({ calibrationCost: Number(e.target.value) })} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SCHEDULE TAB ═══ */}
            {activeTab === 'Schedule' && (
              <div className="grid grid-cols-2 gap-6 max-w-3xl">
                <div><label className="label-ga">Sched. Date</label><input type="date" className="input-ga" value={sched.scheduledDate} onChange={(e) => setSched({ ...sched, scheduledDate: e.target.value })} /></div>
                <div><label className="label-ga">Start Time</label><input type="time" className="input-ga" value={sched.startTime} onChange={(e) => setSched({ ...sched, startTime: e.target.value })} /></div>
              </div>
            )}

            {/* ═══ NOTES TAB ═══ */}
            {activeTab === 'Notes' && (
              <div className="max-w-3xl space-y-3">
                <div><label className="label-ga">Internal Notes</label><textarea className="ga-notes-box" style={{ minHeight: '120px' }} value={sched.csrNotes} onChange={(e) => setSched({ ...sched, csrNotes: e.target.value })} /></div>
                <div><label className="label-ga">Work to Perform</label><textarea className="ga-notes-box" style={{ minHeight: '120px' }} value={sched.techNotes} onChange={(e) => setSched({ ...sched, techNotes: e.target.value })} /></div>
                <div><label className="label-ga">Print Notes</label><textarea className="ga-notes-box" style={{ minHeight: '120px' }} /></div>
              </div>
            )}

            {/* ═══ COMMUNICATIONS TAB ═══ */}
            {activeTab === 'Communications' && (
              <div>
                <table className="ga-grid">
                  <thead><tr style={{ background: '#1a7a1a' }}><th className="!text-white">&#9993;</th><th className="!text-white">From</th><th className="!text-white">To</th><th className="!text-white">Subject</th><th className="!text-white">Message Type</th><th className="!text-white">Direction</th><th className="!text-white">Status</th><th className="!text-white">Date</th></tr></thead>
                  <tbody><tr><td colSpan={8} className="text-center py-8 text-gray-400">No messages</td></tr></tbody>
                </table>
              </div>
            )}

            {activeTab === 'Payments' && <div className="text-gray-500 p-4">Save the work order first to process payments.</div>}
            {activeTab === 'Tax' && <div className="max-w-sm"><label className="label-ga">Tax Rate</label><input className="input-ga" defaultValue="8.25%" /><label className="label-ga mt-3">Tax Amount</label><input className="input-ga" value={`$${glass.taxAmount.toFixed(2)}`} readOnly /></div>}
            {activeTab === 'Additional Parts' && <div className="text-gray-500 p-4">Additional parts can be added after saving.</div>}
          </div>

          {/* Bottom Line Items */}
          <div className="border-t" style={{ borderColor: '#c0c0c0', minHeight: '120px' }}>
            <div className="overflow-x-auto">
              <table className="ga-lineitems">
                <thead><tr>
                  <th style={{ width: '30px' }}><button className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#1a7a1a' }}>+</button></th>
                  <th>Item</th><th>Part Number</th><th>Qty</th><th>Dimension</th><th>Description</th><th>Note</th><th>ADAS</th><th>Total</th><th>List Price</th><th>Material</th><th>Mat. Rate</th><th>Labor</th><th>Lab. Rate</th><th>Cost</th><th>Ext. Cost</th><th>Lab Cost</th><th>Lab Ext Cost</th><th>Cost Cd</th><th>Category</th><th>Bin</th><th>Manual</th><th>Vendor</th><th>CO</th>
                </tr></thead>
                <tbody>
                  {glass.nagsPartNumber ? (
                    <tr>
                      <td><div className="flex items-center gap-1"><button className="text-gray-400">&#9776;</button><button className="w-4 h-4 rounded-full text-white" style={{ background: '#cc3333', fontSize: '8px' }}>X</button></div></td>
                      <td className="text-red-600 font-medium">1.01</td>
                      <td className="font-mono">{glass.nagsPartNumber}</td>
                      <td>1</td><td></td>
                      <td>{glass.partDescription || glass.nagsPartNumber}</td>
                      <td><span className="px-2 py-0.5 rounded text-white text-xs" style={{ background: '#1a7a1a' }}>Notes</span></td>
                      <td>{glass.requiresCalibration ? '⚠' : ''}</td>
                      <td className="text-right">${glass.totalAmount.toFixed(2)}</td>
                      <td className="text-right">${glass.retailPrice.toFixed(2)}</td>
                      <td className="text-right">${glass.retailPrice.toFixed(2)}</td>
                      <td>45.00</td>
                      <td className="text-right">${glass.laborCost.toFixed(2)}</td>
                      <td>150.00</td>
                      <td className="text-right">${glass.partCost.toFixed(2)}</td>
                      <td>$0.00</td><td>$0.00</td><td>$0.00</td><td>V</td><td>WINDSHIELD</td><td></td><td></td><td></td><td>0</td>
                    </tr>
                  ) : (
                    <tr><td colSpan={24} className="text-center py-4 text-gray-400">Add glass parts from the Glass tab</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Pricing Sidebar */}
        <div className="ga-pricing-panel flex flex-col" style={{ width: '240px' }}>
          <div className="p-3 border-b" style={{ borderColor: '#c0c0c0' }}>
            <div className="text-lg font-bold" style={{ color: '#1a7a1a' }}>New Quote</div>
            <div className="text-xs text-gray-500">{new Date().toLocaleDateString()}</div>
            <div className="text-sm font-medium mt-1">Unscheduled</div>
          </div>
          <div className="p-3 border-b" style={{ borderColor: '#c0c0c0' }}>
            <div className="label-ga">Price Level</div>
            <select className="select-ga"><option>CASH</option><option>HANOVER</option><option>BEST CHEVROLET</option></select>
            <div className="label-ga mt-2">Store</div>
            <select className="select-ga"><option>1 ALLSTATE AUTO GLASS - HOLBROOK</option></select>
            <div className="label-ga mt-2">Sched. Status</div>
            <select className="select-ga"><option>APPT</option><option>WILL CALL</option><option>SCHEDULED</option></select>
          </div>
          <div className="p-3 border-b flex flex-wrap gap-2" style={{ borderColor: '#c0c0c0' }}>
            <button className="btn-ga-green text-xs">E-Orders</button>
            <button className="btn-ga-green text-xs">Profit Check</button>
            <button className="btn-ga-outline text-xs">Create P.O.</button>
          </div>
          <div className="p-2 flex-1">
            <div className="ga-pricing-row"><span className="ga-pricing-label">Material</span><span className="ga-pricing-value">${glass.retailPrice.toFixed(2)}</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">Labor</span><span className="ga-pricing-value">${glass.laborCost.toFixed(2)}</span></div>
            <div className="ga-pricing-row border-t mt-1 pt-1" style={{ borderColor: '#ddd' }}><span className="ga-pricing-label">Subtotal</span><span className="ga-pricing-value">${(glass.totalAmount - glass.taxAmount).toFixed(2)}</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">Tax</span><span className="ga-pricing-value">${glass.taxAmount.toFixed(2)}</span></div>
            <div className="ga-pricing-row font-bold border-t mt-1 pt-1" style={{ borderColor: '#999' }}><span className="ga-pricing-label">Total</span><span className="ga-pricing-total">${glass.totalAmount.toFixed(2)}</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">Payments</span><span className="ga-pricing-value">$0.00</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">AR Pmts</span><span className="ga-pricing-value">$0.00</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">Bill-to Pmts</span><span className="ga-pricing-value">$0.00</span></div>
            <div className="ga-pricing-row"><span className="ga-pricing-label">Deductible</span><span className="ga-pricing-value">${glass.deductible.toFixed(2)}</span></div>
            <div className="ga-pricing-row border-t mt-1 pt-1" style={{ borderColor: '#999' }}><span className="ga-pricing-label">Balance</span><span className="ga-pricing-value">${glass.customerPays.toFixed(2)}</span></div>
            <div className="ga-pricing-row font-bold"><span className="ga-pricing-label">Bill-To Balance</span><span className="ga-pricing-total">${glass.totalAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
