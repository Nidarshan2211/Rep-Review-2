import React, { useState, useEffect, useMemo } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function OwnerHistoryPage() {
  const [history, setHistory] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'JOINED' | 'LEFT'
  const [selectedApartment, setSelectedApartment] = useState('ALL'); // 'ALL' | roomNumber
  const [viewMode, setViewMode] = useState('apartment'); // 'apartment' | 'flat'

  // Fetch both history logs and building apartments
  const fetchHistoryAndApartments = async () => {
    setLoading(true);
    try {
      // 1. Fetch resident occupancy history
      let historyData = [];
      try {
        const res = await API.get('/owners/history');
        historyData = res.data || [];
      } catch (err1) {
        const res = await API.get('/owner/history');
        historyData = res.data || [];
      }
      setHistory(historyData);

      // 2. Fetch buildings and all underlying apartments
      try {
        const bldgsRes = await API.get('/owners/buildings');
        const bldgs = bldgsRes.data || [];
        const units = [];
        for (const b of bldgs) {
          try {
            const aptRes = await API.get(`/owners/buildings/${b.buildingId}/apartments`);
            if (aptRes.data && aptRes.data.floors) {
              aptRes.data.floors.forEach(f => {
                if (f.apartments) {
                  units.push(...f.apartments);
                }
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch apartments for building ${b.buildingId}`, e);
          }
        }
        setApartments(units);
      } catch (err2) {
        console.warn('Failed to load buildings/apartments', err2);
      }
    } catch (err) {
      console.error('Failed to load resident occupancy history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndApartments();
  }, []);

  // Helper to match an item to an apartment roomNumber
  const matchesApartment = (item, room) => {
    if (!room || room === 'ALL') return true;
    const targetRoom = `${room}`.trim().toLowerCase();
    const itemRoom = `${item.roomNumber || ''}`.trim().toLowerCase();
    const itemAptName = `${item.apartmentName || ''}`.trim().toLowerCase();
    return itemRoom === targetRoom || itemAptName.includes(targetRoom);
  };

  // Compile unified apartment metadata options
  const allApartmentOptions = useMemo(() => {
    const map = new Map();

    // From configured building apartments
    apartments.forEach(apt => {
      const key = `${apt.roomNumber}`.trim().toLowerCase();
      map.set(key, {
        key: apt.roomNumber,
        apartmentName: apt.apartmentName || `Apartment ${apt.roomNumber}`,
        roomNumber: apt.roomNumber,
        buildingName: apt.buildingName || 'Skyline Luxury Towers',
        unitType: apt.unitType || 'Unit',
        floorNumber: apt.floorNumber,
        occupancyStatus: apt.occupancyStatus || 'UNKNOWN',
        currentResidentName: apt.currentResidentName,
        currentResidentEmail: apt.currentResidentEmail,
        currentResidentPhone: apt.currentResidentPhone,
        meterNumber: apt.meterNumber,
      });
    });

    // Also include any distinct units present in history
    history.forEach(item => {
      const room = item.roomNumber || item.apartmentName?.replace(/\D/g, '') || item.apartmentName;
      if (!room) return;
      const key = `${room}`.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          key: room,
          apartmentName: item.apartmentName || `Apartment ${room}`,
          roomNumber: room,
          buildingName: item.buildingName || 'Building',
          unitType: 'Unit',
          occupancyStatus: 'UNKNOWN',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.roomNumber, 10);
      const numB = parseInt(b.roomNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.roomNumber || '').localeCompare(b.roomNumber || '');
    });
  }, [apartments, history]);

  // Selected apartment metadata
  const selectedApartmentMeta = useMemo(() => {
    if (selectedApartment === 'ALL') return null;
    return allApartmentOptions.find(a => `${a.roomNumber}`.toLowerCase() === `${selectedApartment}`.toLowerCase()) || null;
  }, [selectedApartment, allApartmentOptions]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesCategory = selectedFilter === 'ALL' || item.activityType === selectedFilter;
      const matchesApt = matchesApartment(item, selectedApartment);
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.residentName && item.residentName.toLowerCase().includes(s)) ||
        (item.residentEmail && item.residentEmail.toLowerCase().includes(s)) ||
        (item.buildingName && item.buildingName.toLowerCase().includes(s)) ||
        (item.apartmentName && item.apartmentName.toLowerCase().includes(s)) ||
        (item.roomNumber && item.roomNumber.toLowerCase().includes(s)) ||
        (item.details && item.details.toLowerCase().includes(s)) ||
        (item.actor && item.actor.toLowerCase().includes(s));
      return matchesCategory && matchesApt && matchesSearch;
    });
  }, [history, selectedFilter, selectedApartment, searchTerm]);

  // Statistics
  const scopedHistory = useMemo(() => {
    return history.filter(item => matchesApartment(item, selectedApartment));
  }, [history, selectedApartment]);

  const joinedCount = scopedHistory.filter(item => item.activityType === 'JOINED').length;
  const leftCount = scopedHistory.filter(item => item.activityType === 'LEFT').length;

  const totalOccupiedUnits = allApartmentOptions.filter(a => a.occupancyStatus === 'OCCUPIED').length;
  const totalUnitsCount = allApartmentOptions.length;

  const getActionBadge = (type) => {
    if (type === 'JOINED') {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 rounded-pill fs-8 fw-semibold d-inline-flex align-items-center gap-1.5">
          <i className="bi bi-door-open-fill"></i>
          <span>Moved In</span>
        </span>
      );
    }
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 rounded-pill fs-8 fw-semibold d-inline-flex align-items-center gap-1.5">
        <i className="bi bi-box-arrow-right"></i>
        <span>Moved Out / Left</span>
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Group apartments for Apartment-Wise View
  const displayedApartmentGroups = useMemo(() => {
    const targetApts = selectedApartment === 'ALL'
      ? allApartmentOptions
      : allApartmentOptions.filter(a => `${a.roomNumber}`.toLowerCase() === `${selectedApartment}`.toLowerCase());

    return targetApts.map(apt => {
      const aptHistory = filteredHistory.filter(h => matchesApartment(h, apt.roomNumber));
      return {
        ...apt,
        history: aptHistory,
        totalMovements: aptHistory.length,
      };
    }).filter(group => {
      // If searching or filtering by status, hide apartments with zero matches unless directly selected
      if (selectedApartment !== 'ALL') return true;
      if (searchTerm || selectedFilter !== 'ALL') {
        return group.history.length > 0;
      }
      return true;
    });
  }, [allApartmentOptions, selectedApartment, filteredHistory, searchTerm, selectedFilter]);

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="fw-bold mb-1 text-dark">Resident Occupancy History</h2>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill fs-8">
              Apartment-Wise Telemetry
            </span>
          </div>
          <p className="text-muted small mb-0">
            Track chronological activity of residents moving into and moving out of apartments across your buildings
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* View Mode Switcher */}
          <div className="btn-group p-1 bg-light rounded-pill border" role="group">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1.5 ${
                viewMode === 'apartment' ? 'btn-white bg-white text-primary shadow-xs' : 'btn-light text-muted'
              }`}
              onClick={() => setViewMode('apartment')}
            >
              <i className="bi bi-grid-1x2"></i>
              <span>Apartment-Wise</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1.5 ${
                viewMode === 'flat' ? 'btn-white bg-white text-primary shadow-xs' : 'btn-light text-muted'
              }`}
              onClick={() => setViewMode('flat')}
            >
              <i className="bi bi-list-ul"></i>
              <span>Chronological List</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-outline-dark btn-sm px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 rounded-pill"
            onClick={fetchHistoryAndApartments}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-3">
          <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted fs-8 text-uppercase fw-bold">Total Movement Records</div>
                <div className="fs-3 fw-bold text-dark mt-1">{scopedHistory.length}</div>
                <div className="text-muted fs-9 mt-0.5">
                  {selectedApartment === 'ALL' ? 'Across all apartments' : `For Flat ${selectedApartment}`}
                </div>
              </div>
              <div className="rounded-3 bg-light border p-2.5 text-dark fs-4">
                <i className="bi bi-clock-history"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-success fs-8 text-uppercase fw-bold">Residents Moved In</div>
                <div className="fs-3 fw-bold text-success mt-1">{joinedCount}</div>
                <div className="text-muted fs-9 mt-0.5">Move-in occupancy entries</div>
              </div>
              <div className="rounded-3 bg-success-subtle border border-success-subtle p-2.5 text-success fs-4">
                <i className="bi bi-door-open-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-danger fs-8 text-uppercase fw-bold">Residents Moved Out</div>
                <div className="fs-3 fw-bold text-danger mt-1">{leftCount}</div>
                <div className="text-muted fs-9 mt-0.5">Vacated / removed units</div>
              </div>
              <div className="rounded-3 bg-danger-subtle border border-danger-subtle p-2.5 text-danger fs-4">
                <i className="bi bi-box-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-primary fs-8 text-uppercase fw-bold">Apartments Monitored</div>
                <div className="fs-3 fw-bold text-primary mt-1">
                  {selectedApartment === 'ALL' ? totalUnitsCount : 1}
                </div>
                <div className="text-muted fs-9 mt-0.5">
                  {selectedApartment === 'ALL'
                    ? `${totalOccupiedUnits} Occupied • ${totalUnitsCount - totalOccupiedUnits} Vacant`
                    : selectedApartmentMeta?.occupancyStatus || 'Monitored'}
                </div>
              </div>
              <div className="rounded-3 bg-primary-subtle border border-primary-subtle p-2.5 text-primary fs-4">
                <i className="bi bi-building"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Apartment Hero Banner (Shown when a specific apartment is active) */}
      {selectedApartmentMeta && (
        <div className="card glass-card border border-primary-subtle bg-white shadow-xs p-3.5 rounded-3 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-primary text-white p-3 d-flex align-items-center justify-content-center shadow-xs"
                style={{ width: '52px', height: '52px' }}
              >
                <i className="bi bi-door-open fs-3"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className="fw-bold mb-0 text-dark">{selectedApartmentMeta.apartmentName}</h4>
                  <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 fs-8">
                    Flat {selectedApartmentMeta.roomNumber}
                  </span>
                  {selectedApartmentMeta.unitType && (
                    <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1 fs-8">
                      {selectedApartmentMeta.unitType}
                    </span>
                  )}
                  {selectedApartmentMeta.occupancyStatus === 'OCCUPIED' ? (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fs-8 fw-semibold">
                      <i className="bi bi-check-circle-fill me-1"></i>Currently Occupied
                    </span>
                  ) : (
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 fs-8 fw-semibold">
                      <i className="bi bi-dash-circle me-1"></i>Currently Vacant
                    </span>
                  )}
                </div>
                <div className="text-muted small mt-1.5 d-flex align-items-center gap-3 flex-wrap">
                  <span>
                    <i className="bi bi-building me-1 text-primary"></i>
                    {selectedApartmentMeta.buildingName}
                  </span>
                  {selectedApartmentMeta.floorNumber && (
                    <span>
                      <i className="bi bi-layers me-1 text-muted"></i>
                      Floor {selectedApartmentMeta.floorNumber}
                    </span>
                  )}
                  {selectedApartmentMeta.currentResidentName ? (
                    <span className="text-dark fw-medium">
                      <i className="bi bi-person-fill text-success me-1"></i>
                      Active Occupant: <strong>{selectedApartmentMeta.currentResidentName}</strong>
                      {selectedApartmentMeta.currentResidentEmail ? ` (${selectedApartmentMeta.currentResidentEmail})` : ''}
                    </span>
                  ) : (
                    <span className="text-muted">
                      <i className="bi bi-person-x me-1"></i>No active tenant
                    </span>
                  )}
                  {selectedApartmentMeta.meterNumber && (
                    <span>
                      <i className="bi bi-speedometer2 me-1 text-info"></i>
                      Meter: {selectedApartmentMeta.meterNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5"
                onClick={() => setSelectedApartment('ALL')}
              >
                <i className="bi bi-grid"></i>
                <span>View All Apartments</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apartment Selector & Filter Toolbar */}
      <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 mb-4">
        <div className="row g-3 align-items-center">
          {/* Option to Select Apartment */}
          <div className="col-12 col-md-5 col-lg-4">
            <div className="d-flex align-items-center gap-2">
              <label className="fw-bold small text-muted text-uppercase mb-0 text-nowrap d-flex align-items-center gap-1.5">
                <i className="bi bi-door-closed text-primary"></i>
                <span>Apartment:</span>
              </label>
              <select
                className="form-select form-select-sm border-primary-subtle shadow-xs fw-medium"
                value={selectedApartment}
                onChange={(e) => setSelectedApartment(e.target.value)}
              >
                <option value="ALL">🏢 All Apartments ({history.length} movement records)</option>
                {allApartmentOptions.map((apt) => {
                  const count = history.filter(h => matchesApartment(h, apt.roomNumber)).length;
                  const statusLabel = apt.occupancyStatus === 'OCCUPIED' ? 'Occupied' : 'Vacant';
                  return (
                    <option key={apt.key} value={apt.roomNumber}>
                      {apt.apartmentName} (Flat {apt.roomNumber}) — {statusLabel} • {count} record{count === 1 ? '' : 's'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Activity Category Buttons */}
          <div className="col-12 col-md-7 col-lg-5">
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn btn-sm ${selectedFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedFilter('ALL')}
              >
                All Activity ({scopedHistory.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedFilter === 'JOINED' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedFilter('JOINED')}
              >
                Moved In ({joinedCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedFilter === 'LEFT' ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedFilter('LEFT')}
              >
                Moved Out ({leftCount})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="col-12 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder="Search resident, room, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-sm btn-outline-secondary border-start-0"
                  type="button"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Apartment Selector Pills */}
        <div className="d-flex align-items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-top">
          <span className="text-muted fs-8 text-uppercase fw-bold me-1 text-nowrap">
            Quick Select:
          </span>
          <button
            type="button"
            className={`btn btn-xs rounded-pill px-2.5 py-1 text-nowrap fw-semibold ${
              selectedApartment === 'ALL'
                ? 'btn-dark'
                : 'btn-outline-secondary bg-light'
            }`}
            onClick={() => setSelectedApartment('ALL')}
          >
            All Units ({history.length})
          </button>
          {allApartmentOptions.map((apt) => {
            const count = history.filter(h => matchesApartment(h, apt.roomNumber)).length;
            const isSelected = `${selectedApartment}`.toLowerCase() === `${apt.roomNumber}`.toLowerCase();
            return (
              <button
                key={apt.key}
                type="button"
                className={`btn btn-xs rounded-pill px-2.5 py-1 text-nowrap fw-semibold d-inline-flex align-items-center gap-1 ${
                  isSelected
                    ? 'btn-primary shadow-xs'
                    : 'btn-outline-secondary bg-light'
                }`}
                onClick={() => setSelectedApartment(apt.roomNumber)}
              >
                <i className="bi bi-door-closed"></i>
                <span>Flat {apt.roomNumber}</span>
                <span className={`badge rounded-pill ${isSelected ? 'bg-white text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card glass-card border shadow-xs bg-white p-5 text-center rounded-3">
          <LoadingSpinner text="Loading apartment-wise occupancy history..." />
        </div>
      ) : filteredHistory.length === 0 && selectedApartment === 'ALL' ? (
        <div className="card glass-card border shadow-xs bg-white p-5 text-center text-muted rounded-3">
          <div className="mb-3">
            <i className="bi bi-journal-x fs-1 text-secondary opacity-50"></i>
          </div>
          <h5 className="fw-semibold text-dark mb-1">No Activity Records Found</h5>
          <p className="small mb-0">
            {searchTerm || selectedFilter !== 'ALL'
              ? 'Try adjusting your search criteria or category filter.'
              : 'No resident movements recorded yet for your buildings.'}
          </p>
        </div>
      ) : viewMode === 'apartment' ? (
        /* ================= APARTMENT-WISE VIEW ================= */
        <div className="d-flex flex-column gap-4">
          {displayedApartmentGroups.map((group) => {
            const isOccupied = group.occupancyStatus === 'OCCUPIED';
            return (
              <div
                key={group.key}
                className="card glass-card border shadow-xs bg-white rounded-3 overflow-hidden"
              >
                {/* Apartment Group Header */}
                <div className="card-header bg-light border-bottom p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2.5">
                    <div className="rounded-3 bg-white border p-2 text-primary shadow-2xs">
                      <i className="bi bi-door-open fs-5"></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="fw-bold mb-0 text-dark">{group.apartmentName}</h5>
                        <span className="badge bg-secondary-subtle text-secondary border">
                          Flat {group.roomNumber}
                        </span>
                        {group.unitType && (
                          <span className="badge bg-info-subtle text-info border border-info-subtle">
                            {group.unitType}
                          </span>
                        )}
                        {isOccupied ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            <i className="bi bi-check-circle-fill me-1"></i>Occupied
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            <i className="bi bi-dash-circle me-1"></i>Vacant
                          </span>
                        )}
                      </div>
                      <div className="text-muted fs-8 mt-0.5">
                        <i className="bi bi-building me-1"></i>
                        {group.buildingName}
                        {group.currentResidentName && (
                          <span className="ms-2">
                            • Current Resident: <strong>{group.currentResidentName}</strong>
                          </span>
                        )}
                        {group.meterNumber && (
                          <span className="ms-2">
                            • Meter: <code>{group.meterNumber}</code>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-white border text-dark px-2.5 py-1.5 rounded-pill fs-8 fw-semibold">
                      <i className="bi bi-clock-history me-1 text-primary"></i>
                      {group.history.length} movement event{group.history.length === 1 ? '' : 's'}
                    </span>
                    {selectedApartment === 'ALL' && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-xs rounded-pill px-2.5"
                        onClick={() => setSelectedApartment(group.roomNumber)}
                      >
                        Focus Unit
                      </button>
                    )}
                  </div>
                </div>

                {/* Apartment Movements Table */}
                {group.history.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <i className="bi bi-info-circle fs-4 text-secondary opacity-50 d-block mb-1"></i>
                    <span className="small">No resident occupancy records logged yet for this apartment.</span>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-uppercase fs-8 text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Movement Type</th>
                          <th className="py-2.5 px-3">Resident</th>
                          <th className="py-2.5 px-3">Activity Details</th>
                          <th className="py-2.5 px-3">Initiator / Actor</th>
                          <th className="py-2.5 px-3">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="fs-7">
                        {group.history.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 px-3">
                              {getActionBadge(item.activityType)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="fw-bold text-dark">{item.residentName}</div>
                              <div className="text-muted fs-8">
                                {item.residentEmail}
                                {item.residentPhone ? ` • ${item.residentPhone}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-dark small" style={{ maxWidth: '380px' }}>
                                {item.details}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="badge bg-light text-dark border px-2 py-1 fs-8">
                                <i className="bi bi-person me-1"></i>
                                {item.actor || 'System'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-nowrap text-muted small">
                              <i className="bi bi-calendar3 me-1.5 opacity-75"></i>
                              {formatDate(item.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= CHRONOLOGICAL LIST VIEW ================= */
        <div className="card glass-card border shadow-xs bg-white rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-uppercase fs-8 text-muted">
                <tr>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Resident</th>
                  <th className="py-3 px-3">Apartment & Building</th>
                  <th className="py-3 px-3">Activity Details</th>
                  <th className="py-3 px-3">Initiator / Actor</th>
                  <th className="py-3 px-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="fs-7">
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3">
                      {getActionBadge(item.activityType)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="fw-bold text-dark">{item.residentName}</div>
                      <div className="text-muted fs-8">
                        {item.residentEmail}
                        {item.residentPhone ? ` • ${item.residentPhone}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="fw-semibold text-dark d-flex align-items-center gap-1.5">
                        <i className="bi bi-door-closed text-primary"></i>
                        <span>{item.apartmentName || (item.roomNumber ? `Flat ${item.roomNumber}` : 'Apartment')}</span>
                      </div>
                      <div className="text-muted fs-8">
                        <i className="bi bi-building me-1"></i>
                        {item.buildingName}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-dark small" style={{ maxWidth: '320px' }}>
                        {item.details}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="badge bg-light text-dark border px-2 py-1 fs-8">
                        <i className="bi bi-person me-1"></i>
                        {item.actor || 'System'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-nowrap text-muted small">
                      <i className="bi bi-calendar3 me-1.5 opacity-75"></i>
                      {formatDate(item.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
