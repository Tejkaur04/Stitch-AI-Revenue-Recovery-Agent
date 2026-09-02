const requiredConfig = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];

export class RazorpayAdapter {
  constructor(env = process.env) {
    this.keyId = env.RAZORPAY_KEY_ID;
    this.keySecret = env.RAZORPAY_KEY_SECRET;
    this.baseUrl = env.RAZORPAY_API_BASE_URL || 'https://api.razorpay.com/v1';
  }

  assertConfigured() {
    const missing = requiredConfig.filter(key => !this[key === 'RAZORPAY_KEY_ID' ? 'keyId' : 'keySecret']);
    if (missing.length) {
      throw new Error(`Missing Razorpay Test Mode configuration: ${missing.join(', ')}`);
    }
  }

  async request(path, options = {}) {
    this.assertConfigured();
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Razorpay API ${response.status}: ${body.error?.description || 'request failed'}`);
    }
    return body;
  }

  getPaymentStatus(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`);
  }

  getInvoice(invoiceId) {
    return this.request(`/invoices/${encodeURIComponent(invoiceId)}`);
  }

  getCustomer(customerId) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`);
  }

  listInvoices(query = {}) {
    const params = new URLSearchParams(query);
    return this.request(`/invoices?${params}`);
  }

  listOrders(query = {}) {
    const params = new URLSearchParams(query);
    return this.request(`/orders?${params}`);
  }

  createPaymentLink(payload) {
    return this.request('/payment_links', { method: 'POST', body: JSON.stringify(payload) });
  }

  createOrder(payload) {
    return this.request('/orders', { method: 'POST', body: JSON.stringify(payload) });
  }

  async testConnection() {
    await this.request('/orders?count=1');
    return true;
  }
}
