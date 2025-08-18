import axios from 'axios';
import { API_BASE_URL } from '../config/api';

class PaymentService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get Paystack configuration
   */
  async getConfig() {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment config:', error);
      throw error;
    }
  }

  /**
   * Initialize payment
   */
  async initializePayment(paymentData, token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/payments/initialize`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error;
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(reference, token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/payments/verify/${reference}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(reference, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/payments/status/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = 'GHS') {
    const formatter = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  }

  /**
   * Convert amount to kobo (Paystack uses smallest currency unit)
   */
  toKobo(amount) {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from kobo to main currency unit
   */
  fromKobo(amount) {
    return amount / 100;
  }
}

export default new PaymentService();
