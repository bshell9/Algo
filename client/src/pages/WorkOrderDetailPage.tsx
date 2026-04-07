import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderAPI, invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';

const TABS = ['Customer', 'Auto', 'Glass', 'Additional Parts', 'Schedule', 'Payments', 'Notes', 'Tax', 'Communications'];

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Glass');

  useEffect(() => { loadOrder(); }, [id]);

  const loadOrder = async () => {
    try {
      const { data } = await workOrderAPI.get(id!);
      setOrder(data.data);
    } catch { toast.error('Failed to load work order'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (status: string) => {
    try {
      await workOrderAPI.updateStatus(id!, status);
      toast.success(`Status: ${status.replace(/_/g, ' ')}`);
      loadOrder();
    } catch { toast.error('Failed'); }
  };

  const createInvoice = async () => {
    try {
      const { data } = await invoiceAPI.createFromWorkOrder(id!);
      toast.success('Invoice created');
      navigate(`/invoices/${data.data.id}`);
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Not found</div>;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Sub-tabs (Customer | Auto | Glass | Schedule | ...) ─── */}
      <div className="ga-tabs">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`ga-tab ${activeTab === tab ? 'active' : ''}`}>{tab}</button>
        ))}
      </div>

      {/* ─── Main Content Area: left content + right pricing sidebar ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Content Area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'Customer' && <CustomerTab order={order} />}
            {activeTab === 'Auto' && <AutoTab order={order} />}
            {activeTab === 'Glass' && <GlassTab order={order} />}
            {activeTab === 'Schedule' && <ScheduleTab order={order} updateStatus={updateStatus} />}
            {activeTab === 'Payments' && <PaymentsTab order={order} createInvoice={createInvoice} />}
            {activeTab === 'Notes' && <NotesTab order={order} />}
            {activeTab === 'Additional Parts' && <div className="p-4 text-gray-500">Additional parts management</div>}
            {activeTab === 'Tax' && <TaxTab order={order} />}
            {activeTab === 'Communications' && <div className="p-4 text-gray-500">Communication log</div>}
          </div>

          {/* ─── Bottom Line Items Grid ─── */}
          <div className="border-t" style={{ borderColor: '#c0c0c0', minHeight: '180px' }}>
            <LineItemsGrid order={order} />
          </div>
        </div>

        {/* ─── Right Pricing Sidebar ─── */}
        <PricingSidebar order={order} updateStatus={updateStatus} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RIGHT SIDEBAR - Pricing Summary (like GlasAve)
   ═══════════════════════════════════════════════════════════════ */
