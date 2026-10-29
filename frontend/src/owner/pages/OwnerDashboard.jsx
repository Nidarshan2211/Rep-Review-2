import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../shared/services/api';
import StatCard from '../../shared/components/StatCard';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/owners/dashboard')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading Owner Dashboard..." />;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Building Owner Dashboard</h2>
          <p className="text-muted small mb-0">Property overview, water usage stats, and revenue tracking</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/owner/residents" className="btn btn-dark fw-bold">
            <i className="bi bi-person-plus-fill me-1.5"></i> Manage Residents
          </Link>
          <Link to="/owner/billing" className="btn btn-outline-secondary fw-bold bg-white">
            <i className="bi bi-receipt me-1.5"></i> Billing Control
          </Link>
          <Link to="/owner/invoices" className="btn btn-primary fw-bold">
            <i className="bi bi-receipt-cutoff me-1.5"></i> Invoices
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard title="Buildings Managed" value={stats?.totalBuildings || 0} icon="bi-building" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Total Residents" value={stats?.totalResidents || 0} icon="bi-people" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Pending Invitations" value={stats?.pendingInvitations || 0} icon="bi-envelope-exclamation" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toFixed(2)}`} icon="bi-cash-stack" />
        </div>
      </div>

      {/* Quick Operations Panel */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4 col-md-6">
          <div className="card glass-card h-100 border p-4 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="rounded-3 bg-light border p-3 text-dark fs-4">
                <i className="bi bi-water"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-1 text-dark">Meter Reading</h5>
                <small className="text-muted">Enter monthly consumption numbers for meters</small>
              </div>
            </div>
            <Link to="/owner/usage" className="btn btn-outline-dark w-100 fw-bold mt-auto py-2">
              Water Logs <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>
        </div>

        <div className="col-lg-4 col-md-6">
          <div className="card glass-card h-100 border p-4 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="rounded-3 bg-light border p-3 text-dark fs-4">
                <i className="bi bi-calculator"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-1 text-dark">Monthly Bills</h5>
                <small className="text-muted">Apply 3-tier tariffs and issue cycle bills</small>
              </div>
            </div>
            <Link to="/owner/billing" className="btn btn-outline-dark w-100 fw-bold mt-auto py-2">
              Billing Control <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>
        </div>

        <div className="col-lg-4 col-md-6">
          <div className="card glass-card h-100 border p-4 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 p-3 text-primary fs-4">
                <i className="bi bi-receipt-cutoff"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-1 text-dark">Invoices</h5>
                <small className="text-muted">Track balances, download PDFs & view breakdown</small>
              </div>
            </div>
            <Link to="/owner/invoices" className="btn btn-primary w-100 fw-bold mt-auto py-2">
              Invoices <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
