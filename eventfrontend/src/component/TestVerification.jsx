import { useState } from 'react';
import axios from 'axios';

const TestVerification = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkUserStatus = async () => {
    if (!email) {
      alert('Please enter an email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/auth/debug-user/${email}`);
      setDebugInfo(response.data);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error.response?.data?.message || 'Error checking user status' });
    } finally {
      setLoading(false);
    }
  };

  const checkTokenStatus = async () => {
    if (!token) {
      alert('Please enter a token');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/auth/debug-token/${token}`);
      setDebugInfo(response.data);
    } catch (error) {
      console.error('Token debug error:', error);
      setDebugInfo({ error: error.response?.data?.message || 'Error checking token status' });
    } finally {
      setLoading(false);
    }
  };

  const testVerification = async () => {
    if (!token) {
      alert('Please enter a token');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5001/api/auth/verify-email`, { token });
      setVerificationResult({ success: true, data: response.data });
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({ 
        success: false, 
        error: error.response?.data?.message || 'Verification failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Email Verification Testing Tool</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Check User Status</h3>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to check"
          style={{ width: '300px', padding: '8px', marginRight: '10px' }}
        />
        <button onClick={checkUserStatus} disabled={loading}>
          Check User Status
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Check Token Status (without using it)</h3>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter verification token"
          style={{ width: '300px', padding: '8px', marginRight: '10px' }}
        />
        <button onClick={checkTokenStatus} disabled={loading}>
          Check Token
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Verification (this will use the token)</h3>
        <button onClick={testVerification} disabled={loading || !token}>
          Verify Email
        </button>
      </div>

      {loading && <div>Loading...</div>}

      {debugInfo && (
        <div style={{ marginTop: '20px' }}>
          <h3>Debug Information</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {verificationResult && (
        <div style={{ marginTop: '20px' }}>
          <h3>Verification Result</h3>
          <div style={{ 
            background: verificationResult.success ? '#d4edda' : '#f8d7da', 
            padding: '10px', 
            borderRadius: '4px',
            color: verificationResult.success ? '#155724' : '#721c24'
          }}>
            {verificationResult.success ? 
              `Success: ${JSON.stringify(verificationResult.data)}` : 
              `Error: ${verificationResult.error}`
            }
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h4>Usage Instructions:</h4>
        <ol>
          <li>First, register a new user through the signup page</li>
          <li>Check the user's status using their email (should show unverified with a token)</li>
          <li>Get the verification token from the email or database</li>
          <li>Use "Check Token" to verify the token exists without consuming it</li>
          <li>Use "Test Verification" to actually verify the email</li>
          <li>Check the user status again to confirm verification</li>
        </ol>
      </div>
    </div>
  );
};

export default TestVerification;
