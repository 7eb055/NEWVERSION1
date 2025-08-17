import React, { useState } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import AuthTokenService from '../../../services/AuthTokenService';
import Modal from '../Modal';

const CompanyRegistrationModal = () => {
  const {
    showCompanyForm,
    setShowCompanyForm
  } = useDashboardState();

  const [companyData, setCompanyData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_website: '',
    industry: '',
    company_size: '',
    description: '',
    contact_person: '',
    contact_title: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle modal close
  const handleClose = () => {
    setShowCompanyForm(false);
    setCompanyData({
      company_name: '',
      company_email: '',
      company_phone: '',
      company_address: '',
      company_website: '',
      industry: '',
      company_size: '',
      description: '',
      contact_person: '',
      contact_title: ''
    });
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = AuthTokenService.getToken() || localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register company');
      }

      await response.json();
      setSuccess('Company registered successfully!');
      
      // Close modal after short delay
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error registering company:', error);
      setError(error.message || 'Failed to register company');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showCompanyForm) return null;

  return (
    <Modal
      isOpen={showCompanyForm}
      onClose={handleClose}
      title="Register New Company"
      maxWidth="60%"
    >
      <div className="company-registration-form">
        {/* Success/Error Messages */}
        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Company Information */}
          <div className="form-section">
            <h3 className="section-title">Company Information</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="company_name">Company Name *</label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={companyData.company_name}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_email">Company Email *</label>
                <input
                  type="email"
                  id="company_email"
                  name="company_email"
                  value={companyData.company_email}
                  onChange={handleInputChange}
                  placeholder="company@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_phone">Phone Number</label>
                <input
                  type="tel"
                  id="company_phone"
                  name="company_phone"
                  value={companyData.company_phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_website">Website</label>
                <input
                  type="url"
                  id="company_website"
                  name="company_website"
                  value={companyData.company_website}
                  onChange={handleInputChange}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="company_address">Address</label>
              <textarea
                id="company_address"
                name="company_address"
                value={companyData.company_address}
                onChange={handleInputChange}
                placeholder="Enter complete company address"
                rows="3"
              />
            </div>
          </div>

          {/* Company Details */}
          <div className="form-section">
            <h3 className="section-title">Company Details</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <select
                  id="industry"
                  name="industry"
                  value={companyData.industry}
                  onChange={handleInputChange}
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Government">Government</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="company_size">Company Size</label>
                <select
                  id="company_size"
                  name="company_size"
                  value={companyData.company_size}
                  onChange={handleInputChange}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Company Description</label>
              <textarea
                id="description"
                name="description"
                value={companyData.description}
                onChange={handleInputChange}
                placeholder="Brief description of your company"
                rows="4"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div className="form-section">
            <h3 className="section-title">Primary Contact</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="contact_person">Contact Person *</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={companyData.contact_person}
                  onChange={handleInputChange}
                  placeholder="Full name of primary contact"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_title">Job Title</label>
                <input
                  type="text"
                  id="contact_title"
                  name="contact_title"
                  value={companyData.contact_title}
                  onChange={handleInputChange}
                  placeholder="e.g., CEO, Manager, Director"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-building"></i>
                  Register Company
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CompanyRegistrationModal;
