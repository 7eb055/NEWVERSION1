// Test file to verify ApiService generic methods
import ApiService from './services/ApiService.js';

// Test the get method
console.log('Testing ApiService.get method...');
try {
  // This should work now
  console.log('ApiService get method exists:', typeof ApiService.get === 'function');
  console.log('ApiService post method exists:', typeof ApiService.post === 'function');
  console.log('ApiService put method exists:', typeof ApiService.put === 'function');
  console.log('ApiService delete method exists:', typeof ApiService.delete === 'function');
} catch (error) {
  console.error('Error testing ApiService methods:', error);
}
