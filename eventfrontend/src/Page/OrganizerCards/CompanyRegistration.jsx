import React, { useState } from 'react';

const CompanyRegistration = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'vendor',
    category: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
    contactPerson: '',
    services: ''
  });

  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
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

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Company Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter company name"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="type">Company Type *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
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
              <label htmlFor="contactPerson">Contact Person *</label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                placeholder="Contact person name"
                className={errors.contactPerson ? 'error' : ''}
              />
              {errors.contactPerson && <span className="error-text">{errors.contactPerson}</span>}
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
                  Register Company
                </>
              )}
            </button>
          </div>
        </form>
  );
};

export default CompanyRegistration;
