// Debug utility - Run this in browser console to check token
// Copy and paste this into your browser's developer console

function debugToken() {
  console.log('=== TOKEN DEBUG ===');
  
  const token = localStorage.getItem('token');
  console.log('Token exists:', !!token);
  console.log('Token type:', typeof token);
  console.log('Token length:', token ? token.length : 'N/A');
  
  if (token) {
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    try {
      const parts = token.split('.');
      console.log('Token parts:', parts.length);
      
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        
        console.log('Token header:', header);
        console.log('Token payload:', payload);
        console.log('Token expires:', new Date(payload.exp * 1000));
        console.log('Token expired?', payload.exp < Date.now() / 1000);
      }
    } catch (e) {
      console.error('Token decode error:', e);
    }
  }
  
  console.log('==================');
}

// Run the debug
debugToken();
