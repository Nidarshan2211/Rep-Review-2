import React, { useState, useEffect } from 'react';
import API from '../services/api';

/**
 * AwayPeriodModal
 * Allows residents to log vacation / away periods (max 180 days) so that ML
 * usage analytics do not flag zero/low usage as meter faults, and can account for
 * reduced occupancy while away.
 */
export default function AwayPeriodModal({ show, onClose, onUpdated }) {
  const [awayPeriods, setAwayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await API.get('/resident/away-periods');
      setAwayPeriods(res.data || []);
    } catch (err) {
      console.error('Failed to load away periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      setError('');
      setSuccess('');
      setStartDate('');
      setEndDate('');
      setNote('');
      fetchPeriods();
    }
  }, [show]);

  if (!show) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Please provide both start and end dates.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError('End date must be on or after the start date.');
      return;
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 180) {
      setError(`Away period cannot exceed 180 days (entered: ${diffDays} days).`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/resident/away-periods', {
        startDate,
        endDate,
        note: note.trim() || undefined
      });

      setSuccess('Away period registered successfully! Water usage baseline will adjust accordingly.');
      setStartDate('');
      setEndDate('');
      setNote('');
      await fetchPeriods();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save away period. Overlapping periods are not allowed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (periodId) => {
    if (!window.confirm('Delete this away period record?')) return;
    try {
      await API.delete(`/resident/away-periods/${periodId}`);
      await fetchPeriods();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete away period.');
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header border-bottom bg-light px-4 py-3">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-airplane-engines-fill text-primary"></i>
              Manage Away & Vacation Periods
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <p className="fs-7 text-muted mb-4">
              Planning to be away from your apartment? Registering away dates prevents false alarm warnings during low consumption, and alerts us immediately if unexpected water flow occurs while you are away.
            </p>

            {error && (
              <div className="alert alert-danger py-2 px-3 rounded-3 small mb-3">
                <i className="bi bi-exclamation-circle me-1"></i> {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success py-2 px-3 rounded-3 small mb-3">
                <i className="bi bi-check-circle me-1"></i> {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreate} className="p-3 bg-light rounded-3 mb-4 border">
              <h6 className="fw-bold text-dark mb-3 fs-7">
                <i className="bi bi-plus-circle-fill text-primary me-1"></i> Log New Away Period
              </h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-8 text-dark mb-1">Departure Date *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-8 text-dark mb-1">Return Date *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-8 text-dark mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    maxLength="255"
                    className="form-control form-control-sm"
                    placeholder="e.g. Vacation / Travel"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end mt-3">
                <button
                  type="submit"
                  className="btn btn-dark btn-sm px-4 fw-bold shadow-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Add Away Period'}
                </button>
              </div>
            </form>

            {/* List */}
            <h6 className="fw-bold text-dark mb-2 fs-7">Registered Away Periods</h6>
            {loading ? (
              <div className="text-center py-4 text-muted small">Loading records...</div>
            ) : awayPeriods.length === 0 ? (
              <div className="text-center py-3 text-muted small border rounded-3 bg-white">
                No away periods currently registered for your flat.
              </div>
            ) : (
              <div className="table-responsive rounded-3 border bg-white">
                <table className="table table-hover align-middle mb-0 fs-7">
                  <thead className="table-light">
                    <tr>
                      <th>Dates</th>
                      <th>Duration</th>
                      <th>Note</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayPeriods.map((p) => {
                      const start = new Date(p.startDate);
                      const end = new Date(p.endDate);
                      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      const isUpcoming = end >= new Date();

                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.startDate}</strong> to <strong>{p.endDate}</strong>
                            {isUpcoming && (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2 fs-9">
                                Active / Upcoming
                              </span>
                            )}
                          </td>
                          <td>{days} day{days > 1 ? 's' : ''}</td>
                          <td className="text-muted">{p.note || '-'}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm py-0.5 px-2 fs-8"
                              onClick={() => handleDelete(p.id)}
                              title="Delete record"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light px-4 py-2.5">
            <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
