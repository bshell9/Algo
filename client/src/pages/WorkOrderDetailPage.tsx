import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderAPI, invoiceAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['pending', 'scheduled', 'dispatched', 'en_route', 'on_site', 'in_progress', 'completed', 'invoiced', 'paid'];

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [dispatchData, setDispatchData] = useState({ podId: '', technicianId: '', notes: '' });

  useEffect(() => { loadOrder(); }, [id]);

  const loadOrder = async () => {
    try {
      const { data } = await workOrderAPI.get(id!);
      setOrder(data.data);
    } catch (err) {
      toast.error('Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await workOrderAPI.updateStatus(id!, status);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
      loadOrder();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDispatch = async () => {
    try {
      await workOrderAPI.dispatch(id!, dispatchData);
      toast.success('Work order dispatched');
      setDispatchModal(false);
      loadOrder();
    } catch (err) {
      toast.error('Failed to dispatch');
    }
  };

  const createInvoice = async () => {
    try {
      const { data } = await invoiceAPI.createFromWorkOrder(id!);
      toast.success('Invoice created');
      navigate(`/invoices/${data.data.id}`);
    } catch (err) {
      toast.error('Failed to create invoice');
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!order) return <div className="text-center py-12">Work order not found</div>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/work-orders')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">&larr; Back to Work Orders</button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {order.orderNumber}
            <StatusBadge status={order.status} />
          </h1>
          <p className="text-sm text-gray-500">
            {order.customer?.firstName} {order.customer?.lastName} - {order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}
          </p>
        </div>
        <div className="flex gap-2">
          {order.status === 'pending' && <button onClick={() => setDispatchModal(true)} className="btn-primary">Dispatch</button>}
          {order.status === 'scheduled' && <button onClick={() => updateStatus('dispatched')} className="btn-primary">Mark Dispatched</button>}
          {order.status === 'dispatched' && <button onClick={() => updateStatus('en_route')} className="btn-primary">En Route</button>}
          {order.status === 'en_route' && <button onClick={() => updateStatus('on_site')} className="btn-primary">Arrived On Site</button>}
          {order.status === 'on_site' && <button onClick={() => updateStatus('in_progress')} className="btn-primary">Start Work</button>}
          {order.status === 'in_progress' && <button onClick={() => updateStatus('completed')} className="btn-success">Complete Job</button>}
          {order.status === 'completed' && <button onClick={createInvoice} className="btn-primary">Create Invoice</button>}
          {!['cancelled', 'paid'].includes(order.status) && (
            <button onClick={() => updateStatus('cancelled')} className="btn-danger">Cancel</button>
          )}
        </div>
      </div>

      {/* Status Flow Progress */}
      <div className="card">
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentIdx ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <span className={`ml-1 text-xs hidden lg:inline ${i <= currentIdx ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                {s.replace(/_/g, ' ')}
              </span>
              {i < STATUS_FLOW.length - 1 && <div className={`w-8 h-0.5 mx-1 ${i < currentIdx ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Vehicle */}
        <div className="card">
          <h3 className="font-semibold mb-3">Customer</h3>
          <p className="text-sm">{order.customer?.firstName} {order.customer?.lastName}</p>
          <p className="text-sm text-gray-500">{order.customer?.phone}</p>
          <p className="text-sm text-gray-500">{order.customer?.email}</p>
          <h3 className="font-semibold mt-4 mb-3">Vehicle</h3>
          <p className="text-sm">{order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}</p>
          <p className="text-sm text-gray-500">VIN: {order.vehicle?.vin || 'N/A'}</p>
          <p className="text-sm text-gray-500">Color: {order.vehicle?.color || 'N/A'}</p>
        </div>

        {/* Job Details */}
        <div className="card">
          <h3 className="font-semibold mb-3">Job Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="capitalize">{order.jobType?.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Glass Position:</span><span className="capitalize">{order.glassPosition?.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">NAGS Part #:</span><span className="font-mono">{order.nagsPartNumber || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Part Type:</span><span className="capitalize">{order.partType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Service Location:</span><span className="capitalize">{order.serviceLocation}</span></div>
            {order.requiresCalibration && (
              <div className="flex justify-between"><span className="text-gray-500">Calibration:</span><span className="capitalize">{order.calibrationType || 'Required'}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Shop:</span><span>{order.shop?.name}</span></div>
            {order.pod && <div className="flex justify-between"><span className="text-gray-500">Pod:</span><span>{order.pod?.name}</span></div>}
            {order.technician && <div className="flex justify-between"><span className="text-gray-500">Tech:</span><span>{order.technician?.firstName} {order.technician?.lastName}</span></div>}
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <h3 className="font-semibold mb-3">Pricing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Glass (Retail):</span><span>${order.retailPrice?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Labor:</span><span>${order.laborCost?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Molding:</span><span>${order.moldingCost?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Kit:</span><span>${order.kitCost?.toFixed(2)}</span></div>
            {order.calibrationCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Calibration:</span><span>${order.calibrationCost?.toFixed(2)}</span></div>}
            {order.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-${order.discount?.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span>${order.taxAmount?.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>${order.totalAmount?.toFixed(2)}</span></div>
            {order.isInsuranceJob && (
              <>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-blue-600"><span>Insurance Pays:</span><span>${order.insurancePays?.toFixed(2)}</span></div>
                  <div className="flex justify-between text-amber-600"><span>Customer Pays (Deductible):</span><span>${order.customerPays?.toFixed(2)}</span></div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Insurance Info */}
        {order.isInsuranceJob && (
          <div className="card">
            <h3 className="font-semibold mb-3">Insurance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Company:</span><span>{order.insuranceCompanyCode}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Claim #:</span><span>{order.claimNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Policy #:</span><span>{order.policyNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deductible:</span><span>${order.deductible?.toFixed(2)}</span></div>
              {order.claim && (
                <button onClick={() => navigate(`/claims/${order.claim.id}`)} className="btn-secondary w-full mt-2 justify-center">View Claim</button>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="card">
          <h3 className="font-semibold mb-3">Notes</h3>
          <div className="space-y-3 text-sm">
            {order.csrNotes && <div><p className="text-xs font-medium text-gray-500">CSR Notes</p><p>{order.csrNotes}</p></div>}
            {order.techNotes && <div><p className="text-xs font-medium text-gray-500">Tech Notes</p><p>{order.techNotes}</p></div>}
            {order.dispatchNotes && <div><p className="text-xs font-medium text-gray-500">Dispatch Notes</p><p>{order.dispatchNotes}</p></div>}
            {!order.csrNotes && !order.techNotes && !order.dispatchNotes && <p className="text-gray-400">No notes</p>}
          </div>
        </div>

        {/* Timestamps */}
        <div className="card">
          <h3 className="font-semibold mb-3">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Created:</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
            {order.dispatchedAt && <div className="flex justify-between"><span className="text-gray-500">Dispatched:</span><span>{new Date(order.dispatchedAt).toLocaleString()}</span></div>}
            {order.arrivedAt && <div className="flex justify-between"><span className="text-gray-500">Arrived:</span><span>{new Date(order.arrivedAt).toLocaleString()}</span></div>}
            {order.startedAt && <div className="flex justify-between"><span className="text-gray-500">Started:</span><span>{new Date(order.startedAt).toLocaleString()}</span></div>}
            {order.completedAt && <div className="flex justify-between"><span className="text-gray-500">Completed:</span><span>{new Date(order.completedAt).toLocaleString()}</span></div>}
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      <Modal isOpen={dispatchModal} onClose={() => setDispatchModal(false)} title="Dispatch Work Order">
        <div className="space-y-4">
          <div>
            <label className="label">Pod ID</label>
            <input type="text" className="input-field" value={dispatchData.podId} onChange={(e) => setDispatchData({ ...dispatchData, podId: e.target.value })} placeholder="Select Pod" />
          </div>
          <div>
            <label className="label">Technician ID</label>
            <input type="text" className="input-field" value={dispatchData.technicianId} onChange={(e) => setDispatchData({ ...dispatchData, technicianId: e.target.value })} placeholder="Select Technician" />
          </div>
          <div>
            <label className="label">Dispatch Notes</label>
            <textarea className="input-field" rows={3} value={dispatchData.notes} onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDispatchModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDispatch} className="btn-primary">Dispatch</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
