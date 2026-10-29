import React, { useState, useEffect } from 'react';
import API from '../services/api';

/**
 * HouseholdSizeModal
 * Allows residents (or building owners) to update declared household count
 * with change reason audit trail and soft sanity confirmation warning (> 6 members).
 */
export default function HouseholdSizeModal({
  show,
  onClose,
  onSaved,
  currentSize = 2,
  currentChildren = 0,
  apartmentId = null, // If set, calls owner endpoint; otherwise resident endpoint
  apartmentLabel = ''
}) {
  const [householdSize, setHouseholdSize] = useState(currentSize || 2);
  const [childrenCount, setChildrenCount] = useState(currentChildren || 0);
  const [reason, setReason] = useState('CORRECTION');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSanityWarning, setShowSanityWarning] = useState(false);

  useEffect(() => {
    if (show) {
      setHouseholdSize(currentSize || 2);
      setChildrenCount(currentChildren || 0);
      setReason('CORRECTION');
      setNote('');
      setError('');
      setShowSanityWarning(false);
    }
  }, [show, currentSize, currentChildren]);

  if (!show) return null;

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');

    const size = parseInt(householdSize, 10);
    const children = childrenCount ? parseInt(childrenCount, 10) : 0;

    if (isNaN(size) || size < 1 || size > 15) {
      setError('Total household members must be an integer between 1 and 15.');
      return;
    }

    if (children < 0 || children > size) {
      setError('Children count cannot exceed total household members.');
      return;
    }

    // Trigger soft sanity warning if size > 6 and not already acknowledged
    if (size > 6 && !showSanityWarning) {
      setShowSanityWarning(true);
      return;
    }

    performSave(size, children);
  };

  const performSave = async (size, children) => {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        householdSize: size,
        childrenCount: children,
        reason: reason,
        note: note.trim() || undefined
      };

      if (apartmentId) {
        // Owner override endpoint
        await API.put(`/owner/apartments/${apartmentId}/household`, payload);
      } else {
        // Resident self-update endpoint
        await API.put('/resident/household', payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update household size.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header border-bottom bg-light px-4 py-3">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-people-fill text-primary"></i>
              {apartmentId ? `Update Household - ${apartmentLabel || 'Unit'}` : 'Manage Household Size'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={submitting}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger py-2 px-3 rounded-3 small mb-3">
                <i className="bi bi-exclamation-circle me-1"></i> {error}
              </div>
            )}

            {showSanityWarning ? (
              /* Soft Sanity Warning Dialog */
              <div className="p-3 bg-warning-subtle border border-warning rounded-3 mb-3">
                <div className="d-flex align-items-start gap-2 mb-2">
                  <i className="bi bi-exclamation-triangle-fill text-warning fs-4"></i>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">Large Household Confirmation</h6>
                    <p className="fs-7 text-muted mb-0">
                      You entered <strong>{householdSize} members</strong>. Baseline consumption will be calibrated significantly higher for this unit.
                    </p>
                  </div>
                </div>
                <p className="fs-7 text-dark fw-semibold mb-3">
                  Please verify that {householdSize} people permanently reside in this unit.
                </p>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm fw-bold px-3"
                    onClick={() => performSave(parseInt(householdSize, 10), parseInt(childrenCount || 0, 10))}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Yes, Confirm & Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowSanityWarning(false)}
                    disabled={submitting}
                  >
                    Edit Number
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold fs-7 text-dark">
                    Total Household Members <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    className="form-control form-control-lg fs-6"
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(e.target.value)}
                    required
                  />
                  <div className="form-text fs-8">
                    Include all adults and children currently living in the apartment (1 to 15).
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold fs-7 text-dark">
                    Children (Under 12) <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={householdSize || 15}
                    className="form-control"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(e.target.value)}
                  />
                  <div className="form-text fs-8">
                    Helps adjust per-capita washing and bath usage formulas.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold fs-7 text-dark">
                    Reason for Change <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="CORRECTION">Correction / Initial Setup</option>
                    <option value="FAMILY_JOINED">Family Member Joined</option>
                    <option value="FAMILY_LEFT">Family Member Left</option>
                    <option value="BIRTH">New Baby / Child</option>
                    <option value="GUESTS_STAYING">Extended Guests Staying</option>
                    <option value="MOVE_IN">Move In / Tenancy Change</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold fs-7 text-dark">
                    Optional Note <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength="255"
                    className="form-control"
                    placeholder="e.g. In-laws visiting for two months"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-3 fw-semibold"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark px-4 fw-bold"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
