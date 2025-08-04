import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import './css/CompanyRegistration.css';

const CompanyRegistration = ({ onSubmit, onCancel, isLoading, editMode = false, initialData = null }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    company_type: 'vendor',
    category: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
    contact_person: '',
    services: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Initialize form with data if in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        company_name: initialData.company_name || '',
        company_type: initialData.company_type || 'vendor',
        category: initialData.category || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        website: initialData.website || '',
        description: initialData.description || '',
        contact_person: initialData.contact_person || '',
        services: initialData.services || ''
      });
    }
  }, [editMode, initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    
    if (validateForm()) {
      try {
        const token = AuthTokenService.getToken();
        
        if (!token) {
          setErrors({ general: 'You must be logged in to register a company' });
          return;
        }
        
        // Create a contact_info object that contains email, phone, contact_person, and website
        const contactInfo = {
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          contact_person: formData.contact_person.trim(),
          website: formData.website.trim()
        };
        
        // Prepare data for backend API
        const companyData = {
          company_name: formData.company_name.trim(),
          company_type: formData.company_type,
          category: formData.category.trim(),
          address: formData.address.trim() || null,
          contact_info: contactInfo,
          description: formData.description.trim() || null,
          services: formData.services.trim() || null
        };
        
        let response;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        if (editMode && initialData?.company_id) {
          // Update existing company
          response = await axios.put(
            `${baseUrl}/api/companies/${initialData.company_id}`,
            companyData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          setSuccess('Company updated successfully!');
        } else {
          // Create new company
          response = await axios.post(
            `${baseUrl}/api/companies`,
            companyData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          setSuccess('Company registered successfully!');
        }
        
        // Call the parent component's onSubmit with the API response
        onSubmit(response.data);
      } catch (error) {
        console.error('Company registration error:', error);
        let errorMessage = 'Failed to register company. Please try again.';
        
        if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        
        setErrors({ general: errorMessage });
            }
    }
  };

  return (
    <div className="company-registration">
      <div className="form-container">
        <div className="form-title">
          <i className="fas fa-building"></i>
          {editMode ? 'Edit Company' : 'Register Event Company'}
        </div>

        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {success}
          </div>
        )}
        
        {errors.general && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="company_name">Company Name *</label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="Enter company name"
                className={errors.company_name ? 'error' : ''}
              />
              {errors.company_name && <span className="error-text">{errors.company_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="company_type">Company Type *</label>
              <select
                id="company_type"
                name="company_type"
                value={formData.company_type}
                onChange={handleInputChange}
              >
                <option value="vendor">Vendor</option>
                <option value="sponsor">Sponsor</option>
                <option value="partner">Partner</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Catering, Technology, Marketing"
                className={errors.category ? 'error' : ''}
              />
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="company@example.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1-555-0123"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://company.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact_person">Contact Person *</label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                placeholder="Contact person name"
                className={errors.contact_person ? 'error' : ''}
              />
              {errors.contact_person && <span className="error-text">{errors.contact_person}</span>}
            </div>

            <div className="form-group full-width">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Company address"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="services">Services/Products</label>
              <textarea
                id="services"
                name="services"
                value={formData.services}
                onChange={handleInputChange}
                placeholder="Describe the services or products offered"
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional company information"
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-building"></i>
                  {editMode ? 'Update Company' : 'Register Company'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyRegistration;