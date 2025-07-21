import React, { useState } from 'react';

const QRCodeGenerator = ({ ticketData, onClose }) => {
  const [qrCode, setQrCode] = useState(null);

  // Generate QR code data string
  const generateQRData = () => {
    const qrData = {
      ticketId: ticketData.id,
      eventId: ticketData.eventId,
      attendeeName: ticketData.attendeeName,
      attendeeEmail: ticketData.attendeeEmail,
      tierName: ticketData.tierName,
      price: ticketData.price,
      purchaseDate: ticketData.purchaseDate,
      verificationCode: `VER${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(qrData);
  };

  // In a real application, you would use a QR code library like qrcode.js
  // For demo purposes, we'll create a visual representation
  const generateQRCode = () => {
    const data = generateQRData();
    const qrCodeId = `QR${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    setQrCode({
      id: qrCodeId,
      data: data,
      generated: new Date().toISOString()
    });
  };

  const downloadTicket = () => {
    // In a real app, this would generate a PDF or image file
    const ticketContent = `
DIGITAL TICKET RECEIPT
======================

Event: ${ticketData.eventName || 'Tech Conference 2025'}
Ticket: ${ticketData.tierName} - $${ticketData.price}
Attendee: ${ticketData.attendeeName}
Email: ${ticketData.attendeeEmail}
Purchase Date: ${new Date(ticketData.purchaseDate).toLocaleDateString()}

QR Code: ${qrCode?.id || 'Not Generated'}
Verification: ${qrCode?.data ? 'Valid' : 'Pending'}

Instructions:
- Present this ticket at the venue entrance
- QR code will be scanned for verification
- Keep this receipt for your records

Generated: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket_${ticketData.id}_receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendTicketEmail = () => {
    // In a real app, this would send an email with the ticket
    alert(`Ticket would be sent to ${ticketData.attendeeEmail}`);
  };

  return (
    <div className="qr-generator-modal">
      <div className="qr-generator-content">
        <div className="qr-header">
          <h2>
            <i className="fas fa-qrcode"></i>
            Generate QR Ticket Receipt
          </h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="qr-body">
          <div className="ticket-preview">
            <div className="preview-header">
              <h3>Digital Ticket Receipt</h3>
              <div className="ticket-id">#{ticketData.id}</div>
            </div>

            <div className="qr-section">
              {qrCode ? (
                <div className="qr-code-generated">
                  <div className="qr-visual">
                    <div className="qr-grid">
                      {/* Visual QR code representation */}
                      {[...Array(25)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`qr-pixel ${Math.random() > 0.4 ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="qr-info">
                    <p><strong>QR Code:</strong> {qrCode.id}</p>
                    <p><strong>Generated:</strong> {new Date(qrCode.generated).toLocaleString()}</p>
                    <div className="verification-status">
                      <i className="fas fa-check-circle"></i>
                      Valid for verification
                    </div>
                  </div>
                </div>
              ) : (
                <div className="qr-placeholder">
                  <i className="fas fa-qrcode"></i>
                  <p>Click "Generate QR Code" to create verification code</p>
                </div>
              )}
            </div>

            <div className="ticket-details">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Event:</label>
                  <span>{ticketData.eventName || 'Tech Conference 2025'}</span>
                </div>
                <div className="detail-item">
                  <label>Ticket Type:</label>
                  <span>{ticketData.tierName}</span>
                </div>
                <div className="detail-item">
                  <label>Price:</label>
                  <span>${ticketData.price}</span>
                </div>
                <div className="detail-item">
                  <label>Attendee:</label>
                  <span>{ticketData.attendeeName}</span>
                </div>
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{ticketData.attendeeEmail}</span>
                </div>
                <div className="detail-item">
                  <label>Purchase Date:</label>
                  <span>{new Date(ticketData.purchaseDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="qr-actions">
          <div className="action-group">
            <button 
              className="btn-generate"
              onClick={generateQRCode}
              disabled={qrCode !== null}
            >
              <i className="fas fa-qrcode"></i>
              {qrCode ? 'QR Code Generated' : 'Generate QR Code'}
            </button>
          </div>

          <div className="action-group">
            <button 
              className="btn-download"
              onClick={downloadTicket}
              disabled={!qrCode}
            >
              <i className="fas fa-download"></i>
              Download Receipt
            </button>
            <button 
              className="btn-email"
              onClick={sendTicketEmail}
              disabled={!qrCode}
            >
              <i className="fas fa-envelope"></i>
              Email to Attendee
            </button>
            <button 
              className="btn-print"
              onClick={() => window.print()}
              disabled={!qrCode}
            >
              <i className="fas fa-print"></i>
              Print Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
