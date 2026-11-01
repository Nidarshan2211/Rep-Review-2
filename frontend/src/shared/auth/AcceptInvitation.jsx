import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [status, setStatus] = useState('LOADING'); // 'LOADING', 'PENDING', 'EXPIRED', 'ALREADY_ACCEPTED', 'INVALID', 'SUCCESS'
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [householdSize, setHouseholdSize] = useState('2');
  const [childrenCount, setChildrenCount] = useState('0');
  const [sanityWarningDismissed, setSanityWarningDismissed] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('INVALID');
      setErrorMessage('No invitation token was provided in the URL.');
      setLoading(false);
      return;
    }

    API.get(`/auth/validate-invitation?token=${encodeURIComponent(token)}`)
      .then(res => {
        const data = res.data;
        setInviteData(data);
        setStatus(data.status || 'PENDING');
        setErrorMessage(data.message || '');
      })
      .catch(err => {
        setStatus('INVALID');
        setErrorMessage(err.response?.data?.message || 'Invalid or expired invitation token.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your entry.');
      return;
    }

    const size = parseInt(householdSize, 10);
    const children = childrenCount ? parseInt(childrenCount, 10) : 0;

    if (isNaN(size) || size < 1 || size > 15) {
      setFormError('Total household members must be an integer between 1 and 15.');
      return;
    }

    if (children < 0 || children > size) {
      setFormError('Children count cannot exceed total household members.');
      return;
    }

    if (size > 6 && !sanityWarningDismissed) {
      if (!window.confirm(`You specified ${size} household members. Water leak benchmarks will be calibrated for a large household. Are you sure this is accurate?`)) {
        return;
      }
      setSanityWarningDismissed(true);
    }

    setSubmitting(true);
    try {
      await API.post('/auth/accept-invitation', {
        token: token,
        password: password,
        householdSize: size,
        childrenCount: children
      });
      setStatus('SUCCESS');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to activate account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-slate-50">
        <div className="text-center">
          <div className="spinner-border text-dark mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
          <h5 className="fw-bold text-dark">Validating Secure Token...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-slate-50 py-5 px-3">
      <div className="card border-0 shadow-lg p-4 p-md-5 rounded-4" style={{ maxWidth: '540px', width: '100%', backgroundColor: '#ffffff' }}>
        
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-dark text-white rounded-circle mb-3" style={{ width: '56px', height: '56px' }}>
            <i className="bi bi-droplet-fill fs-3"></i>
          </div>
          <h3 className="fw-bold text-dark mb-1">AquaFlow</h3>
          <p className="text-muted small mb-0">Smart Water Management & Billing Portal</p>
        </div>

        {/* State 1: SUCCESS */}
        {status === 'SUCCESS' && (
          <div className="text-center py-3">
            <div className="mb-3 text-success">
              <i className="bi bi-check-circle-fill display-1"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Account Activated Successfully!</h4>
            <p className="text-muted mb-4 fs-7">
              Your AquaFlow resident account has been created. You can now log in using your email and new password.
            </p>
            <Link to="/login" className="btn btn-dark w-100 py-2.5 fw-bold shadow-sm">
              <i className="bi bi-box-arrow-in-right me-2"></i> Go to Login
            </Link>
          </div>
        )}

        {/* State 2: PENDING (Valid Token Activation Form) */}
        {status === 'PENDING' && (
          <div>
            <div className="alert alert-light border border-secondary-subtle rounded-3 mb-4 p-3">
              <h6 className="fw-bold text-dark mb-2"><i className="bi bi-person-check-fill text-dark me-2"></i>Welcome, {inviteData?.residentName}!</h6>
              <div className="fs-7 text-muted">
                <div><strong>Email:</strong> {inviteData?.email}</div>
                <div><strong>Building:</strong> {inviteData?.buildingName}</div>
                <div><strong>Apartment:</strong> {inviteData?.apartmentNumber}</div>
              </div>
            </div>

            <h5 className="fw-bold text-dark mb-3">Set Up Your Password</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold fs-7 text-dark">Create Password *</label>
                <input
                  type="password"
                  className="form-control form-control-lg fs-6"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold fs-7 text-dark">Confirm Password *</label>
                <input
                  type="password"
                  className="form-control form-control-lg fs-6"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              {formError && (
                <div className="alert alert-danger py-2 px-3 rounded-3 small mb-3">
                  <i className="bi bi-exclamation-circle me-1"></i> {formError}
                </div>
              )}

              {/* Required Household Details Section */}
              <div className="p-3 bg-light rounded-3 mb-4 border border-secondary-subtle">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-people-fill text-primary"></i>
                  <h6 className="fw-bold text-dark mb-0 fs-7">Household Details (Required)</h6>
                </div>
                <p className="fs-8 text-muted mb-3">
                  Helps us detect water leaks accurately. Only numbers are stored, never names or personal data.
                </p>

                <div className="row g-2 mb-2">
                  <div className="col-7">
                    <label className="form-label fw-semibold fs-8 text-dark mb-1">
                      Total People in Flat *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      className="form-control form-control-sm"
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-5">
                    <label className="form-label fw-semibold fs-8 text-dark mb-1">
                      Children (Under 12)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={householdSize || 15}
                      className="form-control form-control-sm"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(e.target.value)}
                    />
                  </div>
                </div>
                <small className="text-muted fs-9 d-block">
                  Adults + Children residing permanently (1 to 15).
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-dark w-100 py-2.5 fw-bold shadow-sm"
                disabled={submitting}
              >
                {submitting ? 'Activating Account...' : 'Activate Account'}
              </button>
            </form>
          </div>
        )}

        {/* State 3: EXPIRED */}
        {status === 'EXPIRED' && (
          <div className="text-center py-3">
            <div className="mb-3 text-warning">
              <i className="bi bi-exclamation-triangle-fill display-1"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Invitation Expired</h4>
            <p className="text-muted mb-4 fs-7">
              {errorMessage || 'This invitation link has expired. Please contact your Building Owner and request a new invitation.'}
            </p>
            <Link to="/login" className="btn btn-outline-dark w-100 py-2.5 fw-bold">
              Back to Login
            </Link>
          </div>
        )}

        {/* State 4: ALREADY_ACCEPTED */}
        {status === 'ALREADY_ACCEPTED' && (
          <div className="text-center py-3">
            <div className="mb-3 text-info">
              <i className="bi bi-info-circle-fill display-1"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Invitation Already Used</h4>
            <p className="text-muted mb-4 fs-7">
              {errorMessage || 'This invitation has already been accepted. Please log in using your registered email and password.'}
            </p>
            <Link to="/login" className="btn btn-dark w-100 py-2.5 fw-bold shadow-sm">
              <i className="bi bi-box-arrow-in-right me-2"></i> Go to Login
            </Link>
          </div>
        )}

        {/* State 5: INVALID */}
        {status === 'INVALID' && (
          <div className="text-center py-3">
            <div className="mb-3 text-danger">
              <i className="bi bi-x-circle-fill display-1"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Invalid Invitation</h4>
            <p className="text-muted mb-4 fs-7">
              {errorMessage || 'This invitation link is invalid or no longer exists.'}
            </p>
            <Link to="/login" className="btn btn-outline-dark w-100 py-2.5 fw-bold">
              Back to Login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
