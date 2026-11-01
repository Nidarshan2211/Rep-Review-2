import React, { useState, useEffect, useMemo } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function OwnerHistoryPage() {
  const [history, setHistory] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingApartmentsMap, setBuildingApartmentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'JOINED' | 'LEFT'
  const [selectedBuilding, setSelectedBuilding] = useState('ALL'); // 'ALL' | buildingId or buildingName
  const [selectedApartment, setSelectedApartment] = useState('ALL'); // 'ALL' | roomNumber
  const [viewMode, setViewMode] = useState('building'); // 'building' | 'flat'

  // Fetch history and building portfolio
  const fetchHistoryAndBuildings = async () => {
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

      // 2. Fetch owner buildings and their apartment metadata
      try {
        const bldgsRes = await API.get('/owners/buildings');
        const bldgsList = bldgsRes.data || [];
        setBuildings(bldgsList);

        const aptsMap = {};
        for (const b of bldgsList) {
          try {
            const aptRes = await API.get(`/owners/buildings/${b.buildingId}/apartments`);
            if (aptRes.data) {
              const units = [];
              if (aptRes.data.floors) {
                aptRes.data.floors.forEach(f => {
                  if (f.apartments) units.push(...f.apartments);
                });
              }
              aptsMap[b.buildingId] = {
                summary: aptRes.data,
                units: units
              };
            }
          } catch (e) {
            console.warn(`Failed to fetch apartments for building ${b.buildingId}`, e);
          }
        }
        setBuildingApartmentsMap(aptsMap);
      } catch (err2) {
        console.warn('Failed to load buildings', err2);
      }
    } catch (err) {
      console.error('Failed to load resident occupancy history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndBuildings();
  }, []);

  // Match item to building
  const matchesBuilding = (item, bldgKey) => {
    if (!bldgKey || bldgKey === 'ALL') return true;
    const target = `${bldgKey}`.trim().toLowerCase();
    const itemBldg = `${item.buildingName || ''}`.trim().toLowerCase();
    return itemBldg === target || itemBldg.includes(target);
  };

  // Match item to apartment
  const matchesApartment = (item, room) => {
    if (!room || room === 'ALL') return true;
    const targetRoom = `${room}`.trim().toLowerCase();
    const itemRoom = `${item.roomNumber || ''}`.trim().toLowerCase();
    const itemAptName = `${item.apartmentName || ''}`.trim().toLowerCase();
    return itemRoom === targetRoom || itemAptName.includes(targetRoom);
  };

  // Unified buildings list (from API + any distinct names in history)
  const allBuildingOptions = useMemo(() => {
    const map = new Map();

    // From buildings API
    buildings.forEach(b => {
      const key = `${b.buildingName}`.trim().toLowerCase();
      const aptData = buildingApartmentsMap[b.buildingId];
      map.set(key, {
        id: b.buildingId,
        buildingName: b.buildingName,
        buildingNumber: b.buildingNumber || 'N/A',
        location: b.location || 'Bengaluru',
        totalFlats: b.totalFlats || (aptData ? aptData.units.length : 0),
        configuredCount: aptData ? aptData.units.length : 0,
        occupiedCount: aptData?.summary?.occupiedCount ?? aptData?.units.filter(u => u.occupancyStatus === 'OCCUPIED').length ?? 0,
        vacantCount: aptData?.summary?.vacantCount ?? aptData?.units.filter(u => u.occupancyStatus === 'VACANT').length ?? 0,
        units: aptData ? aptData.units : [],
      });
    });

    // From history items
    history.forEach(item => {
      const bldgName = item.buildingName || 'Building';
      const key = bldgName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          buildingName: bldgName,
          buildingNumber: 'N/A',
          location: 'N/A',
          totalFlats: 0,
          configuredCount: 0,
          occupiedCount: 0,
          vacantCount: 0,
          units: [],
        });
      }
    });

    return Array.from(map.values());
  }, [buildings, buildingApartmentsMap, history]);

  // Selected building metadata
  const selectedBuildingMeta = useMemo(() => {
    if (selectedBuilding === 'ALL') return null;
    return allBuildingOptions.find(
      b => `${b.buildingName}`.toLowerCase() === `${selectedBuilding}`.toLowerCase() ||
           `${b.id}`.toLowerCase() === `${selectedBuilding}`.toLowerCase()
    ) || null;
  }, [selectedBuilding, allBuildingOptions]);

  // Available apartments for the current building selection
  const availableApartmentsForBuilding = useMemo(() => {
    const roomSet = new Set();
    const result = [];

    // Filter relevant history items
    const relevantItems = history.filter(h => matchesBuilding(h, selectedBuildingMeta?.buildingName || selectedBuilding));
    relevantItems.forEach(item => {
      const room = item.roomNumber || item.apartmentName?.replace(/\D/g, '') || item.apartmentName;
      if (room && !roomSet.has(room)) {
        roomSet.add(room);
        result.push({
          roomNumber: room,
          displayName: item.apartmentName || `Flat ${room}`
        });
      }
    });

    // Also include configured units if building meta exists
    if (selectedBuildingMeta && selectedBuildingMeta.units) {
      selectedBuildingMeta.units.forEach(u => {
        if (!roomSet.has(u.roomNumber)) {
          roomSet.add(u.roomNumber);
          result.push({
            roomNumber: u.roomNumber,
            displayName: u.apartmentName || `Flat ${u.roomNumber}`
          });
        }
      });
    }

    return result.sort((a, b) => {
      const numA = parseInt(a.roomNumber, 10);
      const numB = parseInt(b.roomNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  }, [history, selectedBuilding, selectedBuildingMeta]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesCat = selectedFilter === 'ALL' || item.activityType === selectedFilter;
      const matchesBldg = matchesBuilding(item, selectedBuildingMeta?.buildingName || selectedBuilding);
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
      return matchesCat && matchesBldg && matchesApt && matchesSearch;
    });
  }, [history, selectedFilter, selectedBuilding, selectedBuildingMeta, selectedApartment, searchTerm]);

  // Statistics scoped to the selected building and apartment
  const scopedHistory = useMemo(() => {
    return history.filter(item =>
      matchesBuilding(item, selectedBuildingMeta?.buildingName || selectedBuilding) &&
      matchesApartment(item, selectedApartment)
    );
  }, [history, selectedBuilding, selectedBuildingMeta, selectedApartment]);

  const joinedCount = scopedHistory.filter(item => item.activityType === 'JOINED').length;
  const leftCount = scopedHistory.filter(item => item.activityType === 'LEFT').length;

  const totalBuildingsCount = allBuildingOptions.length;
  const totalFlatsCount = allBuildingOptions.reduce((sum, b) => sum + (b.totalFlats || 0), 0);
  const totalOccupiedCount = allBuildingOptions.reduce((sum, b) => sum + (b.occupiedCount || 0), 0);

  // Group history by building for the Building-Wise Showcase view
  const displayedBuildingGroups = useMemo(() => {
    const targetBuildings = selectedBuilding === 'ALL'
      ? allBuildingOptions
      : allBuildingOptions.filter(b =>
          `${b.buildingName}`.toLowerCase() === `${selectedBuildingMeta?.buildingName || selectedBuilding}`.toLowerCase()
        );

    return targetBuildings.map(bldg => {
      const bldgHistory = filteredHistory.filter(h => matchesBuilding(h, bldg.buildingName));
      return {
        ...bldg,
        history: bldgHistory,
        totalMovements: bldgHistory.length,
        moveInCount: bldgHistory.filter(h => h.activityType === 'JOINED').length,
        moveOutCount: bldgHistory.filter(h => h.activityType === 'LEFT').length,
      };
    }).filter(group => {
      if (selectedBuilding !== 'ALL') return true;
      if (searchTerm || selectedFilter !== 'ALL' || selectedApartment !== 'ALL') {
        return group.history.length > 0;
      }
      return true;
    });
  }, [allBuildingOptions, selectedBuilding, selectedBuildingMeta, filteredHistory, searchTerm, selectedFilter, selectedApartment]);

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

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="fw-bold mb-1 text-dark">Resident Occupancy History</h2>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill fs-8">
              Building-Wise Showcase
            </span>
          </div>
          <p className="text-muted small mb-0">
            Track chronological activity of residents moving into and moving out of apartments across your building portfolio
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* View Mode Switcher */}
          <div className="btn-group p-1 bg-light rounded-pill border" role="group">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1.5 ${
                viewMode === 'building' ? 'btn-white bg-white text-primary shadow-xs' : 'btn-light text-muted'
              }`}
              onClick={() => setViewMode('building')}
            >
              <i className="bi bi-buildings"></i>
              <span>Building Showcase</span>
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
            onClick={fetchHistoryAndBuildings}
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
                  {selectedBuilding === 'ALL'
                    ? 'Across all buildings'
                    : `In ${selectedBuildingMeta?.buildingName || selectedBuilding}`}
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
                <div className="text-muted fs-9 mt-0.5">Move-in occupancy records</div>
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
                <div className="text-primary fs-8 text-uppercase fw-bold">Building Portfolio</div>
                <div className="fs-3 fw-bold text-primary mt-1">
                  {selectedBuilding === 'ALL' ? totalBuildingsCount : 1}
                </div>
                <div className="text-muted fs-9 mt-0.5">
                  {selectedBuilding === 'ALL'
                    ? `${totalFlatsCount} Total Flats • ${totalOccupiedCount} Occupied`
                    : `${selectedBuildingMeta?.totalFlats || 0} Flats • ${selectedBuildingMeta?.occupiedCount || 0} Occupied`}
                </div>
              </div>
              <div className="rounded-3 bg-primary-subtle border border-primary-subtle p-2.5 text-primary fs-4">
                <i className="bi bi-building"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Building Showcase Hero (Shown when a specific building is active) */}
      {selectedBuildingMeta && (
        <div className="card glass-card border border-primary-subtle bg-white shadow-xs p-3.5 rounded-3 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-primary text-white p-3 d-flex align-items-center justify-content-center shadow-xs"
                style={{ width: '56px', height: '56px' }}
              >
                <i className="bi bi-buildings-fill fs-3"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className="fw-bold mb-0 text-dark">{selectedBuildingMeta.buildingName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-8">
                    Block {selectedBuildingMeta.buildingNumber}
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-8">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    {selectedBuildingMeta.occupiedCount} Occupied
                  </span>
                  {selectedBuildingMeta.vacantCount > 0 && (
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 fs-8">
                      {selectedBuildingMeta.vacantCount} Vacant
                    </span>
                  )}
                </div>
                <div className="text-muted small mt-1.5 d-flex align-items-center gap-3 flex-wrap">
                  <span>
                    <i className="bi bi-geo-alt me-1 text-danger"></i>
                    {selectedBuildingMeta.location}
                  </span>
                  <span>
                    <i className="bi bi-grid me-1 text-muted"></i>
                    Capacity: {selectedBuildingMeta.totalFlats} Flats
                  </span>
                  <span>
                    <i className="bi bi-clock-history me-1 text-primary"></i>
                    Movements Logged: <strong>{scopedHistory.length} records</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5"
                onClick={() => {
                  setSelectedBuilding('ALL');
                  setSelectedApartment('ALL');
                }}
              >
                <i className="bi bi-grid"></i>
                <span>Show All Buildings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Building-Wise Filter & Selection Toolbar */}
      <div className="card glass-card border shadow-xs bg-white p-3 rounded-3 mb-4">
        <div className="row g-3 align-items-center">
          {/* Building Selector Dropdown */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="d-flex align-items-center gap-2">
              <label className="fw-bold small text-muted text-uppercase mb-0 text-nowrap d-flex align-items-center gap-1.5">
                <i className="bi bi-buildings text-primary"></i>
                <span>Building:</span>
              </label>
              <select
                className="form-select form-select-sm border-primary-subtle shadow-xs fw-semibold"
                value={selectedBuilding}
                onChange={(e) => {
                  setSelectedBuilding(e.target.value);
                  setSelectedApartment('ALL');
                }}
              >
                <option value="ALL">🏢 All Buildings ({history.length} movement records)</option>
                {allBuildingOptions.map((b) => {
                  const count = history.filter(h => matchesBuilding(h, b.buildingName)).length;
                  return (
                    <option key={b.id || b.buildingName} value={b.buildingName}>
                      {b.buildingName} ({b.buildingNumber}) — {count} record{count === 1 ? '' : 's'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Optional Apartment Filter within Building */}
          {availableApartmentsForBuilding.length > 0 && (
            <div className="col-12 col-md-6 col-lg-3">
              <div className="d-flex align-items-center gap-2">
                <label className="fw-bold small text-muted text-uppercase mb-0 text-nowrap d-flex align-items-center gap-1.5">
                  <i className="bi bi-door-closed text-secondary"></i>
                  <span>Unit:</span>
                </label>
                <select
                  className="form-select form-select-sm shadow-xs"
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                >
                  <option value="ALL">All Units in Building</option>
                  {availableApartmentsForBuilding.map(apt => (
                    <option key={apt.roomNumber} value={apt.roomNumber}>
                      {apt.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Activity Category Tabs */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn btn-sm ${selectedFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedFilter('ALL')}
              >
                All ({scopedHistory.length})
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
          <div className="col-12 col-md-6 col-lg-2">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder="Search resident, room..."
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

        {/* Quick Building Selector Chips */}
        <div className="d-flex align-items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-top">
          <span className="text-muted fs-8 text-uppercase fw-bold me-1 text-nowrap">
            Select Building:
          </span>
          <button
            type="button"
            className={`btn btn-xs rounded-pill px-3 py-1 text-nowrap fw-semibold ${
              selectedBuilding === 'ALL'
                ? 'btn-dark'
                : 'btn-outline-secondary bg-light'
            }`}
            onClick={() => {
              setSelectedBuilding('ALL');
              setSelectedApartment('ALL');
            }}
          >
            All Buildings ({history.length})
          </button>
          {allBuildingOptions.map((b) => {
            const count = history.filter(h => matchesBuilding(h, b.buildingName)).length;
            const isSelected = selectedBuildingMeta?.buildingName === b.buildingName || selectedBuilding === b.buildingName;
            return (
              <button
                key={b.id || b.buildingName}
                type="button"
                className={`btn btn-xs rounded-pill px-3 py-1 text-nowrap fw-semibold d-inline-flex align-items-center gap-1.5 ${
                  isSelected
                    ? 'btn-primary shadow-xs'
                    : 'btn-outline-secondary bg-light'
                }`}
                onClick={() => {
                  setSelectedBuilding(b.buildingName);
                  setSelectedApartment('ALL');
                }}
              >
                <i className="bi bi-building"></i>
                <span>{b.buildingName}</span>
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
          <LoadingSpinner text="Loading building-wise occupancy history..." />
        </div>
      ) : filteredHistory.length === 0 && selectedBuilding === 'ALL' ? (
        <div className="card glass-card border shadow-xs bg-white p-5 text-center text-muted rounded-3">
          <div className="mb-3">
            <i className="bi bi-journal-x fs-1 text-secondary opacity-50"></i>
          </div>
          <h5 className="fw-semibold text-dark mb-1">No Activity Records Found</h5>
          <p className="small mb-0">
            {searchTerm || selectedFilter !== 'ALL' || selectedApartment !== 'ALL'
              ? 'Try adjusting your search criteria, unit, or category filter.'
              : 'No resident movements recorded yet for your buildings.'}
          </p>
        </div>
      ) : viewMode === 'building' ? (
        /* ================= BUILDING-WISE SHOWCASE VIEW ================= */
        <div className="d-flex flex-column gap-4">
          {displayedBuildingGroups.map((bldg) => (
            <div
              key={bldg.id || bldg.buildingName}
              className="card glass-card border shadow-xs bg-white rounded-3 overflow-hidden"
            >
              {/* Building Showcase Header */}
              <div className="card-header bg-light border-bottom p-3.5 d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-3 bg-white border p-2.5 text-primary shadow-2xs">
                    <i className="bi bi-buildings-fill fs-4"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h5 className="fw-bold mb-0 text-dark">{bldg.buildingName}</h5>
                      <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 fs-8">
                        Block {bldg.buildingNumber}
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-8">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {bldg.occupiedCount} Occupied Units
                      </span>
                      {bldg.vacantCount > 0 && (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 fs-8">
                          {bldg.vacantCount} Vacant
                        </span>
                      )}
                    </div>
                    <div className="text-muted fs-8 mt-1 d-flex align-items-center gap-3 flex-wrap">
                      <span>
                        <i className="bi bi-geo-alt me-1 text-danger"></i>
                        {bldg.location}
                      </span>
                      <span>
                        <i className="bi bi-door-open me-1 text-primary"></i>
                        Total Flats: {bldg.totalFlats}
                      </span>
                      <span>
                        <i className="bi bi-arrow-down-left me-1 text-success"></i>
                        {bldg.moveInCount} Moved In
                      </span>
                      <span>
                        <i className="bi bi-arrow-up-right me-1 text-danger"></i>
                        {bldg.moveOutCount} Moved Out
                      </span>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-white border text-dark px-3 py-1.5 rounded-pill fs-8 fw-semibold">
                    <i className="bi bi-clock-history me-1 text-primary"></i>
                    {bldg.history.length} movement record{bldg.history.length === 1 ? '' : 's'}
                  </span>
                  {selectedBuilding === 'ALL' && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-xs rounded-pill px-3 py-1 fw-semibold"
                      onClick={() => setSelectedBuilding(bldg.buildingName)}
                    >
                      <i className="bi bi-filter me-1"></i>
                      Focus Building
                    </button>
                  )}
                </div>
              </div>

              {/* Building Movements Table */}
              {bldg.history.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-info-circle fs-4 text-secondary opacity-50 d-block mb-1"></i>
                  <span className="small">No resident occupancy records logged yet for this building.</span>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase fs-8 text-muted">
                      <tr>
                        <th className="py-3 px-3">Movement Type</th>
                        <th className="py-3 px-3">Resident</th>
                        <th className="py-3 px-3">Apartment / Unit</th>
                        <th className="py-3 px-3">Activity Details</th>
                        <th className="py-3 px-3">Initiator / Actor</th>
                        <th className="py-3 px-3">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="fs-7">
                      {bldg.history.map((item) => (
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
                              <span>
                                {item.apartmentName || (item.roomNumber ? `Flat ${item.roomNumber}` : 'Apartment')}
                              </span>
                            </div>
                            <div className="text-muted fs-8">
                              Room #{item.roomNumber || 'N/A'}
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
          ))}
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
                  <th className="py-3 px-3">Building & Apartment</th>
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
                        <i className="bi bi-building text-primary"></i>
                        <span>{item.buildingName}</span>
                      </div>
                      <div className="text-muted fs-8">
                        <i className="bi bi-door-closed me-1"></i>
                        {item.apartmentName || (item.roomNumber ? `Flat ${item.roomNumber}` : 'Apartment')}
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
