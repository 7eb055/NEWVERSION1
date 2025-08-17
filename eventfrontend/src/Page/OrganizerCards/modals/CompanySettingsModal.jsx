import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import Modal from '../Modal';

const CompanySettingsModal = ({ isOpen, onClose }) => {
  const { showError, showSuccess } = useDashboardState();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    industry: '',
    size: '',
    description: '',
    logo_url: '',
    status: 'active'
  });

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Fetch companies on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen, fetchCompanies]);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      website: company.website || '',
      industry: company.industry || '',
      size: company.size || '',
      description: company.description || '',
      logo_url: company.logo_url || '',
      status: company.status || 'active'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = selectedCompany 
        ? `/api/companies/${selectedCompany.company_id}`
        : '/api/companies';
      
      const method = selectedCompany ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save company');
      }

      showSuccess(selectedCompany ? 'Company updated successfully!' : 'Company created successfully!');
      fetchCompanies();
      resetForm();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      showSuccess('Company deleted successfully!');
      fetchCompanies();
      resetForm();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      industry: '',
      size: '',
      description: '',
      logo_url: '',
      status: 'active'
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Company Settings & Information">
      <div className="company-settings-modal">
        <div className="modal-layout">
          {/* Company List Sidebar */}
          <div className="company-sidebar">
            <div className="sidebar-header">
              <h4>Companies</h4>
              <button 
                className="btn-primary btn-sm"
                onClick={resetForm}
                disabled={loading}
              >
                <i className="fas fa-plus"></i>
                Add New
              </button>
            </div>
            
            <div className="company-list">
              {loading && companies.length === 0 && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading companies...</p>
                </div>
              )}
              
              {companies.map(company => (
                <div 
                  key={company.company_id}
                  className={`company-item ${selectedCompany?.company_id === company.company_id ? 'active' : ''}`}
                  onClick={() => handleCompanySelect(company)}
                >
                  <div className="company-info">
                    <h5>{company.name}</h5>
                    <p>{company.email}</p>
                    <span className={`status ${company.status}`}>
                      {company.status}
                    </span>
                  </div>
                  <div className="company-actions">
                    <button
                      className="btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(company.company_id);
                      }}
                      disabled={loading}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
              
              {companies.length === 0 && !loading && (
                <div className="empty-state">
                  <i className="fas fa-building"></i>
                  <p>No companies found</p>
                </div>
              )}
            </div>
          </div>

          {/* Company Form */}
          <div className="company-form-section">
            <form onSubmit={handleSubmit}>
              <div className="form-header">
                <h4>
                  {selectedCompany ? 'Edit Company' : 'Add New Company'}
                </h4>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="org-label">Company Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="org-input"
                    required
                    placeholder="Enter company name"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="org-input"
                    required
                    placeholder="Enter email address"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="org-input"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="org-input"
                    placeholder="Enter website URL"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Industry</label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="org-select"
                  >
                    <option value="">Select industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Construction">Construction</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="org-label">Company Size</label>
                  <select
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    className="org-select"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="org-label">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="org-textarea"
                    rows="3"
                    placeholder="Enter company address"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="org-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="org-textarea"
                    rows="4"
                    placeholder="Enter company description"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Logo URL</label>
                  <input
                    type="url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleInputChange}
                    className="org-input"
                    placeholder="Enter logo URL"
                  />
                </div>

                <div className="form-group">
                  <label className="org-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="org-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-sm"></div>
                      {selectedCompany ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className={`fas ${selectedCompany ? 'fa-save' : 'fa-plus'}`}></i>
                      {selectedCompany ? 'Update Company' : 'Create Company'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CompanySettingsModal;
