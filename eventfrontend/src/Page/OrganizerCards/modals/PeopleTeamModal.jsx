import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import Modal from '../Modal';

const PeopleTeamModal = ({ isOpen, onClose }) => {
  const { showError, showSuccess } = useDashboardState();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('team'); // team, roles, permissions
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    position: '',
    hire_date: '',
    salary: '',
    status: 'active',
    permissions: [],
    profile_image: '',
    bio: '',
    skills: '',
    emergency_contact: '',
    address: ''
  });

  // Removed unused roleData state - role management is handled in the roles tab view

  const availablePermissions = [
    'create_events',
    'edit_events',
    'delete_events',
    'view_reports',
    'manage_users',
    'manage_companies',
    'manage_registrations',
    'view_analytics',
    'export_data',
    'manage_settings'
  ];

  const departments = [
    'Administration',
    'Events',
    'Marketing',
    'Sales',
    'IT',
    'Finance',
    'Human Resources',
    'Operations'
  ];

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setTeamMembers(data.team || []);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen, fetchTeamMembers]);

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || '',
      department: member.department || '',
      position: member.position || '',
      hire_date: member.hire_date ? member.hire_date.split('T')[0] : '',
      salary: member.salary || '',
      status: member.status || 'active',
      permissions: member.permissions || [],
      profile_image: member.profile_image || '',
      bio: member.bio || '',
      skills: member.skills || '',
      emergency_contact: member.emergency_contact || '',
      address: member.address || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleSubmitMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = selectedMember 
        ? `/api/team/${selectedMember.user_id}`
        : '/api/team';
      
      const method = selectedMember ? 'PUT' : 'POST';

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
        throw new Error(errorData.message || 'Failed to save team member');
      }

      showSuccess(selectedMember ? 'Team member updated successfully!' : 'Team member added successfully!');
      fetchTeamMembers();
      resetForm();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/team/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }

      showSuccess('Team member removed successfully!');
      fetchTeamMembers();
      resetForm();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMember(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: '',
      department: '',
      position: '',
      hire_date: '',
      salary: '',
      status: 'active',
      permissions: [],
      profile_image: '',
      bio: '',
      skills: '',
      emergency_contact: '',
      address: ''
    });
  };

  const handleClose = () => {
    resetForm();
    setActiveTab('team');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="People & Team Management">
      <div className="people-team-modal">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <i className="fas fa-users"></i>
            Team Members
          </button>
          <button 
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <i className="fas fa-user-tag"></i>
            Roles
          </button>
          <button 
            className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <i className="fas fa-shield-alt"></i>
            Permissions
          </button>
        </div>

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div className="modal-layout">
            {/* Team List Sidebar */}
            <div className="team-sidebar">
              <div className="sidebar-header">
                <h4>Team Members</h4>
                <button 
                  className="btn-primary btn-sm"
                  onClick={resetForm}
                  disabled={loading}
                >
                  <i className="fas fa-user-plus"></i>
                  Add Member
                </button>
              </div>
              
              <div className="team-list">
                {loading && teamMembers.length === 0 && (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading team...</p>
                  </div>
                )}
                
                {teamMembers.map(member => (
                  <div 
                    key={member.user_id}
                    className={`team-item ${selectedMember?.user_id === member.user_id ? 'active' : ''}`}
                    onClick={() => handleMemberSelect(member)}
                  >
                    <div className="member-avatar">
                      {member.profile_image ? (
                        <img src={member.profile_image} alt={`${member.first_name} ${member.last_name}`} />
                      ) : (
                        <div className="avatar-placeholder">
                          {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                        </div>
                      )}
                    </div>
                    <div className="member-info">
                      <h5>{member.first_name} {member.last_name}</h5>
                      <p>{member.position || member.role}</p>
                      <span className={`status ${member.status}`}>
                        {member.status}
                      </span>
                    </div>
                    <div className="member-actions">
                      <button
                        className="btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMember(member.user_id);
                        }}
                        disabled={loading}
                      >
                        <i className="fas fa-user-minus"></i>
                      </button>
                    </div>
                  </div>
                ))}
                
                {teamMembers.length === 0 && !loading && (
                  <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <p>No team members found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Member Form */}
            <div className="member-form-section">
              <form onSubmit={handleSubmitMember}>
                <div className="form-header">
                  <h4>
                    {selectedMember ? 'Edit Team Member' : 'Add New Team Member'}
                  </h4>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="org-label">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="org-input"
                      required
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="org-label">Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="org-input"
                      required
                      placeholder="Enter last name"
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
                    <label className="org-label">Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="org-select"
                    >
                      <option value="">Select department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="org-label">Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="org-input"
                      placeholder="Enter position/job title"
                    />
                  </div>

                  <div className="form-group">
                    <label className="org-label">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="org-select"
                    >
                      <option value="">Select role</option>
                      <option value="admin">Admin</option>
                      <option value="organizer">Organizer</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="org-label">Hire Date</label>
                    <input
                      type="date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      className="org-input"
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
                      <option value="on_leave">On Leave</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="org-label">Profile Image URL</label>
                    <input
                      type="url"
                      name="profile_image"
                      value={formData.profile_image}
                      onChange={handleInputChange}
                      className="org-input"
                      placeholder="Enter image URL"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="org-label">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="org-textarea"
                      rows="3"
                      placeholder="Enter team member bio"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="org-label">Skills</label>
                    <input
                      type="text"
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      className="org-input"
                      placeholder="Enter skills (comma-separated)"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="org-label">Permissions</label>
                    <div className="permissions-grid">
                      {availablePermissions.map(permission => (
                        <label key={permission} className="permission-item">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission)}
                          />
                          <span>{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
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
                        {selectedMember ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <i className={`fas ${selectedMember ? 'fa-save' : 'fa-user-plus'}`}></i>
                        {selectedMember ? 'Update Member' : 'Add Member'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="roles-section">
            <div className="section-header">
              <h4>Role Management</h4>
              <p>Define and manage team roles and their associated permissions.</p>
            </div>
            
            <div className="role-stats">
              <div className="stat-card">
                <h5>Total Roles</h5>
                <span className="stat-value">5</span>
              </div>
              <div className="stat-card">
                <h5>Active Members</h5>
                <span className="stat-value">{teamMembers.filter(m => m.status === 'active').length}</span>
              </div>
              <div className="stat-card">
                <h5>Departments</h5>
                <span className="stat-value">{departments.length}</span>
              </div>
            </div>

            <div className="roles-grid">
              {['admin', 'organizer', 'manager', 'staff', 'volunteer'].map(role => (
                <div key={role} className="role-card">
                  <div className="role-header">
                    <h5>{role.charAt(0).toUpperCase() + role.slice(1)}</h5>
                    <span className="member-count">
                      {teamMembers.filter(m => m.role === role).length} members
                    </span>
                  </div>
                  <div className="role-permissions">
                    <p>Key Permissions:</p>
                    <ul>
                      {role === 'admin' && (
                        <>
                          <li>Full system access</li>
                          <li>Manage all users</li>
                          <li>System settings</li>
                        </>
                      )}
                      {role === 'organizer' && (
                        <>
                          <li>Create/edit events</li>
                          <li>Manage registrations</li>
                          <li>View reports</li>
                        </>
                      )}
                      {role === 'manager' && (
                        <>
                          <li>Team oversight</li>
                          <li>View analytics</li>
                          <li>Export data</li>
                        </>
                      )}
                      {role === 'staff' && (
                        <>
                          <li>Basic event access</li>
                          <li>View assigned tasks</li>
                        </>
                      )}
                      {role === 'volunteer' && (
                        <>
                          <li>Limited event access</li>
                          <li>Check-in attendees</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="permissions-section">
            <div className="section-header">
              <h4>Permission Management</h4>
              <p>Overview of all system permissions and their usage.</p>
            </div>

            <div className="permissions-overview">
              {availablePermissions.map(permission => {
                const usageCount = teamMembers.filter(member => 
                  member.permissions && member.permissions.includes(permission)
                ).length;

                return (
                  <div key={permission} className="permission-overview-card">
                    <div className="permission-info">
                      <h5>{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                      <p>{usageCount} team members have this permission</p>
                    </div>
                    <div className="permission-usage">
                      <div className="usage-bar">
                        <div 
                          className="usage-fill" 
                          style={{ width: `${(usageCount / Math.max(teamMembers.length, 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="usage-percent">
                        {Math.round((usageCount / Math.max(teamMembers.length, 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PeopleTeamModal;
