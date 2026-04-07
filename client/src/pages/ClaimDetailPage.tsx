import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function ClaimDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => { claimAPI.get(id!).then(({ data }) => setClaim(data.data)); }, [id]);

  if (!claim) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/claims')} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          Claim #{claim.claimNumber} <StatusBadge status={claim.status} />
        </h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Claim Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Insurance:</span><span>{claim.insuranceCompanyName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Policy #:</span><span>{claim.policyNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date of Loss:</span><span>{new Date(claim.dateOfLoss).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Approved Amount:</span><span className="font-bold">${claim.approvedAmount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deductible:</span><span>${claim.deductible?.toFixed(2)}</span></div>
            {claim.approvalNumber && <div className="flex justify-between"><span className="text-gray-500">Approval #:</span><span>{claim.approvalNumber}</span></div>}
            {claim.adjusterName && <div className="flex justify-between"><span className="text-gray-500">Adjuster:</span><span>{claim.adjusterName}</span></div>}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Related Work Order</h3>
          {claim.workOrder && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Order:</span><span className="font-mono cursor-pointer text-primary-600" onClick={() => navigate(`/work-orders/${claim.workOrder.id}`)}>{claim.workOrder.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span>{claim.workOrder.customer?.firstName} {claim.workOrder.customer?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vehicle:</span><span>{claim.workOrder.vehicle?.year} {claim.workOrder.vehicle?.make} {claim.workOrder.vehicle?.model}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
