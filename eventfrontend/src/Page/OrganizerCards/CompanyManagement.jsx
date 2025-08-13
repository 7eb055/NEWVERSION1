import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import CompanyRegistration from './CompanyRegistration';

import './css/CompanyManagement.css';

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  // Fetch companies when component mounts
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Function to fetch companies from the API
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = AuthTokenService.getToken();
      
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setCompanies(response.data.companies || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to fetch companies. Please try again.');
      setLoading(false);
    }
  };

  // Function to handle company registration or update
  const handleCompanySubmit = async (data) => {
    setShowRegistrationForm(false);
    setLoading(true);
    
    try {
      // Refresh the companies list after update
      await fetchCompanies();
      
      // Reset form state
      setCurrentCompany(null);
      setEditMode(false);
    } catch (err) {
      console.error('Error updating companies list:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to start editing a company
  const handleEditCompany = (company) => {
    setCurrentCompany(company);
    setEditMode(true);
    setShowRegistrationForm(true);
  };

  // Function to show delete confirmation
  const handleDeleteClick = (companyId) => {
    setDeleteConfirm({ show: true, id: companyId });
  };

  // Function to confirm and process company deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      setLoading(true);
      const token = AuthTokenService.getToken();
      
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies/${deleteConfirm.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Remove the deleted company from state
      setCompanies(companies.filter(company => company.company_id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
      setLoading(false);
    } catch (err) {
      console.error('Error deleting company:', err);
      
      let errorMessage = 'Failed to delete company. Please try again.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      setDeleteConfirm({ show: false, id: null });
    }
  };

  // Function to cancel company registration or edit
  const handleCancel = () => {
    setShowRegistrationForm(false);
    setCurrentCompany(null);
    setEditMode(false);
  };

  // Helper function to parse contact_info JSON
  const parseContactInfo = (contactInfo) => {
    if (!contactInfo) return { email: '', phone: '', contact_person: '', website: '' };
    
    try {
      // If it's already an object, just return it
      if (typeof contactInfo === 'object' && contactInfo !== null) {
        return contactInfo;
      }
      
      // If it's a string, try to parse it as JSON
      if (typeof contactInfo === 'string') {
        // Check if it looks like a JSON object (starts with { and ends with })
        if (contactInfo.trim().startsWith('{') && contactInfo.trim().endsWith('}')) {
          return JSON.parse(contactInfo);
        }
        
        // If it seems to be an email, treat it as such
        if (contactInfo.includes('@')) {
          return { email: contactInfo, phone: '', contact_person: '', website: '' };
        }
        
        // If it's a phone number (simplistic check)
        if (contactInfo.replace(/[^0-9+]/g, '').length > 7) {
          return { email: '', phone: contactInfo, contact_person: '', website: '' };
        }
        
        // For other strings, assume it's a contact person
        return { email: '', phone: '', contact_person: contactInfo, website: '' };
      }
      
      // Default empty object if nothing else matches
      return { email: '', phone: '', contact_person: '', website: '' };
    } catch (err) {
      console.error('Error parsing contact info:', err);
      
      // If parsing failed but we have a string, make a best effort to use it
      if (typeof contactInfo === 'string') {
        if (contactInfo.includes('@')) {
          return { email: contactInfo, phone: '', contact_person: '', website: '' };
        } else {
          return { email: '', phone: '', contact_person: contactInfo, website: '' };
        }
      }
      
      return { email: '', phone: '', contact_person: '', website: '' };
    }
  };

  // Render loading state
  if (loading && companies.length === 0) {
    return (
      <div className="company-management-container">
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i> Loading companies...
        </div>
      </div>
    );
  }

  // Render registration form if active
  if (showRegistrationForm) {
    let initialData = currentCompany;
    
    // If we have current company data and it has contact_info, parse it for the form
    if (initialData && initialData.contact_info) {
      const contactInfo = parseContactInfo(initialData.contact_info);
      initialData = {
        ...initialData,
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        contact_person: contactInfo.contact_person || '',
        website: contactInfo.website || ''
      };
    }
    
    return (
      <CompanyRegistration
        onSubmit={handleCompanySubmit}
        onCancel={handleCancel}
        isLoading={loading}
        editMode={editMode}
        initialData={initialData}
      />
    );
  }

  return (
    <div className="company-management-container">
      <div className="company-management-header">
        <h2>Company Management</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowRegistrationForm(true);
            setEditMode(false);
            setCurrentCompany(null);
          }}
        >
          <i className="fas fa-plus"></i> Register New Company
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      
      {companies.length === 0 ? (
        <div className="no-companies">
          <p>No companies registered yet. Click "Register New Company" to add your first company.</p>
        </div>
      ) : (
        <div className="company-list">
          {companies.map(company => {
            const contactInfo = parseContactInfo(company.contact_info);
            
            return (
              <div key={company.company_id} className="company-card">
                <div className="company-header">
                  <h3>{company.company_name}</h3>
                  <span className="company-type">{company.company_type}</span>
                </div>
                
                <div className="company-details">
                  <p><strong>Category:</strong> {company.category || 'Not specified'}</p>
                  <p><strong>Contact:</strong> {contactInfo.contact_person || 'Not specified'}</p>
                  <p><strong>Email:</strong> {contactInfo.email || 'Not specified'}</p>
                  <p><strong>Phone:</strong> {contactInfo.phone || 'Not specified'}</p>
                  
                  {contactInfo.website && (
                    <p>
                      <strong>Website:</strong> <a href={contactInfo.website} target="_blank" rel="noopener noreferrer">
                        {contactInfo.website}
                      </a>
                    </p>
                  )}
                  
                  {company.address && <p><strong>Address:</strong> {company.address}</p>}
                  
                  {company.services && (
                    <div className="company-services">
                      <strong>Services:</strong>
                      <p>{company.services}</p>
                    </div>
                  )}
                  
                  {company.description && (
                    <div className="company-description">
                      <strong>Description:</strong>
                      <p>{company.description}</p>
                    </div>
                  )}
                </div>
                
                <div className="company-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleEditCompany(company)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteClick(company.company_id)}
                  >
                    <i className="fas fa-trash-alt"></i> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Delete confirmation modal */}
      {deleteConfirm.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this company? This action cannot be undone.</p>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                disabled={loading}
              >
                Cancel
              </button>
              
              <button 
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt"></i> Delete Company
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
