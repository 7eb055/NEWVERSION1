const axios = require('axios');
const crypto = require('crypto');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseURL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    
    if (!this.secretKey) {
      console.warn('PAYSTACK_SECRET_KEY not found in environment variables');
    }
    
    // Create axios instance with default headers
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize a payment transaction
   * @param {Object} paymentData - Payment initialization data
   * @returns {Promise<Object>} - Paystack response
   */
  async initializeTransaction(paymentData) {
    try {
      const {
        email,
        amount,
        reference,
        currency = 'GHS',
        callback_url,
        metadata = {},
        channels = ['card', 'bank', 'ussd', 'qr', 'mobile_money']
      } = paymentData;

      // Convert amount to kobo (Paystack uses smallest currency unit)
      const amountInKobo = Math.round(amount * 100);

      const requestData = {
        email,
        amount: amountInKobo,
        reference,
        currency,
        callback_url,
        metadata,
        channels
      };

      console.log('Initializing Paystack transaction:', {
        email,
        amount: amountInKobo,
        reference,
        currency
      });

      const response = await this.api.post('/transaction/initialize', requestData);
      
      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
          reference: response.data.data.reference,
          access_code: response.data.data.access_code,
          authorization_url: response.data.data.authorization_url
        };
      } else {
        throw new Error(response.data.message || 'Transaction initialization failed');
      }
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Payment initialization failed');
    }
  }

  /**
   * Verify a payment transaction
   * @param {string} reference - Payment reference
   * @returns {Promise<Object>} - Verification result
   */
  async verifyTransaction(reference) {
    try {
      console.log('Verifying Paystack transaction:', reference);
      
      const response = await this.api.get(`/transaction/verify/${reference}`);
      
      if (response.data.status) {
        const transactionData = response.data.data;
        
        return {
          success: true,
          data: transactionData,
          status: transactionData.status,
          amount: transactionData.amount / 100, // Convert back from kobo
          currency: transactionData.currency,
          paid_at: transactionData.paid_at,
          gateway_response: transactionData.gateway_response,
          channel: transactionData.channel,
          fees: transactionData.fees / 100,
          customer: transactionData.customer,
          authorization: transactionData.authorization
        };
      } else {
        throw new Error(response.data.message || 'Transaction verification failed');
      }
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Payment verification failed');
    }
  }

  /**
   * Generate a unique payment reference
   * @param {string} prefix - Optional prefix for the reference
   * @returns {string} - Unique reference
   */
  generateReference(prefix = 'EVT') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Verify webhook signature
   * @param {string} body - Request body
   * @param {string} signature - Paystack signature header
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhookSignature(body, signature) {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(body)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Get transaction details
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Transaction details
   */
  async getTransaction(transactionId) {
    try {
      const response = await this.api.get(`/transaction/${transactionId}`);
      
      if (response.data.status) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch transaction');
      }
    } catch (error) {
      console.error('Get transaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch transaction');
    }
  }

  /**
   * List transactions with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} - List of transactions
   */
  async listTransactions(filters = {}) {
    try {
      const { perPage = 50, page = 1, status, customer, from, to } = filters;
      
      const params = new URLSearchParams({
        perPage: perPage.toString(),
        page: page.toString()
      });
      
      if (status) params.append('status', status);
      if (customer) params.append('customer', customer);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const response = await this.api.get(`/transaction?${params.toString()}`);
      
      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
          meta: response.data.meta
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('List transactions error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch transactions');
    }
  }

  /**
   * Check if Paystack is properly configured
   * @returns {boolean} - Configuration status
   */
  isConfigured() {
    return !!(this.secretKey && this.publicKey);
  }

  /**
   * Get public key for frontend use
   * @returns {string} - Public key
   */
  getPublicKey() {
    return this.publicKey;
  }
}

module.exports = new PaystackService();
