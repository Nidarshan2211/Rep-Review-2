import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProfilePage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingPass, setChangingPass] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Leave Application State (for Building Owners)
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveConfirmText, setLeaveConfirmText] = useState('');
  const [leavingApp, setLeavingApp] = useState(false);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  const fetchProfile = () => {
    API.get('/user/profile')
      .then(res => {
        setProfile(res.data);
        if (res.data?.phone && res.data.phone !== 'N/A') {
          setPhoneInput(res.data.phone);
        }
      })
      .catch(err => {
        console.error("Failed to load profile", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading && !profile) return <LoadingSpinner text="Loading My Profile details..." />;

  const displayUser = profile || user || {};
  const initialLetter = (displayUser?.name || 'User').charAt(0).toUpperCase();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="badge bg-dark text-white px-3 py-1.5 fs-8 rounded-pill"><i className="bi bi-shield-lock-fill me-1"></i> Super Admin</span>;
      case 'BUILDING_OWNER':
        return <span className="badge text-white px-3 py-1.5 fs-8 rounded-pill" style={{ backgroundColor: '#005F73' }}><i className="bi bi-building me-1"></i> Building Owner</span>;
      case 'RESIDENT':
        return <span className="badge text-white px-3 py-1.5 fs-8 rounded-pill" style={{ backgroundColor: '#0A9396' }}><i className="bi bi-person-badge me-1"></i> Resident</span>;
      default:
        return <span className="badge bg-secondary px-3 py-1.5 fs-8 rounded-pill">{role || 'USER'}</span>;
    }
  };

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
      return;
    }
    setUpdatingPhone(true);
    setMessage(null);
    try {
      const res = await API.put('/user/profile', { name: displayUser.name, phone: phoneInput.trim() });
      setProfile(res.data);
      setEditingPhone(false);
      setMessage({ type: 'success', text: 'Phone number updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update phone number' });
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }
    setChangingPass(true);
    setMessage(null);
    try {
      const res = await API.put('/user/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: res.data?.message || 'Password changed successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Password update failed' });
    } finally {
      setChangingPass(false);
    }
  };

  const handleLeaveApplication = async () => {
    setLeavingApp(true);
    setMessage(null);
    try {
      await API.delete('/owners/leave');
      setShowLeaveModal(false);
      logout();
      navigate('/login');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to complete account closure. Please try again.' });
      setShowLeaveModal(false);
    } finally {
      setLeavingApp(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Profile Header Banner */}
      <div className="card glass-card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="text-white rounded-circle fw-bold d-flex align-items-center justify-content-center shadow"
              style={{ width: 64, height: 64, fontSize: '1.75rem', backgroundColor: '#005F73' }}
            >
              {initialLetter}
            </div>
            <div>
              <h3 className="fw-extrabold text-dark mb-1">{displayUser.name || 'User Profile'}</h3>
              <p className="text-muted small mb-1.5">{displayUser.email || 'N/A'}</p>
              <div>{getRoleBadge(displayUser.role)}</div>
            </div>
          </div>

          <div className="text-end border-start ps-md-4 d-none d-sm-block">
            <small className="text-muted fw-semibold text-uppercase fs-8 d-block mb-1">Account Status</small>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 fw-bold fs-7">
              <i className="bi bi-check-circle-fill me-1"></i> {displayUser.status || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Message Notification */}
      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success border-success-subtle' : 'alert-danger border-danger-subtle'} rounded-4 shadow-sm mb-4 alert-dismissible fade show p-3`}>
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} me-2 fs-6`}></i>
          <span className="fw-semibold fs-7">{message.text}</span>
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {/* Personal Information (Auto-Filled Details) */}
      <div className="card glass-card border shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h5 className="fw-bold mb-1 text-dark">Personal Information</h5>
            <p className="text-muted fs-7 mb-0">Your account registration credentials and contact details</p>
          </div>
          {!editingPhone && (
            <button
              className="btn btn-outline-dark btn-sm fw-semibold"
              onClick={() => {
                setPhoneInput(profile?.phone && profile.phone !== 'N/A' ? profile.phone : '');
                setEditingPhone(true);
              }}
            >
              <i className="bi bi-pencil-square me-1.5"></i> Update Phone Number
            </button>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted fw-semibold text-uppercase fs-8 d-block mb-1">Full Name</small>
              <div className="fw-bold text-dark fs-6">{displayUser.name || 'N/A'}</div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted fw-semibold text-uppercase fs-8 d-block mb-1">Email Address</small>
              <div className="fw-bold text-dark fs-6">{displayUser.email || 'N/A'}</div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 border position-relative">
              <small className="text-muted fw-semibold text-uppercase fs-8 d-block mb-1">Phone Number</small>
              {editingPhone ? (
                <form onSubmit={handleUpdatePhone} className="mt-1 d-flex gap-2">
                  <input
                    type="tel"
                    className="form-control form-control-sm fw-bold border-primary"
                    placeholder="Enter phone number (+1 555-0199)"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    required
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary btn-sm fw-bold px-3" disabled={updatingPhone}>
                    {updatingPhone ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-light btn-sm" onClick={() => setEditingPhone(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="d-flex align-items-center justify-content-between">
                  <div className="fw-bold text-dark fs-6">
                    {profile?.phone && profile.phone !== 'N/A' ? (
                      <span className="text-dark">{profile.phone}</span>
                    ) : (
                      <span className="text-muted fst-italic">N/A (Not Provided)</span>
                    )}
                  </div>
                  <button
                    className="btn btn-link text-primary p-0 border-0 fs-8 fw-semibold text-decoration-none"
                    onClick={() => {
                      setPhoneInput(profile?.phone && profile.phone !== 'N/A' ? profile.phone : '');
                      setEditingPhone(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted fw-semibold text-uppercase fs-8 d-block mb-1">Account Role</small>
              <div className="fw-bold text-dark fs-6">{displayUser.role || 'USER'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Management Section */}
      <div className="card glass-card border shadow-sm p-4 bg-white rounded-4">
        <h5 className="fw-bold mb-1 text-dark">Security & Password Management</h5>
        <p className="text-muted fs-7 mb-4">Update your password to keep your AquaFlow account secure</p>

        <form onSubmit={handleChangePassword} style={{ maxWidth: '600px' }}>
          <div className="mb-3">
            <label className="form-label fw-semibold fs-7 text-dark">Current Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold fs-7 text-dark">New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold fs-7 text-dark">Confirm New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-dark fw-bold px-4" disabled={changingPass}>
            <i className="bi bi-shield-check me-1.5"></i>
            {changingPass ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger Zone: Leave Application Option for Building Owner */}
      {displayUser.role === 'BUILDING_OWNER' && (
        <div className="card border-danger shadow-xs p-4 bg-white rounded-4 mt-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-danger text-white fs-8 text-uppercase px-2 py-1">Danger Zone</span>
                <h5 className="fw-bold mb-0 text-danger">Leave AquaFlow Application</h5>
              </div>
              <p className="text-muted fs-7 mb-0">
                Permanently close your building owner account, delete your properties, and leave the platform.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline-danger fw-bold px-4 d-flex align-items-center gap-2"
              onClick={() => {
                setLeaveConfirmText('');
                setShowLeaveModal(true);
              }}
            >
              <i className="bi bi-box-arrow-left"></i>
              <span>Leave Application</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Leaving Application */}
      {showLeaveModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-2 text-danger">
                  <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                  <h5 className="modal-title fw-bold">Leave AquaFlow Platform?</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leavingApp}
                ></button>
              </div>
              <div className="modal-body py-3">
                <p className="text-dark mb-2">
                  Are you sure you want to permanently close your building owner account and leave AquaFlow?
                </p>
                <div className="alert alert-danger p-2.5 rounded-3 fs-8 mb-3">
                  <strong>Warning:</strong> All your registered buildings, apartment units, water meter configurations, and pending requests will be completely and permanently removed. This action cannot be reversed.
                </div>
                <p className="text-muted fs-8 mb-2">
                  Please type <strong className="text-danger">LEAVE</strong> below to confirm:
                </p>
                <input
                  type="text"
                  className="form-control text-uppercase fw-bold"
                  placeholder="Type LEAVE to confirm"
                  value={leaveConfirmText}
                  onChange={(e) => setLeaveConfirmText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light fw-semibold"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leavingApp}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-bold px-3 d-flex align-items-center gap-1.5"
                  onClick={handleLeaveApplication}
                  disabled={leavingApp || leaveConfirmText.trim().toUpperCase() !== 'LEAVE'}
                >
                  {leavingApp ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Closing Account...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-left"></i>
                      <span>Yes, Leave Application</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

