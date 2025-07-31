// Add this utility function to your codebase (e.g., in a utils/formatters.js file)

/**
 * Safely formats a number with a specific number of decimal places
 * Handles various input types (string, null, undefined) by converting to a number first
 * 
 * @param {any} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} withPrefix - Whether to add dollar sign prefix (default: false)
 * @return {string} - Formatted number
 */
export const formatCurrency = (value, decimals = 2, withPrefix = false) => {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return withPrefix ? '$0.00' : '0.00';
  }
  
  // Convert to number (handles string numbers like "123.45")
  const number = Number(value);
  
  // Check if it's a valid number
  if (isNaN(number)) {
    return withPrefix ? '$0.00' : '0.00';
  }
  
  // Format to fixed decimals
  const formatted = number.toFixed(decimals);
  
  return withPrefix ? `$${formatted}` : formatted;
};

/**
 * Converts any value to a number safely, providing a default for non-numeric values
 * 
 * @param {any} value - The value to convert to a number
 * @param {number} defaultValue - Default value to return if conversion fails (default: 0)
 * @return {number} - The converted number or default value
 */
export const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * A collection of utility functions for formatting different types of data
 */
const formatters = {
  /**
   * Format a date/time string into a human-readable format
   * 
   * @param {string} dateString - The date string to format
   * @param {boolean} includeTime - Whether to include the time (default: true)
   * @return {string} - Formatted date string
   */
  formatDateTime: (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime && {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error';
    }
  },
  
  /**
   * Format a number as currency
   */
  formatCurrency,
  
  /**
   * Convert to number safely
   */
  toNumber
};

export default formatters;
