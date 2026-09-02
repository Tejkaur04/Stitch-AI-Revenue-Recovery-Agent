import { addAuditEvent, addIncident, listIncidents } from './store.js';
import { createIncidentFromEvent } from './stitchEngine.js';

export const startRazorpayPoller = (adapter, processIncoming, intervalMs = 300000) => {
  if (process.env.POLLER_ENABLED !== 'true') return () => {};

  const poll = async () => {
    try {
      const invoices = await adapter.listInvoices({ count: 100 });
      for (const invoice of invoices.items || []) {
        if (invoice.status !== 'issued' || !invoice.due_at || invoice.due_at * 1000 >= Date.now()) continue;
        const exists = listIncidents().some(incident => incident.invoice_id === invoice.id && incident.status === 'pending');
        if (exists) continue;
        const incident = createIncidentFromEvent({
          sourceEvent: 'invoice.overdue',
          razorpayEventId: `invoice-overdue:${invoice.id}:${invoice.due_at}`,
          customerId: invoice.customer_id || 'unknown_customer',
          customer: { id: invoice.customer_id || 'unknown_customer', name: 'Razorpay customer' },
          invoiceId: invoice.id,
          amount_paise: invoice.amount_due || invoice.amount || 0,
          reason: `Invoice overdue since ${new Date(invoice.due_at * 1000).toISOString()}`,
          type: 'invoice_overdue'
        });
        incident.invoice_id = invoice.id;
        await processIncoming(incident);
      }
    } catch (error) {
      addAuditEvent({ incidentId: null, event: 'POLLER_FAILED', actor: 'SYSTEM', result: error.message });
    }
  };

  const timer = setInterval(poll, intervalMs);
  poll();
  return () => clearInterval(timer);
};