function PricingSidebar({ order, updateStatus }: { order: any; updateStatus: (s: string) => void }) {
  const statusLabel = order.status?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="ga-pricing-panel flex flex-col" style={{ width: '240px' }}>
      {/* Order Info */}
      <div className="p-3 border-b" style={{ borderColor: '#c0c0c0' }}>
        <div className="text-lg font-bold" style={{ color: '#1a7a1a' }}>{order.orderNumber}</div>
        <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
        <div className="text-sm font-medium mt-1">{statusLabel}</div>
      </div>

      {/* Store */}
      <div className="p-3 border-b" style={{ borderColor: '#c0c0c0' }}>
        <div className="label-ga">Store</div>
        <div className="text-sm font-medium">{order.shop?.name || 'N/A'}</div>
        <div className="label-ga mt-2">Sched. Status</div>
        <select className="select-ga" value={order.status} onChange={(e) => updateStatus(e.target.value)}>
          {['pending', 'scheduled', 'dispatched', 'en_route', 'on_site', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b flex flex-wrap gap-2" style={{ borderColor: '#c0c0c0' }}>
        <button className="btn-ga-green text-xs">E-Orders</button>
        <button className="btn-ga-green text-xs">Profit Check</button>
        <button className="btn-ga-outline text-xs">Create P.O.</button>
      </div>

      {/* Pricing Breakdown */}
      <div className="p-2 flex-1">
        <div className="ga-pricing-row"><span className="ga-pricing-label">Material</span><span className="ga-pricing-value">${order.retailPrice?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">Labor</span><span className="ga-pricing-value">${order.laborCost?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row border-t mt-1 pt-1" style={{ borderColor: '#ddd' }}><span className="ga-pricing-label">Subtotal</span><span className="ga-pricing-value">${((order.retailPrice || 0) + (order.laborCost || 0) + (order.moldingCost || 0) + (order.kitCost || 0) + (order.calibrationCost || 0)).toFixed(2)}</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">Tax</span><span className="ga-pricing-value">${order.taxAmount?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row font-bold border-t mt-1 pt-1" style={{ borderColor: '#999' }}><span className="ga-pricing-label">Total</span><span className="ga-pricing-total">${order.totalAmount?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">Payments</span><span className="ga-pricing-value">$0.00</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">AR Pmts</span><span className="ga-pricing-value">$0.00</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">Bill-to Pmts</span><span className="ga-pricing-value">${order.insurancePays?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row"><span className="ga-pricing-label">Deductible</span><span className="ga-pricing-value">${order.deductible?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row border-t mt-1 pt-1" style={{ borderColor: '#999' }}><span className="ga-pricing-label">Balance</span><span className="ga-pricing-value">${order.customerPays?.toFixed(2) || '0.00'}</span></div>
        <div className="ga-pricing-row font-bold"><span className="ga-pricing-label">Bill-To Balance</span><span className="ga-pricing-total">${order.totalAmount?.toFixed(2) || '0.00'}</span></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOTTOM LINE ITEMS GRID (yellow header, like GlasAve)
   ═══════════════════════════════════════════════════════════════ */
function LineItemsGrid({ order }: { order: any }) {
  const items = order.lineItems || [];
  // Build default items from order if no line items
  const displayItems = items.length > 0 ? items : [
    { id: '1', itemNum: '1.01', partNumber: order.nagsPartNumber || '', qty: 1, description: order.partDescription || `${order.jobType} - ${order.glassPosition}`, total: order.retailPrice || 0, listPrice: 0, material: order.retailPrice || 0, matRate: 45, labor: order.laborCost || 0, labRate: 150, cost: order.partCost || 0, extCost: 0, labCost: 0, labExtCost: 0, costCd: 'V', category: 'FOREIGN WINDSHIELD' },
    ...(order.kitCost > 0 ? [{ id: '2', itemNum: '1.02', partNumber: 'HAH000448', qty: 2, description: 'Adhesive(Nags) (Fast-Cure Urethane/Dam/Primer) (2.00)', total: order.kitCost * 2.7 || 67.50, listPrice: 15, material: 0, matRate: 15, labor: 0, labRate: 0, cost: 0, extCost: 0, labCost: 0, labExtCost: 0, costCd: 'S', category: 'AUTO KITS' }] : []),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="ga-lineitems">
        <thead>
          <tr>
            <th style={{ width: '30px' }}>
              <button className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#1a7a1a' }}>+</button>
            </th>
            <th>Item</th>
            <th>Part Number</th>
            <th>Qty</th>
            <th>Dimension</th>
            <th>Description</th>
            <th>Note</th>
            <th>ADAS</th>
            <th>Total</th>
            <th>List Price</th>
            <th>Material</th>
            <th>Mat. Rate</th>
            <th>Labor</th>
            <th>Lab. Rate</th>
            <th>Cost</th>
            <th>Ext. Cost</th>
            <th>Lab Cost</th>
            <th>Lab Ext Cost</th>
            <th>Cost Cd</th>
            <th>Category</th>
            <th>Bin</th>
            <th>Manual</th>
            <th>Vendor</th>
            <th>CO</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item: any, idx: number) => (
            <tr key={item.id || idx}>
              <td className="text-center">
                <div className="flex items-center gap-1">
                  <button className="text-gray-400">&#9776;</button>
                  <button className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#cc3333', fontSize: '8px' }}>X</button>
                </div>
              </td>
              <td className="text-red-600 font-medium">{item.itemNum || `1.0${idx + 1}`}</td>
              <td className="font-mono">{item.partNumber || item.nagsPartNumber || ''}</td>
              <td>{item.qty || item.quantity || 1}</td>
              <td></td>
              <td className="max-w-xs">{item.description}</td>
              <td><span className="px-2 py-0.5 rounded text-white text-xs" style={{ background: '#1a7a1a' }}>Notes</span></td>
              <td>{order.requiresCalibration && idx === 0 ? <span className="ga-adas-warn" title="ADAS Calibration Required">&#9888;</span> : ''}</td>
              <td className="text-right">${(item.total || 0).toFixed(2)}</td>
              <td className="text-right">${(item.listPrice || 0).toFixed(2)}</td>
              <td className="text-right">${(item.material || item.unitPrice || 0).toFixed(2)}</td>
              <td className="text-right">{item.matRate || ''}</td>
              <td className="text-right">${(item.labor || 0).toFixed(2)}</td>
              <td className="text-right">{item.labRate || ''}</td>
              <td className="text-right">${(item.cost || 0).toFixed(2)}</td>
              <td className="text-right">${(item.extCost || 0).toFixed(2)}</td>
              <td className="text-right">${(item.labCost || 0).toFixed(2)}</td>
              <td className="text-right">${(item.labExtCost || 0).toFixed(2)}</td>
              <td className="text-center">{item.costCd || ''}</td>
              <td>{item.category || ''}</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="text-center">0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: CUSTOMER
   ═══════════════════════════════════════════════════════════════ */
function CustomerTab({ order }: { order: any }) {
  const c = order.customer;
  if (!c) return <div>No customer</div>;
  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl">
      <div><label className="label-ga">First Name</label><input className="input-ga" value={c.firstName} readOnly /></div>
      <div><label className="label-ga">Last Name</label><input className="input-ga" value={c.lastName} readOnly /></div>
      <div><label className="label-ga">Phone</label><input className="input-ga" value={c.phone} readOnly /></div>
      <div><label className="label-ga">Email</label><input className="input-ga" value={c.email || ''} readOnly /></div>
      <div className="col-span-2"><label className="label-ga">Address</label><input className="input-ga" value={`${c.address || ''} ${c.city || ''} ${c.state || ''} ${c.zip || ''}`} readOnly /></div>
      <div><label className="label-ga">Company</label><input className="input-ga" value={c.company || ''} readOnly /></div>
      <div><label className="label-ga">Source</label><input className="input-ga capitalize" value={c.source?.replace(/_/g, ' ') || ''} readOnly /></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: AUTO (Vehicle)
   ═══════════════════════════════════════════════════════════════ */
function AutoTab({ order }: { order: any }) {
  const v = order.vehicle;
  if (!v) return <div>No vehicle</div>;
  return (
    <div className="grid grid-cols-3 gap-4 max-w-4xl">
      <div><label className="label-ga">Year</label><input className="input-ga" value={v.year} readOnly /></div>
      <div><label className="label-ga">Make</label><input className="input-ga" value={v.make} readOnly /></div>
      <div><label className="label-ga">Model</label><input className="input-ga" value={v.model} readOnly /></div>
      <div><label className="label-ga">Sub Model</label><input className="input-ga" value={v.subModel || ''} readOnly /></div>
      <div><label className="label-ga">Body Style</label><input className="input-ga" value={v.bodyStyle || ''} readOnly /></div>
      <div><label className="label-ga">Color</label><input className="input-ga" value={v.color || ''} readOnly /></div>
      <div className="col-span-2"><label className="label-ga">VIN</label><input className="input-ga font-mono" value={v.vin || ''} readOnly /></div>
      <div><label className="label-ga">Plate</label><input className="input-ga" value={`${v.plateNumber || ''} ${v.plateState || ''}`} readOnly /></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: GLASS (Parts Tree + options like GlasAve)
   ═══════════════════════════════════════════════════════════════ */
function GlassTab({ order }: { order: any }) {
  return (
    <div>
      {/* Action buttons row */}
      <div className="flex gap-2 mb-3">
        <button className="btn-ga-green">Glass Options</button>
        <button className="btn-ga-green">VinPro Search</button>
        <button className="btn-ga-green">ScanPro Check</button>
        <button className="btn-ga-red">Repairs</button>
        <div className="ml-auto flex items-center gap-2">
          <label className="label-ga">Part Number</label>
          <input className="input-ga w-48" placeholder="" value={order.nagsPartNumber || ''} readOnly />
        </div>
      </div>

      {/* Parts Tree Grid */}
      <div className="ga-panel overflow-auto" style={{ maxHeight: '300px' }}>
        <table className="ga-grid">
          <thead>
            <tr>
              <th style={{ minWidth: '160px' }}>Part Number</th>
              <th>Interchange</th>
              <th>ADAS</th>
              <th>Probability</th>
              <th>Inquire</th>
              <th style={{ minWidth: '250px' }}>Description</th>
              <th>Total</th>
              <th>List</th>
              <th>Stk Avail</th>
              <th>Blk Size</th>
              <th>Cost</th>
              <th>Material</th>
              <th>Mat. Rate</th>
              <th>Labor</th>
              <th>Lab. Rate</th>
              <th>Hours</th>
              <th>Eff. Date</th>
              <th>Pric...</th>
              <th>Fig.</th>
            </tr>
          </thead>
          <tbody>
            {/* Windshield Group */}
            <tr>
              <td colSpan={19} className="font-medium" style={{ background: '#f5f5f5' }}>
                <span className="ga-tree-expand">&#9660;</span> Windshield
              </td>
            </tr>
            {order.nagsPartNumber && (
              <>
                <tr className="selected">
                  <td className="pl-8">
                    <span className="ga-tree-expand">&#9660;</span>
                    <span className="font-mono">{order.nagsPartNumber}</span>
                  </td>
                  <td className="text-center"><input type="checkbox" checked readOnly /></td>
                  <td className="text-center">{order.requiresCalibration ? <span className="ga-adas-warn">&#9888;</span> : ''}</td>
                  <td><span className="ga-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span></td>
                  <td className="text-center"><input type="checkbox" /></td>
                  <td>{order.partDescription || 'Windshield'}</td>
                  <td className="text-right">${((order.retailPrice || 0) + (order.laborCost || 0)).toFixed(2)}</td>
                  <td className="text-right">${(order.retailPrice || 0).toFixed(2)}</td>
                  <td className="text-center">0.00</td>
                  <td></td>
                  <td className="text-right">${(order.partCost || 0).toFixed(2)}</td>
                  <td className="text-right">${(order.retailPrice || 0).toFixed(2)}</td>
                  <td className="text-right">45.00</td>
                  <td className="text-right">${(order.laborCost || 0).toFixed(2)}</td>
                  <td className="text-right">150.00</td>
                  <td className="text-right">3.50</td>
                  <td>{new Date().toLocaleDateString()}</td>
                  <td>A</td>
                  <td></td>
                </tr>
              </>
            )}
            {/* Door Group */}
            <tr>
              <td colSpan={19} className="font-medium" style={{ background: '#f5f5f5' }}>
                <span className="ga-tree-expand">&#9654;</span> Door
              </td>
            </tr>
            {/* Quarter Group */}
            <tr>
              <td colSpan={19} className="font-medium" style={{ background: '#f5f5f5' }}>
                <span className="ga-tree-expand">&#9654;</span> Quarter
              </td>
            </tr>
            {/* Back Window Group */}
            <tr>
              <td colSpan={19} className="font-medium" style={{ background: '#f5f5f5' }}>
                <span className="ga-tree-expand">&#9654;</span> Back Window
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Options Row: Notes + Molding + Kit */}
      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <label className="label-ga">Notes</label>
          <textarea className="ga-notes-box" defaultValue="May require specialized equipment, refer to Manufacturer's Service Manual for specific procedures. Labor time does not include calibration or programming.&#10;Kit Required" />
          <div className="flex gap-2 mt-2">
            <button className="btn-ga-green">Vendor Inquiry</button>
            <button className="btn-ga-outline">View Picture</button>
          </div>
        </div>
        <div>
          <label className="label-ga" style={{ color: 'red' }}>Add Molding</label>
          <select className="select-ga"><option>NONE</option><option>Standard Molding</option></select>
          <label className="label-ga mt-3" style={{ color: 'red' }}>Add Kit</label>
          <select className="select-ga"><option>Fast Cure</option><option>Standard Cure</option><option>NONE</option></select>
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" /> Don't Display Other Moldings</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" /> Don't Display Zero Prices</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" /> Don't Display Interchanges</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" /> Inquire All Moldings</label>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: SCHEDULE
   ═══════════════════════════════════════════════════════════════ */
function ScheduleTab({ order, updateStatus }: { order: any; updateStatus: (s: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-6 max-w-4xl">
      <div className="space-y-3">
        <div><label className="label-ga">Sched. Date</label><input type="date" className="input-ga" defaultValue={order.scheduledDate?.slice(0, 10)} /></div>
        <div><label className="label-ga">End</label><input type="date" className="input-ga" /></div>
        <div className="ga-panel p-3">
          <div className="font-medium text-xs mb-2">Schedule Preferences</div>
          <label className="flex items-center gap-2 text-xs mb-2"><input type="checkbox" /> No Auto-Schedule</label>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label-ga">Sched. Pref.</label><input className="input-ga" /></div>
            <div><label className="label-ga">Pref. Time</label><select className="select-ga"><option>am</option><option>pm</option></select></div>
            <div><label className="label-ga">Start</label><input type="time" className="input-ga" defaultValue={order.scheduledTime || ''} /></div>
            <div><label className="label-ga">End</label><input type="time" className="input-ga" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs mt-2"><input type="checkbox" /> Time Constraint</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" /> Customer Waiting</label>
          <div className="mt-2"><label className="label-ga">Job Location</label>
            <select className="select-ga" defaultValue={order.serviceLocation}>
              <option value="shop">Shop (waiting)</option><option value="mobile">Mobile</option><option value="customer">Customer</option>
            </select>
          </div>
          <div className="mt-2"><label className="label-ga">Techs</label><input className="input-ga" value={order.technician ? `${order.technician.firstName} ${order.technician.lastName}` : ''} readOnly /></div>
          <div className="mt-2"><label className="label-ga">Primary</label><select className="select-ga"><option>Select</option></select></div>
        </div>
      </div>
      <div className="space-y-3">
        <div><label className="label-ga">CSR</label><select className="select-ga"><option>{order.csr ? `${order.csr.firstName} ${order.csr.lastName}` : 'Select'}</option></select></div>
        <div><label className="label-ga">Sales Rep</label><select className="select-ga"><option>Select</option></select></div>
        <div><label className="label-ga">TL Team Leader</label><select className="select-ga"><option>Select</option></select></div>
        <div><label className="label-ga">TSR Telemarketer</label><select className="select-ga"><option>Select</option></select></div>
        <div><label className="label-ga">Deposit to Collect</label><input className="input-ga" defaultValue="$0.00" /></div>
        <div><label className="label-ga">Sched. Status</label>
          <select className="select-ga" value={order.status} onChange={(e) => updateStatus(e.target.value)}>
            {['pending', 'scheduled', 'dispatched', 'en_route', 'on_site', 'in_progress', 'completed'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div className="ga-panel p-3">
          <div className="font-medium text-xs mb-2">Print Job as</div>
          <label className="flex items-center gap-2 text-xs"><input type="radio" name="print" defaultChecked /> Auto</label>
          <label className="flex items-center gap-2 text-xs"><input type="radio" name="print" /> Flat</label>
          <div className="mt-2"><label className="label-ga">Job Type</label><select className="select-ga"><option>Select</option></select></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: PAYMENTS
   ═══════════════════════════════════════════════════════════════ */
function PaymentsTab({ order, createInvoice }: { order: any; createInvoice: () => void }) {
  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-4">
        {order.status === 'completed' && <button onClick={createInvoice} className="btn-ga-green">Create Invoice</button>}
        {order.invoice && <span className="text-sm text-green-700">Invoice: {order.invoice.invoiceNumber}</span>}
      </div>
      <div className="ga-panel p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Total:</span> <strong>${order.totalAmount?.toFixed(2)}</strong></div>
          <div><span className="text-gray-500">Insurance Pays:</span> ${order.insurancePays?.toFixed(2) || '0.00'}</div>
          <div><span className="text-gray-500">Customer Pays:</span> ${order.customerPays?.toFixed(2) || '0.00'}</div>
          <div><span className="text-gray-500">Deductible:</span> ${order.deductible?.toFixed(2) || '0.00'}</div>
        </div>
        {order.invoice?.payments?.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <h4 className="font-medium text-xs mb-2">Payment History</h4>
            {order.invoice.payments.map((p: any) => (
              <div key={p.id} className="flex justify-between text-xs py-1 border-b">
                <span>{p.receiptNumber} - {p.paymentMethod?.replace(/_/g, ' ')}</span>
                <span className="font-medium">${p.amount?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: NOTES
   ═══════════════════════════════════════════════════════════════ */
function NotesTab({ order }: { order: any }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <div className="space-y-3">
        <div>
          <label className="label-ga">Internal Notes</label>
          <textarea className="ga-notes-box" style={{ minHeight: '120px' }} defaultValue={order.csrNotes || ''} />
        </div>
        <div>
          <label className="label-ga">Work to Perform</label>
          <textarea className="ga-notes-box" style={{ minHeight: '120px' }} defaultValue={order.techNotes || ''} />
        </div>
        <div>
          <label className="label-ga">Print Notes</label>
          <textarea className="ga-notes-box" style={{ minHeight: '120px' }} defaultValue={order.dispatchNotes || ''} />
        </div>
      </div>
      <div>
        <div className="flex gap-2 mb-2">
          <button className="btn-ga-green text-xs">+</button>
          <button className="btn-ga-outline text-xs">Add Link</button>
        </div>
        <table className="ga-grid">
          <thead><tr><th>Description</th><th>Name</th></tr></thead>
          <tbody>
            <tr><td colSpan={2} className="text-center text-gray-400 py-4">No records available.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: TAX
   ═══════════════════════════════════════════════════════════════ */
function TaxTab({ order }: { order: any }) {
  return (
    <div className="max-w-lg">
      <div className="ga-panel p-4 space-y-3">
        <div><label className="label-ga">Tax Rate</label><input className="input-ga" defaultValue={(order.shop?.taxRate * 100 || 0).toFixed(2) + '%'} /></div>
        <div><label className="label-ga">Tax Amount</label><input className="input-ga" defaultValue={'$' + (order.taxAmount || 0).toFixed(2)} /></div>
        <div><label className="label-ga">Taxable Amount</label><input className="input-ga" defaultValue={'$' + ((order.totalAmount || 0) - (order.taxAmount || 0)).toFixed(2)} /></div>
      </div>
    </div>
  );
}
