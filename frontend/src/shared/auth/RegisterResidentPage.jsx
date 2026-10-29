import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';

export default function RegisterResidentPage() {
  const navigate = useNavigate();
  const { registerResident } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    apartmentId: '',
    householdSize: '2',
    childrenCount: '0'
  });

  const [availableApartments, setAvailableApartments] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [buildingsList, setBuildingsList] = useState([]);
  const [claimNow, setClaimNow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingApts, setLoadingApts] = useState(false);

  // Load available buildings and apartments on mount
  useEffect(() => {
    setLoadingApts(true);
    Promise.all([
      API.get('/apartments/buildings').catch(() => null),
      API.get('/apartments/available').catch(() => null)
    ])
      .then(([bldgRes, aptRes]) => {
        const apts = aptRes?.data || [];
        setAvailableApartments(apts);

        let bList = [];
        if (bldgRes?.data && Array.isArray(bldgRes.data) && bldgRes.data.length > 0) {
          bList = bldgRes.data;
        } else {
          // Fallback: extract distinct buildings from available apartments
          const bMap = new Map();
          apts.forEach(a => {
            if (a.buildingId && !bMap.has(a.buildingId)) {
              bMap.set(a.buildingId, {
                buildingId: a.buildingId,
                buildingName: a.buildingName,
                location: a.location
              });
            }
          });
          bList = Array.from(bMap.values());
        }

        setBuildingsList(bList);
        if (bList.length > 0) {
          const initialBldgId = String(bList[0].buildingId);
          setSelectedBuildingId(initialBldgId);
          const hasUnits = apts.some(a => a.buildingId === parseInt(initialBldgId));
          if (!hasUnits) {
            fetchApartmentsForBuilding(initialBldgId);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load properties/apartments for self-registration:', err);
      })
      .finally(() => {
        setLoadingApts(false);
      });
  }, []);

  const fetchApartmentsForBuilding = async (bId) => {
    if (!bId) return;
    try {
      setLoadingApts(true);
      const res = await API.get('/apartments/available', { params: { buildingId: bId } });
      const newApts = res.data || [];
      setAvailableApartments(prev => {
        const others = prev.filter(a => a.buildingId !== parseInt(bId));
        return [...others, ...newApts];
      });
    } catch (err) {
      console.warn('Failed to load apartments for building', bId, err);
    } finally {
      setLoadingApts(false);
    }
  };

  const handleBuildingChange = (e) => {
    const bId = e.target.value;
    setSelectedBuildingId(bId);
    setFormData(prev => ({ ...prev, apartmentId: '' }));
    if (bId) {
      fetchApartmentsForBuilding(bId);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredApartments = availableApartments.filter(a =>
    !selectedBuildingId || a.buildingId === parseInt(selectedBuildingId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your entry.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (claimNow && !formData.apartmentId) {
      setError('Please select an available apartment unit, or switch off unit selection to register now and choose a unit later.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        apartmentId: claimNow && formData.apartmentId ? parseInt(formData.apartmentId) : null,
        householdSize: claimNow && formData.apartmentId ? parseInt(formData.householdSize || 2, 10) : null,
        childrenCount: claimNow && formData.apartmentId && formData.childrenCount ? parseInt(formData.childrenCount, 10) : null
      };

      await registerResident(payload);
      navigate('/resident/dashboard');
    } catch (err) {
      console.error('Resident registration failed:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Registration failed. Please check your inputs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 py-5" style={{ backgroundColor: '#F0FAFF' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
               style={{ width: '56px', height: '56px', backgroundColor: '#005F73', color: '#fff' }}>
            <i className="bi bi-person-plus-fill fs-3"></i>
          </div>
          <h3 className="fw-bold mb-1" style={{ color: '#003554' }}>Resident Registration</h3>
          <p className="text-muted fs-7">Create your resident profile to track water usage, view invoices, and manage your unit.</p>
        </div>

        {/* Form Card */}
        <div className="card glass-card border-0 shadow-lg p-4 p-md-5 rounded-4 bg-white">
          {error && (
            <div className="alert alert-danger py-2.5 px-3 small rounded-3 mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill fs-6"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-3">
              <div className="col-12">
                <label className="form-label fw-semibold fs-7" style={{ color: '#003554' }}>Full Name *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: '#D4EBF8' }}>
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    type="text"
                    name="name"
                    className="form-control border-start-0 ps-0"
                    style={{ borderColor: '#D4EBF8' }}
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold fs-7" style={{ color: '#003554' }}>Email Address *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: '#D4EBF8' }}>
                    <i className="bi bi-envelope"></i>
                  </span>
                  <input
                    type="email"
                    name="email"
                    className="form-control border-start-0 ps-0"
                    style={{ borderColor: '#D4EBF8' }}
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold fs-7" style={{ color: '#003554' }}>Phone Number *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: '#D4EBF8' }}>
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control border-start-0 ps-0"
                    style={{ borderColor: '#D4EBF8' }}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold fs-7" style={{ color: '#003554' }}>Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: '#D4EBF8' }}>
                    <i className="bi bi-lock"></i>
                  </span>
                  <input
                    type="password"
                    name="password"
                    className="form-control border-start-0 ps-0"
                    style={{ borderColor: '#D4EBF8' }}
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold fs-7" style={{ color: '#003554' }}>Confirm Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: '#D4EBF8' }}>
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control border-start-0 ps-0"
                    style={{ borderColor: '#D4EBF8' }}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Optional Apartment Selection Section */}
            <div className="p-3 rounded-4 mb-4 border" style={{ backgroundColor: '#F8FCFD', borderColor: '#D4EBF8' }}>
              <div
                className="d-flex align-items-center justify-content-between mb-1"
                style={{ cursor: 'pointer' }}
                onClick={() => setClaimNow(!claimNow)}
              >
                <div className="d-flex align-items-center gap-2">
                  <div className="form-check form-switch m-0 p-0 d-flex align-items-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      className="form-check-input m-0 cursor-pointer"
                      type="checkbox"
                      id="claimNowSwitch"
                      checked={claimNow}
                      onChange={(e) => setClaimNow(e.target.checked)}
                      style={{ cursor: 'pointer', width: '2.4em', height: '1.25em' }}
                    />
                  </div>
                  <label className="form-check-label fw-semibold fs-7 cursor-pointer mb-0" htmlFor="claimNowSwitch" style={{ color: '#003554', cursor: 'pointer' }}>
                    Select my apartment unit now (Optional)
                  </label>
                </div>
                <span className={`badge ${claimNow ? 'bg-primary-subtle text-primary border' : 'bg-light text-muted border'} fs-8`}>
                  {claimNow ? 'Unit Selection Active' : 'Select Later'}
                </span>
              </div>
              <p className="text-muted fs-8 mb-2">
                If your apartment is ready, you can claim it right away. You can also skip this and browse or claim a unit later from your dashboard.
              </p>

              {claimNow && (
                <div className="row g-2 mt-2 pt-2 border-top" style={{ borderColor: '#E5F3F9' }}>
                  <div className="col-md-6">
                    <label className="form-label fs-8 fw-semibold text-muted">Building</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedBuildingId}
                      onChange={handleBuildingChange}
                      disabled={loadingApts && buildingsList.length === 0}
                    >
                      {buildingsList.length === 0 && (
                        <option value="">{loadingApts ? 'Loading buildings...' : 'No buildings found'}</option>
                      )}
                      {buildingsList.map(b => (
                        <option key={b.buildingId} value={b.buildingId}>
                          {b.buildingName} {b.location ? `(${b.location})` : ''} {b.ownerName ? `• Owner: ${b.ownerName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fs-8 fw-semibold text-muted">Available Apartment Unit</label>
                    <select
                      className="form-select form-select-sm"
                      name="apartmentId"
                      value={formData.apartmentId}
                      onChange={handleChange}
                      required={claimNow}
                      disabled={loadingApts}
                    >
                      <option value="">-- Choose Unit --</option>
                      {filteredApartments.map(a => (
                        <option key={a.apartmentId} value={a.apartmentId}>
                          Floor {a.floorNumber} - Unit {a.roomNumber} ({a.unitType || 'Flat'})
                        </option>
                      ))}
                    </select>
                    {loadingApts && (
                      <small className="text-muted d-block mt-1 fs-8">
                        <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.75rem', height: '0.75rem' }}></span>
                        Loading available units...
                      </small>
                    )}
                    {!loadingApts && selectedBuildingId && filteredApartments.length === 0 && (
                      <small className="text-danger d-block mt-1 fs-8">No vacant units available in this building.</small>
                    )}
                  </div>

                  <div className="col-12 mt-2 pt-2 border-top" style={{ borderColor: '#E5F3F9' }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="bi bi-people-fill" style={{ color: '#005F73' }}></i>
                      <label className="form-label fs-8 fw-semibold text-dark mb-0">Household Details for Water Diagnostics</label>
                    </div>
                    <p className="text-muted fs-8 mb-2">
                      Helps calibrate baseline consumption accurately. Only numbers are stored, never names or personal data.
                    </p>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label fs-8 text-muted mb-1">Total People (1-15) *</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          name="householdSize"
                          className="form-control form-control-sm"
                          value={formData.householdSize}
                          onChange={handleChange}
                          required={claimNow}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fs-8 text-muted mb-1">Children (Under 12)</label>
                        <input
                          type="number"
                          min="0"
                          max={formData.householdSize || 15}
                          name="childrenCount"
                          className="form-control form-control-sm"
                          value={formData.childrenCount}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn w-100 py-2.5 fw-bold text-white shadow-sm"
              style={{ backgroundColor: '#005F73', borderColor: '#005F73' }}
              disabled={loading}
            >
              {loading ? (
                <span><span className="spinner-border spinner-border-sm me-2"></span>Creating Profile...</span>
              ) : (
                <span>Register Resident Profile <i className="bi bi-arrow-right ms-2"></i></span>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-4 pt-3 border-top text-center" style={{ borderColor: '#E8F4FA' }}>
            <span className="text-muted fs-7">Already registered? </span>
            <Link to="/login" className="text-decoration-none fw-bold fs-7" style={{ color: '#005F73' }}>
              Sign In to Your Account <i className="bi bi-box-arrow-in-right ms-1"></i>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
