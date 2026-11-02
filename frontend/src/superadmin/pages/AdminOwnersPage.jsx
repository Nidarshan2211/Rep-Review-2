import React, { useState, useEffect } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletionNotice, setDeletionNotice] = useState(null);

  const fetchOwners = () => {
    API.get('/admin/owners')
      .then(res => setOwners(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleDeleteOwner = async (ownerId, ownerName) => {
    if (window.confirm(`Are you sure you want to remove building owner "${ownerName}" and all their associated properties from the platform? This action cannot be undone.`)) {
      try {
        setDeletionNotice(null);
        await API.delete(`/admin/owners/${ownerId}`);
        setOwners(prev => prev.filter(o => o.ownerId !== ownerId));
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to delete building owner';
        setDeletionNotice(errorMsg);
        alert(errorMsg);
      }
    }
  };

  const filteredOwners = owners.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner text="Loading Building Owners..." />;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Building Owners Directory</h2>
          <p className="text-muted small mb-0">Manage all registered building owner accounts</p>
        </div>
        <div style={{ width: 300 }}>
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0 bg-light" 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {deletionNotice && (
        <div className="alert alert-warning border-warning shadow-sm alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill fs-3 text-warning flex-shrink-0 mt-1"></i>
            <div>
              <h5 className="alert-heading fw-bold mb-1">Owner Deletion Safeguard: Outstanding Resident Balance</h5>
              <p className="mb-2 text-dark">{deletionNotice}</p>
              <div className="small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Notifications and emails have been automatically dispatched to the building owner and all residents with outstanding balances requesting them to finish all billing and settle accounts before deletion.
              </div>
            </div>
            <button type="button" className="btn-close ms-auto" aria-label="Close" onClick={() => setDeletionNotice(null)}></button>
          </div>
        </div>
      )}

      <div className="card glass-card border shadow-sm bg-white">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table custom-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Managed Buildings</th>
                  <th>Status</th>
                  <th>Registered On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwners.length ? (
                  filteredOwners.map(o => (
                    <tr key={o.ownerId}>
                      <td><code className="text-dark fw-bold">#{o.ownerId}</code></td>
                      <td className="fw-bold text-dark">{o.name}</td>
                      <td className="text-muted">{o.email}</td>
                      <td className="text-muted">{o.phone}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-dark border px-2.5 py-1">
                          {o.totalBuildings} Buildings
                        </span>
                      </td>
                      <td>
                        {o.approvalStatus === 'APPROVED' && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 rounded-pill fw-semibold fs-7">
                            <i className="bi bi-check-circle-fill me-1"></i> APPROVED
                          </span>
                        )}
                        {o.approvalStatus === 'PENDING' && (
                          <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-3 py-1.5 rounded-pill fw-semibold fs-7">
                            <i className="bi bi-clock-fill text-warning me-1"></i> PENDING
                          </span>
                        )}
                        {o.approvalStatus === 'REJECTED' && (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-1.5 rounded-pill fw-semibold fs-7">
                            <i className="bi bi-x-circle-fill me-1"></i> REJECTED
                          </span>
                        )}
                      </td>
                      <td className="text-muted small">{o.createdAt ? o.createdAt.substring(0, 10) : 'N/A'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger px-2.5 py-1 fw-semibold rounded-2 d-flex align-items-center gap-1"
                          title="Delete and remove this building owner"
                          onClick={() => handleDeleteOwner(o.ownerId, o.name)}
                        >
                          <i className="bi bi-trash"></i>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">No owners matched your search query.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
