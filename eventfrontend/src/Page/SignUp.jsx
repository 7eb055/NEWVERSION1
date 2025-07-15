import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/SignUp.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'attendee',
    companyName: '',
    contactPerson: '',
    location: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    console.log('Sign up data:', formData);
    // Handle sign up logic here
  };

  return (
    <div className="signup-container">
      {/* Back to Home Button */}
      <Link to="/" className="back-home-btn">
        ← Back to Home
      </Link>
      
      {/* Left Side - Form */}
      <div className="signup-form-section">
        <div className="form-wrapper">
          <div className="form-header">
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">
              Join us today and start your journey. Fill in the details below to get started.
            </p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                <i className="fas fa-user"></i>
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="form-input"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <i className="fas fa-envelope"></i>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <i className="fas fa-lock"></i>
                Password
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <i className="fas fa-lock"></i>
                Confirm Password
              </label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-users"></i>
                Choose Your Role
              </label>
              <div className="role-selection">
                <div className="role-option">
                  <input
                    type="radio"
                    id="attendee"
                    name="role"
                    value="attendee"
                    checked={formData.role === 'attendee'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="attendee" className="role-label">
                    <i className="fas fa-user-friends"></i>
                    <span>Attendee</span>
                    <small>Join events and connect with others</small>
                  </label>
                </div>
                <div className="role-option">
                  <input
                    type="radio"
                    id="organizer"
                    name="role"
                    value="organizer"
                    checked={formData.role === 'organizer'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="organizer" className="role-label">
                    <i className="fas fa-building"></i>
                    <span>Organizer/Company</span>
                    <small>Create and manage events</small>
                  </label>
                </div>
              </div>
            </div>

            {/* Conditional Fields for Organizer */}
            {formData.role === 'organizer' && (
              <div className="organizer-fields">
                {/* Company Name */}
                <div className="form-group">
                  <label htmlFor="companyName" className="form-label">
                    <i className="fas fa-building"></i>
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    className="form-input"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Contact Person */}
                <div className="form-group">
                  <label htmlFor="contactPerson" className="form-label">
                    <i className="fas fa-user-tie"></i>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    className="form-input"
                    placeholder="Primary contact person"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Location */}
                <div className="form-group">
                  <label htmlFor="location" className="form-label">
                    <i className="fas fa-map-marker-alt"></i>
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    className="form-input"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="signup-btn">
              <i className="fas fa-user-plus"></i>
              Create Account
            </button>

            {/* Social Sign Up */}
            <div className="divider">
              <span>Or sign up with</span>
            </div>

            <div className="social-signup">
              <button type="button" className="social-btn google-btn">
                <i className="fab fa-google"></i>
                Google
              </button>
              <button type="button" className="social-btn facebook-btn">
                <i className="fab fa-facebook-f"></i>
                Facebook
              </button>
            </div>

            {/* Login Link */}
            <p className="login-link">
              Already have an account? 
              <Link to="/login"> Sign in here</Link>
            </p>
          </form>

          <div className="form-footer">
            <p>© 2023 ALL RIGHTS RESERVED</p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="signup-image-section">
        <div className="image-overlay">
          <div className="overlay-content">
            <h2>Welcome to Our Community</h2>
            <p>Join thousands of people who are already part of our amazing platform</p>
            <div className="stats">
              <div className="stat-item">
                <i className="fas fa-users"></i>
                <span>10,000+ Members</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-calendar-alt"></i>
                <span>500+ Events</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-globe"></i>
                <span>50+ Countries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
