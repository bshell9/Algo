import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => { invoiceAPI.get(id!).then(({ data }) => setInvoice(data.data)); }, [id]);

  if (!invoice) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {invoice.invoiceNumber} <StatusBadge status={invoice.status} />
          </h1>
          <div className="flex gap-2">
            {invoice.amountDue > 0 && (
              <button onClick={() => navigate(`/pos?invoiceId=${invoice.id}`)} className="btn-primary">Process Payment</button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="card">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Bill To</h3>
            <p>{invoice.customer?.firstName} {invoice.customer?.lastName}</p>
            <p className="text-sm text-gray-500">{invoice.customer?.phone}</p>
            <p className="text-sm text-gray-500">{invoice.customer?.address}</p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold mb-2">From</h3>
            <p>{invoice.shop?.name}</p>
            <p className="text-sm text-gray-500">{invoice.shop?.address}</p>
            <p className="text-sm text-gray-500">{invoice.shop?.phone}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="table-header">Description</th>
              <th className="table-header text-right">Qty</th>
              <th className="table-header text-right">Unit Price</th>
              <th className="table-header text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.lineItems?.map((item: any) => (
              <tr key={item.id}>
                <td className="table-cell">{item.description}</td>
                <td className="table-cell text-right">{item.quantity}</td>
                <td className="table-cell text-right">${item.unitPrice?.toFixed(2)}</td>
                <td className="table-cell text-right font-medium">${item.total?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2"><td colSpan={3} className="table-cell text-right text-gray-500">Subtotal</td><td className="table-cell text-right">${invoice.subtotal?.toFixed(2)}</td></tr>
            {invoice.discount > 0 && <tr><td colSpan={3} className="table-cell text-right text-red-500">Discount</td><td className="table-cell text-right text-red-500">-${invoice.discount?.toFixed(2)}</td></tr>}
            <tr><td colSpan={3} className="table-cell text-right text-gray-500">Tax</td><td className="table-cell text-right">${invoice.taxAmount?.toFixed(2)}</td></tr>
            <tr className="font-bold text-lg"><td colSpan={3} className="table-cell text-right">Total</td><td className="table-cell text-right">${invoice.total?.toFixed(2)}</td></tr>
            <tr><td colSpan={3} className="table-cell text-right text-green-600">Amount Paid</td><td className="table-cell text-right text-green-600">${invoice.amountPaid?.toFixed(2)}</td></tr>
            <tr className="font-bold"><td colSpan={3} className="table-cell text-right text-red-600">Amount Due</td><td className="table-cell text-right text-red-600">${invoice.amountDue?.toFixed(2)}</td></tr>
          </tfoot>
        </table>
      </div>

      {/* Payments */}
      {invoice.payments?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Payment History</h3>
          <div className="space-y-2">
            {invoice.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-mono text-sm">{p.receiptNumber}</span>
                  <span className="ml-2 text-sm text-gray-500 capitalize">{p.paymentMethod.replace(/_/g, ' ')}</span>
                  {p.cardLast4 && <span className="ml-1 text-xs text-gray-400">****{p.cardLast4}</span>}
                </div>
                <div className="text-right">
                  <span className={`font-medium ${p.transactionType === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                    {p.transactionType === 'refund' ? '-' : ''}${p.amount?.toFixed(2)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
