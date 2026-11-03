import React, { useState, useEffect, useMemo } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import LeakStatusBadge from '../../shared/components/LeakStatusBadge';
import RiskScoreBar from '../../shared/components/RiskScoreBar';
import HouseholdSizeModal from '../../shared/components/HouseholdSizeModal';

/**
 * OwnerLeakMonitoringPage
 * Building-wide water leak monitoring, incident tracking, cycle re-scoring,
 * and household confirmation oversight for property owners.
 */
export default function OwnerLeakMonitoringPage() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'households'
  
  // Monitoring data
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null); // { type: 'success' | 'danger', text: '' }

  // Household data
  const [householdStatuses, setHouseholdStatuses] = useState([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MED' | 'LEAK_ONLY' | 'NORMAL'

  // Modal states
  const [selectedItemForHhEdit, setSelectedItemForHhEdit] = useState(null);

  // 1. Fetch buildings list on mount
  useEffect(() => {
    API.get('/owners/buildings')
      .then(res => {
        const bList = res.data || [];
        setBuildings(bList);
        if (bList.length > 0) {
          setSelectedBuildingId(String(bList[0].buildingId));
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load buildings', err);
        setLoading(false);
      });
  }, []);

  // 2. Fetch monitoring data whenever selectedBuildingId changes
  const fetchMonitoringData = async (bId = selectedBuildingId) => {
    if (!bId) return;
    try {
      setLoading(true);
      const res = await API.get(`/owner/buildings/${bId}/leak-monitoring`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch leak monitoring summary:', err);
      setAlertMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to load leak monitoring data for this building.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholdStatuses = async (bId = selectedBuildingId) => {
    if (!bId) return;
    try {
      setLoadingHouseholds(true);
      const res = await API.get(`/owner/buildings/${bId}/residents/household-status`);
      setHouseholdStatuses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch household statuses:', err);
    } finally {
      setLoadingHouseholds(false);
    }
  };

  useEffect(() => {
    if (selectedBuildingId) {
      fetchMonitoringData(selectedBuildingId);
      if (activeTab === 'households') {
        fetchHouseholdStatuses(selectedBuildingId);
      }
    }
  }, [selectedBuildingId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'households' && householdStatuses.length === 0) {
      fetchHouseholdStatuses(selectedBuildingId);
    }
  };

  // Re-score cycle
  const handleRescoreCycle = async () => {
    if (!selectedBuildingId) return;
    if (!window.confirm('Trigger machine learning re-scoring for the current cycle? This recalculates expected ranges and risk scores for all flats.')) {
      return;
    }

    setRescoring(true);
    setAlertMessage(null);
    try {
      const res = await API.post(`/owner/buildings/${selectedBuildingId}/leak-monitoring/rescore`);
      setAlertMessage({
        type: 'success',
        text: `✓ ${res.data?.message || 'Cycle scoring completed successfully!'}`
      });
      await fetchMonitoringData(selectedBuildingId);
    } catch (err) {
      setAlertMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to re-score cycle. Baseline fallback may be active.'
      });
    } finally {
      setRescoring(false);
    }
  };

  // Dismiss open incident
  const handleDismissIncident = async (incidentId, roomNumber) => {
    if (!incidentId) return;
    if (!window.confirm(`Dismiss active leak incident for Unit ${roomNumber}? This marks the incident as reviewed/dismissed.`)) {
      return;
    }

    try {
      await API.post(`/owner/leak-incidents/${incidentId}/dismiss`);
      setAlertMessage({
        type: 'success',
        text: `✓ Leak incident #${incidentId} for Unit ${roomNumber} dismissed.`
      });
      await fetchMonitoringData(selectedBuildingId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dismiss incident.');
    }
  };

  // Filtered Items for Monitoring Table
  const filteredItems = useMemo(() => {
    const items = summary?.items || [];
    return items.filter((item) => {
      // Search term (unit number or resident name)
      const q = searchTerm.toLowerCase().trim();
      const matchRoom = (item.apartmentNumber || '').toLowerCase().includes(q);
      const matchResident = (item.residentName || '').toLowerCase().includes(q);
      const matchesSearch = !q || matchRoom || matchResident;

      if (!matchesSearch) return false;

      // Risk Filter
      const rawRisk = item.anomalyScore;
      const score = rawRisk != null
        ? (rawRisk > 0 && rawRisk <= 1.0 ? Math.round(rawRisk * 100) : Math.round(rawRisk))
        : 0;
      if (riskFilter === 'HIGH') return score >= 70;
      if (riskFilter === 'MED') return score >= 40 && score < 70;
      if (riskFilter === 'LEAK_ONLY') return item.anomalyStatus === 'POTENTIAL_LEAK';
      if (riskFilter === 'NORMAL') return item.anomalyStatus === 'NORMAL';

      return true;
    });
  }, [summary, searchTerm, riskFilter]);

  if (loading && !summary) {
    return <LoadingSpinner text="Loading building leak diagnostics & monitoring..." />;
  }

  return (
    <div className="container-fluid py-4">
      {/* Modals */}
      

      {selectedItemForHhEdit && (
        <HouseholdSizeModal
          show={Boolean(selectedItemForHhEdit)}
          onClose={() => setSelectedItemForHhEdit(null)}
          onSaved={() => {
            fetchMonitoringData(selectedBuildingId);
            fetchHouseholdStatuses(selectedBuildingId);
          }}
          currentSize={selectedItemForHhEdit.householdSize || 2}
          apartmentId={selectedItemForHhEdit.apartmentId}
          apartmentLabel={`Flat ${selectedItemForHhEdit.apartmentNumber}`}
        />
      )}

      {/* Header Banner */}
      <div className="card glass-card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0 text-dark">Smart Leak Monitoring</h2>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fs-7">
                AI Diagnostics
              </span>
            </div>
            <p className="text-muted small mb-0">
              Per-flat machine learning leak detection, loss prevention, and household calibration.
            </p>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            {/* Building Selector */}
            <div className="d-flex align-items-center gap-2">
              <label className="fs-7 fw-semibold text-dark mb-0">Building:</label>
              <select
                className="form-select form-select-sm"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                style={{ minWidth: 200 }}
              >
                {buildings.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>
                    {b.buildingName} ({b.buildingNumber || 'No Code'})
                  </option>
                ))}
              </select>
            </div>

            {/* Re-score Button */}
            <button
              className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-semibold shadow-xs"
              onClick={handleRescoreCycle}
              disabled={rescoring || !selectedBuildingId}
            >
              <i className={`bi bi-arrow-repeat me-1.5 ${rescoring ? 'spin' : ''}`}></i>
              {rescoring ? 'Re-scoring Cycle...' : 'Re-Score Cycle'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="d-flex gap-2 mt-4 border-bottom pb-2">
          <button
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'monitoring' ? 'btn-dark' : 'btn-light text-muted'}`}
            onClick={() => handleTabChange('monitoring')}
          >
            <i className="bi bi-shield-exclamation me-1.5"></i> Leak Monitoring & Incidents
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === 'households' ? 'btn-dark' : 'btn-light text-muted'}`}
            onClick={() => handleTabChange('households')}
          >
            <i className="bi bi-people-fill me-1.5"></i> Household Confirmations & Calibration
          </button>
        </div>
      </div>

      {alertMessage && (
        <div className={`alert alert-${alertMessage.type} rounded-4 p-3 shadow-sm mb-4 d-flex justify-content-between align-items-center`}>
          <span>{alertMessage.text}</span>
          <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
        </div>
      )}

      {activeTab === 'monitoring' ? (
        <>
          {/* Top Counters Row */}
          <div className="row g-3 mb-4">
            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">Total Monitored</span>
                <h3 className="fw-bold text-dark mt-1 mb-0">{summary?.totalFlats || 0}</h3>
                <small className="text-muted">{summary?.flatsScored || 0} units scored</small>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">Normal Units</span>
                <h3 className="fw-bold text-success mt-1 mb-0">
                  {summary ? (summary.flatsScored - (summary.leaksDetectedCount || 0)) : 0}
                </h3>
                <small className="text-success"><i className="bi bi-check-circle me-1"></i>Within bounds</small>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">Suspect Leaks</span>
                <h3 className="fw-bold text-danger mt-1 mb-0">{summary?.leaksDetectedCount || 0}</h3>
                <small className="text-danger"><i className="bi bi-exclamation-triangle me-1"></i>Flagged units</small>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">High Risk (70%+)</span>
                <h3 className="fw-bold text-danger mt-1 mb-0">{summary?.highRiskCount || 0}</h3>
                <small className="text-muted">{summary?.medRiskCount || 0} medium risk</small>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">Open Incidents</span>
                <h3 className="fw-bold text-warning-emphasis mt-1 mb-0">{summary?.activeIncidentsCount || 0}</h3>
                <small className="text-muted">Unattended alerts</small>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6">
              <div className="card glass-card border-0 shadow-sm p-3 bg-white rounded-4 h-100">
                <span className="text-muted fs-8 fw-semibold text-uppercase">Estimated Water Loss</span>
                <h3 className="fw-bold text-primary mt-1 mb-0">
                  {summary?.totalExcessWaterKl != null ? Number(summary.totalExcessWaterKl).toFixed(1) : '0.0'} <span className="fs-7 fw-normal">kL</span>
                </h3>
                <small className="text-muted">
                  ~ ₹{summary?.estimatedWaterLossCost != null ? Number(summary.estimatedWaterLossCost).toFixed(0) : '0'} loss
                </small>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4">
            {/* Filter controls */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
              <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 360 }}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search room # or resident..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="fs-8 text-muted fw-semibold">Risk Filter:</span>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${riskFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setRiskFilter('ALL')}
                  >
                    All ({summary?.items?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`btn ${riskFilter === 'HIGH' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setRiskFilter('HIGH')}
                  >
                    High Risk ({summary?.highRiskCount || 0})
                  </button>
                  <button
                    type="button"
                    className={`btn ${riskFilter === 'LEAK_ONLY' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setRiskFilter('LEAK_ONLY')}
                  >
                    Leaks ({summary?.leaksDetectedCount || 0})
                  </button>
                  <button
                    type="button"
                    className={`btn ${riskFilter === 'NORMAL' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setRiskFilter('NORMAL')}
                  >
                    Normal
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-shield-check display-4 text-success opacity-75 mb-2"></i>
                <h5 className="fw-bold text-dark mt-2">No units match the current filter</h5>
                <p className="fs-7 mb-0">Try clearing filters or search criteria.</p>
              </div>
            ) : (
              <div className="table-responsive rounded-3 border">
                <table className="table table-hover align-middle mb-0 fs-7">
                  <thead className="table-light">
                    <tr>
                      <th>Unit / Flat</th>
                      <th>Resident & Household</th>
                      <th>Actual Consumption</th>
                      <th>Expected Band</th>
                      <th style={{ minWidth: 140 }}>Risk Meter</th>
                      <th>Status</th>
                      <th>Pattern & Diagnosis</th>
                      <th>Incident</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const actual = item.unitsConsumed != null ? Number(item.unitsConsumed).toFixed(2) : '0.00';
                      const min = item.expectedMin != null ? Number(item.expectedMin).toFixed(1) : '0.0';
                      const max = item.expectedMax != null ? Number(item.expectedMax).toFixed(1) : '0.0';
                      const isLeak = item.anomalyStatus === 'POTENTIAL_LEAK';
                      const rawRisk = item.anomalyScore;
                      const score = rawRisk != null
                        ? (rawRisk > 0 && rawRisk <= 1.0 ? Math.round(rawRisk * 100) : Math.round(rawRisk))
                        : (isLeak ? 85 : 0);

                      return (
                        <tr key={item.usageId || item.apartmentId} className={isLeak ? 'table-danger-subtle' : ''}>
                          {/* Unit */}
                          <td>
                            <strong className="text-dark d-block">Room {item.apartmentNumber}</strong>
                            <small className="text-muted">Floor {item.floorNumber != null ? item.floorNumber : '-'}</small>
                          </td>

                          {/* Resident */}
                          <td>
                            <div className="fw-semibold text-dark">{item.residentName || 'Unassigned'}</div>
                            <small className="text-muted">
                              <i className="bi bi-people me-1"></i>
                              {item.householdSize || 2} members
                            </small>
                          </td>

                          {/* Consumption */}
                          <td>
                            <strong className={isLeak ? 'text-danger' : 'text-dark'}>
                              {actual} kL
                            </strong>
                          </td>

                          {/* Expected Band */}
                          <td>
                            <strong className="text-dark d-block">{min} – {max} kL</strong>
                            <small className="text-muted">Median (q50): {item.expectedUsage != null ? Number(item.expectedUsage).toFixed(1) : ((Number(min) + Number(max))/2).toFixed(1)} kL</small>
                          </td>

                          {/* Risk */}
                          <td>
                            <RiskScoreBar score={score} compact={true} height={6} />
                          </td>

                          {/* Status */}
                          <td>
                            <LeakStatusBadge status={item.anomalyStatus} size="sm" />
                          </td>

                          {/* Pattern / Diagnosis */}
                          <td style={{ maxWidth: 220 }}>
                            {item.anomalyPattern && (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-9 me-1">
                                {item.anomalyPattern}
                              </span>
                            )}
                            <div className="fs-8 text-muted text-truncate" title={item.anomalyReason}>
                              {item.anomalyReason || 'Normal consumption'}
                            </div>
                            {item.estimatedExtraCost != null && item.estimatedExtraCost > 0 && (
                              <small className="text-danger fw-semibold">
                                +₹{Number(item.estimatedExtraCost).toFixed(0)} excess
                              </small>
                            )}
                          </td>

                          {/* Incident */}
                          <td>
                            {item.incidentId ? (
                              <span className={`badge ${item.incidentStatus === 'OPEN' ? 'bg-danger' : 'bg-secondary'}`}>
                                {item.incidentStatus}
                              </span>
                            ) : (
                              <span className="text-muted fs-8">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              {item.incidentStatus === 'OPEN' && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm py-0.5 px-2 fs-8"
                                  title="Dismiss Incident"
                                  onClick={() => handleDismissIncident(item.incidentId, item.apartmentNumber)}
                                >
                                  Dismiss
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-light btn-sm py-0.5 px-2 fs-8"
                                title="Adjust Household Size"
                                onClick={() => setSelectedItemForHhEdit(item)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Household Confirmation Tab */
        <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold text-dark mb-1">
                <i className="bi bi-people text-primary me-2"></i>
                Household Calibration & Confirmation Status
              </h5>
              <p className="text-muted small mb-0">
                Review which residents have verified their household size. Accurate member counts ensure ML models don't trigger false alarms.
              </p>
            </div>
            <button
              className="btn btn-light btn-sm rounded-pill px-3 fw-semibold border"
              onClick={() => fetchHouseholdStatuses(selectedBuildingId)}
              disabled={loadingHouseholds}
            >
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </button>
          </div>

          {loadingHouseholds ? (
            <div className="text-center py-5 text-muted small">Loading household confirmation list...</div>
          ) : householdStatuses.length === 0 ? (
            <div className="text-center py-5 text-muted">No apartments found for this building.</div>
          ) : (
            <div className="table-responsive rounded-3 border">
              <table className="table table-hover align-middle mb-0 fs-7">
                <thead className="table-light">
                  <tr>
                    <th>Room #</th>
                    <th>Resident</th>
                    <th>Unit Type</th>
                    <th>Household Size</th>
                    <th>Children</th>
                    <th>Source</th>
                    <th>Verification</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {householdStatuses.map((h) => {
                    const isConfirmed = Boolean(h.householdSizeConfirmed);
                    return (
                      <tr key={h.apartmentId}>
                        <td><strong>Unit {h.apartmentNumber}</strong></td>
                        <td>{h.residentName || <span className="text-muted">Vacant</span>}</td>
                        <td><span className="badge bg-light text-dark border">{h.unitType || '2BHK'}</span></td>
                        <td>
                          <strong>{h.householdSize || 2}</strong> people
                          {h.householdSize > 6 && (
                            <span className="badge bg-warning text-dark ms-2 fs-9">Large HH</span>
                          )}
                        </td>
                        <td>{h.childrenCount || 0}</td>
                        <td className="text-muted fs-8">{h.householdSizeSource || 'DEFAULT_ESTIMATE'}</td>
                        <td>
                          {isConfirmed ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              <i className="bi bi-check-circle me-1"></i> Verified
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                              Unconfirmed
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm py-0.5 px-2 fs-8 fw-semibold"
                            onClick={() => setSelectedItemForHhEdit(h)}
                          >
                            Update Size
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
      )}
    </div>
  );
}
