import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { posAPI, invoiceAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function POSPage() {
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceSearch, setInvoiceSearch] = useState(searchParams.get('invoiceId') || '');
  const [paymentForm, setPaymentForm] = useState({ paymentMethod: 'cash', amount: 0, tipAmount: 0, cardLast4: '', cardBrand: '', checkNumber: '' });
  const [splitPayments, setSplitPayments] = useState<any[]>([]);
  const [showSplit, setShowSplit] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [drawerAction, setDrawerAction] = useState({ type: 'drop', amount: 0, reason: '' });
  const [openBalance, setOpenBalance] = useState(200);
  const shopId = useAuthStore((s) => s.selectedShopId);

  useEffect(() => { loadSessions(); }, [shopId]);
  useEffect(() => { if (invoiceSearch) loadInvoice(invoiceSearch); }, [invoiceSearch]);

  const loadSessions = async () => {
    try {
      const { data } = await posAPI.sessions({ shopId, isOpen: 'true' });
      setSessions(data.data);
      if (data.data.length > 0) setSession(data.data[0]);
    } catch (err) { console.error(err); }
  };

  const openSession = async () => {
    try {
      const { data } = await posAPI.openSession({ shopId, openingBalance: openBalance });
      setSession(data.data);
      toast.success('POS session opened');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to open session'); }
  };

  const closeSession = async () => {
    if (!session) return;
    try {
      await posAPI.closeSession(session.id, 0);
      toast.success('POS session closed');
      setSession(null);
      loadSessions();
    } catch (err) { toast.error('Failed to close session'); }
  };

  const loadInvoice = async (id: string) => {
    try {
      const { data } = await invoiceAPI.get(id);
      setInvoice(data.data);
      setPaymentForm((f) => ({ ...f, amount: data.data.amountDue }));
    } catch (err) { toast.error('Invoice not found'); }
  };

  const processPayment = async () => {
    if (!invoice) return;
    try {
      await posAPI.processPayment({ invoiceId: invoice.id, ...paymentForm });
      toast.success('Payment processed!');
      loadInvoice(invoice.id);
      setPaymentForm({ paymentMethod: 'cash', amount: 0, tipAmount: 0, cardLast4: '', cardBrand: '', checkNumber: '' });
    } catch (err) { toast.error('Payment failed'); }
  };

  const processSplitPayment = async () => {
    if (!invoice || splitPayments.length === 0) return;
    try {
      await posAPI.splitPayment({ invoiceId: invoice.id, payments: splitPayments });
      toast.success('Split payment processed!');
      loadInvoice(invoice.id);
      setSplitPayments([]);
      setShowSplit(false);
    } catch (err) { toast.error('Split payment failed'); }
  };

  const handleCashDrawer = async () => {
    if (!session) return;
    try {
      const fn = drawerAction.type === 'drop' ? posAPI.cashDrop : drawerAction.type === 'paid_in' ? posAPI.paidIn : posAPI.paidOut;
      await fn({ sessionId: session.id, amount: drawerAction.amount, reason: drawerAction.reason });
      toast.success(`Cash drawer ${drawerAction.type} recorded`);
      setShowCashDrawer(false);
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <div className="flex gap-2">
          {!session ? (
            <div className="flex gap-2 items-center">
              <input type="number" className="input-field w-32" value={openBalance} onChange={(e) => setOpenBalance(Number(e.target.value))} placeholder="Opening $" />
              <button onClick={openSession} className="btn-success">Open Register</button>
            </div>
          ) : (
            <>
              <span className="text-sm text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Register Open
              </span>
              <button onClick={() => setShowCashDrawer(true)} className="btn-secondary">Cash Drawer</button>
              <button onClick={closeSession} className="btn-danger">Close Register</button>
            </>
          )}
        </div>
      </div>

      {!session && (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">Open a register to start processing payments</p>
        </div>
      )}

      {session && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Invoice Lookup */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Find Invoice</h3>
              <div className="flex gap-2">
                <input className="input-field flex-1" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Enter Invoice ID or scan barcode" />
                <button onClick={() => loadInvoice(invoiceSearch)} className="btn-primary">Load</button>
              </div>
            </div>

            {invoice && (
              <div className="card">
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-gray-500">{invoice.customer?.firstName} {invoice.customer?.lastName} | {invoice.workOrder?.orderNumber}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>

                {/* Line items */}
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead><tr><th className="table-header">Item</th><th className="table-header text-right">Qty</th><th className="table-header text-right">Price</th><th className="table-header text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.lineItems?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="table-cell text-sm">{item.description}</td>
                        <td className="table-cell text-right">{item.quantity}</td>
                        <td className="table-cell text-right">${item.unitPrice?.toFixed(2)}</td>
                        <td className="table-cell text-right">${item.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${invoice.subtotal?.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Tax:</span><span>${invoice.taxAmount?.toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg font-bold"><span>Total:</span><span>${invoice.total?.toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Paid:</span><span>${invoice.amountPaid?.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-bold text-red-600 border-t pt-2"><span>Amount Due:</span><span>${invoice.amountDue?.toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Payment Processing */}
          <div className="space-y-4">
            {invoice && invoice.amountDue > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-3">Process Payment</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Payment Method</label>
                    <select className="input-field" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="check">Check</option>
                      <option value="insurance_direct">Insurance Direct</option>
                      <option value="insurance_cod">Insurance COD</option>
                      <option value="mobile_pay">Mobile Pay</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Amount</label>
                    <input type="number" step="0.01" className="input-field text-2xl font-bold text-center" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
                  </div>
                  {['credit_card', 'debit_card'].includes(paymentForm.paymentMethod) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label text-xs">Last 4</label><input className="input-field" maxLength={4} value={paymentForm.cardLast4} onChange={(e) => setPaymentForm({ ...paymentForm, cardLast4: e.target.value })} /></div>
                      <div><label className="label text-xs">Brand</label>
                        <select className="input-field" value={paymentForm.cardBrand} onChange={(e) => setPaymentForm({ ...paymentForm, cardBrand: e.target.value })}>
                          <option value="">Select</option><option value="visa">Visa</option><option value="mastercard">MC</option><option value="amex">Amex</option><option value="discover">Discover</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {paymentForm.paymentMethod === 'check' && (
                    <div><label className="label text-xs">Check #</label><input className="input-field" value={paymentForm.checkNumber} onChange={(e) => setPaymentForm({ ...paymentForm, checkNumber: e.target.value })} /></div>
                  )}
                  <div>
                    <label className="label text-xs">Tip</label>
                    <input type="number" step="0.01" className="input-field" value={paymentForm.tipAmount} onChange={(e) => setPaymentForm({ ...paymentForm, tipAmount: Number(e.target.value) })} />
                  </div>

                  {paymentForm.paymentMethod === 'cash' && paymentForm.amount > invoice.amountDue && (
                    <div className="p-3 bg-yellow-50 rounded text-sm">
                      <span className="font-medium">Change Due: </span>
                      <span className="text-lg font-bold">${(paymentForm.amount - invoice.amountDue).toFixed(2)}</span>
                    </div>
                  )}

                  <button onClick={processPayment} className="btn-success w-full justify-center text-lg py-3">
                    Charge ${paymentForm.amount.toFixed(2)}
                  </button>
                  <button onClick={() => setShowSplit(true)} className="btn-secondary w-full justify-center">
                    Split Payment
                  </button>

                  {/* Quick cash buttons */}
                  {paymentForm.paymentMethod === 'cash' && (
                    <div className="grid grid-cols-4 gap-2">
                      {[20, 50, 100, invoice.amountDue].map((amt) => (
                        <button key={amt} onClick={() => setPaymentForm({ ...paymentForm, amount: amt })} className="btn-secondary text-sm justify-center">${amt.toFixed(0)}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {invoice && invoice.amountDue <= 0 && (
              <div className="card bg-green-50 text-center py-8">
                <p className="text-2xl font-bold text-green-600">PAID IN FULL</p>
                <p className="text-sm text-gray-500 mt-2">Receipt: {invoice.payments?.[0]?.receiptNumber}</p>
              </div>
            )}

            {/* Session Summary */}
            <div className="card">
              <h3 className="font-semibold mb-3">Session Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Opening:</span><span>${session.openingBalance?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Cash Sales:</span><span>${session.cashSales?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Card Sales:</span><span>${session.cardSales?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Total:</span><span className="font-bold">${session.totalSales?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Transactions:</span><span>{session.transactionCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      <Modal isOpen={showSplit} onClose={() => setShowSplit(false)} title="Split Payment" size="lg">
        <p className="text-sm text-gray-500 mb-4">Total Due: ${invoice?.amountDue?.toFixed(2)}</p>
        <div className="space-y-3">
          {splitPayments.map((sp, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label text-xs">Method</label>
                <select className="input-field" value={sp.paymentMethod} onChange={(e) => { const u = [...splitPayments]; u[i].paymentMethod = e.target.value; setSplitPayments(u); }}>
                  <option value="cash">Cash</option><option value="credit_card">Credit Card</option><option value="debit_card">Debit Card</option><option value="check">Check</option>
                </select>
              </div>
              <div className="w-32">
                <label className="label text-xs">Amount</label>
                <input type="number" className="input-field" value={sp.amount} onChange={(e) => { const u = [...splitPayments]; u[i].amount = Number(e.target.value); setSplitPayments(u); }} />
              </div>
              <button onClick={() => setSplitPayments(splitPayments.filter((_, j) => j !== i))} className="text-red-500 text-sm pb-2">Remove</button>
            </div>
          ))}
          <button onClick={() => setSplitPayments([...splitPayments, { paymentMethod: 'cash', amount: 0 }])} className="btn-secondary text-sm">+ Add Payment</button>
          <div className="border-t pt-3">
            <p className="text-sm">Split Total: <strong>${splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</strong></p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowSplit(false)} className="btn-secondary">Cancel</button>
            <button onClick={processSplitPayment} className="btn-success">Process Split Payment</button>
          </div>
        </div>
      </Modal>

      {/* Cash Drawer Modal */}
      <Modal isOpen={showCashDrawer} onClose={() => setShowCashDrawer(false)} title="Cash Drawer">
        <div className="space-y-4">
          <div>
            <label className="label">Action</label>
            <select className="input-field" value={drawerAction.type} onChange={(e) => setDrawerAction({ ...drawerAction, type: e.target.value })}>
              <option value="drop">Cash Drop</option>
              <option value="paid_in">Paid In</option>
              <option value="paid_out">Paid Out</option>
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input type="number" step="0.01" className="input-field" value={drawerAction.amount} onChange={(e) => setDrawerAction({ ...drawerAction, amount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input-field" value={drawerAction.reason} onChange={(e) => setDrawerAction({ ...drawerAction, reason: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCashDrawer(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCashDrawer} className="btn-primary">Submit</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
