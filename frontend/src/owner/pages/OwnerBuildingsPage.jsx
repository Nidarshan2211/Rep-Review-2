import React, { useState, useEffect } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function OwnerBuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Building Modal
  const [formData, setFormData] = useState({
    buildingName: '',
    buildingNumber: '',
    totalFlats: 10,
    location: ''
  });
  const [showModal, setShowModal] = useState(false);

  // Inventory Modal State
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showAddUnitsForm, setShowAddUnitsForm] = useState(false);
  const [unitFormData, setUnitFormData] = useState({
    floorNumber: 1,
    unitType: '2BHK',
    roomNumbers: '',
    meterPrefix: '',
    customMeters: {}
  });
  const [unitError, setUnitError] = useState('');
  const [unitSuccess, setUnitSuccess] = useState('');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [generatingUnits, setGeneratingUnits] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [residentInfoModal, setResidentInfoModal] = useState(null);
  const [editingMeterApt, setEditingMeterApt] = useState(null);
  const [editingMeterNumber, setEditingMeterNumber] = useState('');
  const [updatingMeter, setUpdatingMeter] = useState(false);

  const fetchBuildings = () => {
    API.get('/owners/buildings')
      .then(res => setBuildings(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      await API.post('/owners/buildings', formData);
      setShowModal(false);
      setFormData({ buildingName: '', buildingNumber: '', totalFlats: 10, location: '' });
      fetchBuildings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create building');
    }
  };

  const handleDeleteBuilding = async (buildingId, buildingName) => {
    if (!window.confirm(`Are you sure you want to remove building "${buildingName}" and all related units, meters, and records from the database?`)) return;
    setActionLoadingId(`del-bldg-${buildingId}`);
    try {
      await API.delete(`/owners/buildings/${buildingId}`);
      setBuildings(prev => prev.filter(b => b.buildingId !== buildingId));
      if (selectedBuilding && selectedBuilding.buildingId === buildingId) {
        setSelectedBuilding(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete building.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openInventoryModal = async (building) => {
    setSelectedBuilding(building);
    setLoadingInventory(true);
    setUnitError('');
    setUnitSuccess('');
    setShowAddUnitsForm(false);
    setRoomFilter('ALL');
    setUnitFormData({
      floorNumber: 1,
      unitType: '2BHK',
      roomNumbers: '',
      meterPrefix: `WM-${building.buildingNumber}-`,
      customMeters: {}
    });
    try {
      const res = await API.get(`/owners/buildings/${building.buildingId}/apartments`);
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to load building inventory:', err);
      alert('Failed to load inventory for this building.');
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleAcceptRequest = async (requestId, roomNumber) => {
    if (!window.confirm(`Approve resident occupancy request for Unit ${roomNumber}?`)) return;
    setActionLoadingId(`accept-${requestId}`);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.post(`/owner/occupancy-requests/${requestId}/review`, {
        approved: true,
        reason: 'Approved by Building Owner from Building Inventory'
      });
      setUnitSuccess(`✓ Occupancy request approved for Unit ${roomNumber}! Unit is now occupied.`);
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
      fetchBuildings();
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId, roomNumber) => {
    const reason = window.prompt(`Please provide a reason to decline occupancy request for Unit ${roomNumber}:`, 'Unit not currently available');
    if (reason === null) return;
    setActionLoadingId(`reject-${requestId}`);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.post(`/owner/occupancy-requests/${requestId}/review`, {
        approved: false,
        reason: reason || 'Declined by owner'
      });
      setUnitSuccess(`✓ Request for Unit ${roomNumber} has been rejected. Unit is now vacant.`);
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId, roomNumber) => {
    if (!window.confirm(`Cancel pending invitation for Unit ${roomNumber}?`)) return;
    setActionLoadingId(`cancel-inv-${invitationId}`);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.delete(`/owners/invitations/${invitationId}`);
      setUnitSuccess(`✓ Invitation cancelled for Unit ${roomNumber}. Unit is now vacant.`);
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to cancel invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVacateApartment = async (apartmentId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to remove the current resident from Unit ${roomNumber}? This will vacate the unit while preserving historical billing records.`)) return;
    setActionLoadingId(`vacate-${apartmentId}`);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.post(`/owners/apartments/${apartmentId}/vacate`);
      setUnitSuccess(`✓ Resident removed. Unit ${roomNumber} is now vacant.`);
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
      fetchBuildings();
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to vacate apartment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteApartment = async (apartmentId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete vacant Unit ${roomNumber} from inventory?`)) return;
    setActionLoadingId(`delete-${apartmentId}`);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.delete(`/owners/apartments/${apartmentId}`);
      setUnitSuccess(`✓ Unit ${roomNumber} deleted from building inventory.`);
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
      fetchBuildings();
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to delete unit.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAutoGenerateUnits = async () => {
    setGeneratingUnits(true);
    setUnitError('');
    setUnitSuccess('');
    try {
      const res = await API.post(`/owners/buildings/${selectedBuilding.buildingId}/generate-default-apartments`);
      setInventory(res.data);
      setUnitSuccess(`✓ All planned units successfully populated for ${selectedBuilding.buildingName}! Total configured units: ${res.data?.configuredUnitsCount || 0}.`);
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to generate units.');
    } finally {
      setGeneratingUnits(false);
    }
  };

  const handleAddUnits = async (e) => {
    e.preventDefault();
    setUnitError('');
    setUnitSuccess('');

    if (!unitFormData.roomNumbers.trim()) {
      setUnitError('Please enter at least one room number.');
      return;
    }

    const rooms = unitFormData.roomNumbers
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (rooms.length === 0) {
      setUnitError('Please enter valid room numbers.');
      return;
    }

    const prefix = unitFormData.meterPrefix?.trim() || `WM-${selectedBuilding.buildingNumber}-`;
    const roomMeters = rooms.map(room => ({
      roomNumber: room,
      meterNumber: unitFormData.customMeters?.[room]?.trim() || (prefix.endsWith('-') ? `${prefix}${room}` : `${prefix}-${room}`)
    }));

    try {
      await API.post(`/owners/buildings/${selectedBuilding.buildingId}/floors/batch-apartments`, {
        buildingId: selectedBuilding.buildingId,
        floorNumber: parseInt(unitFormData.floorNumber),
        unitType: unitFormData.unitType,
        roomNumbers: rooms,
        meterPrefix: prefix,
        roomMeters: roomMeters
      });

      setUnitSuccess(`✓ Successfully configured ${rooms.length} unit(s) with dedicated Water Meter IDs on Floor ${unitFormData.floorNumber}.`);
      setUnitFormData({
        floorNumber: unitFormData.floorNumber,
        unitType: unitFormData.unitType,
        roomNumbers: '',
        meterPrefix: prefix,
        customMeters: {}
      });
      setShowAddUnitsForm(false);

      // Refresh inventory
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to add apartments. Some room numbers may already exist.');
    }
  };

  const handleSaveMeter = async (e) => {
    e.preventDefault();
    if (!editingMeterApt || !editingMeterNumber.trim()) return;
    setUpdatingMeter(true);
    setUnitError('');
    setUnitSuccess('');
    try {
      await API.put(`/owners/apartments/${editingMeterApt.apartmentId}/meter`, {
        meterNumber: editingMeterNumber.trim()
      });
      setUnitSuccess(`✓ Meter for Unit ${editingMeterApt.roomNumber} updated to "${editingMeterNumber.trim()}".`);
      setEditingMeterApt(null);
      // Refresh inventory
      const res = await API.get(`/owners/buildings/${selectedBuilding.buildingId}/apartments`);
      setInventory(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update meter.');
    } finally {
      setUpdatingMeter(false);
    }
  };

  if (loading) return <LoadingSpinner text="Fetching buildings..." />;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Building & Unit Inventory</h2>
          <p className="text-muted small mb-0">Manage residential properties, configure floor plans, and track flat occupancy</p>
        </div>
        <button className="btn btn-dark fw-bold" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1.5"></i> Add New Building
        </button>
      </div>

      <div className="row g-4">
        {buildings.map(b => (
          <div className="col-md-6 col-lg-4" key={b.buildingId}>
            <div className="card glass-card border shadow-sm h-100 p-3 bg-white rounded-4">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="rounded-3 bg-light border p-2.5 text-dark fs-4">
                    <i className="bi bi-building"></i>
                  </div>
                  <span className="badge bg-secondary-subtle text-dark border fw-bold">{b.buildingNumber}</span>
                </div>
                <h4 className="fw-bold text-dark mb-1">{b.buildingName}</h4>
                <p className="text-muted small mb-3"><i className="bi bi-geo-alt me-1"></i> {b.location}</p>
                
                <div className="border-top pt-3 mb-3 d-flex justify-content-between text-muted fs-7">
                  <span>Planned Flats: <strong className="text-dark">{b.totalFlats}</strong></span>
                  <span>Registered: <strong className="text-dark">{b.createdAt ? b.createdAt.substring(0, 10) : 'N/A'}</strong></span>
                </div>

                <div className="mt-auto pt-2 d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-dark flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
                    onClick={() => openInventoryModal(b)}
                  >
                    <i className="bi bi-grid-3x3-gap-fill text-primary"></i>
                    <span>Inventory & Floors</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger fw-semibold px-3 py-2"
                    title="Delete building from property portfolio"
                    disabled={actionLoadingId === `del-bldg-${b.buildingId}`}
                    onClick={() => handleDeleteBuilding(b.buildingId, b.buildingName)}
                  >
                    {actionLoadingId === `del-bldg-${b.buildingId}` ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <span><i className="bi bi-trash me-1"></i>Delete</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Add Building */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Register New Building</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBuilding}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-dark">Building Name *</label>
                    <input type="text" className="form-control" placeholder="Emerald Heights" value={formData.buildingName} onChange={e => setFormData({...formData, buildingName: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-dark">Building Number/Code *</label>
                    <input type="text" className="form-control" placeholder="BLDG-02" value={formData.buildingNumber} onChange={e => setFormData({...formData, buildingNumber: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-dark">Total Planned Flats *</label>
                    <input type="number" className="form-control" value={formData.totalFlats} onChange={e => setFormData({...formData, totalFlats: parseInt(e.target.value)})} required min={1} />
                    <small className="text-muted d-block mt-1 fs-8">
                      Units are automatically created with 5 rooms per floor (e.g., 101–105 on Floor 1, 201–205 on Floor 2, 301–305 on Floor 3, etc.).
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-dark">Location Address *</label>
                    <input type="text" className="form-control" placeholder="742 Ocean View Blvd" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark px-4 fw-bold">Create Building</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Apartment Inventory & Floor Management */}
      {selectedBuilding && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-2">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="modal-title fw-bold text-dark">{selectedBuilding.buildingName}</h4>
                    <span className="badge bg-secondary-subtle text-dark border">{selectedBuilding.buildingNumber}</span>
                  </div>
                  <p className="text-muted fs-8 mb-0"><i className="bi bi-geo-alt me-1"></i> {selectedBuilding.location}</p>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedBuilding(null)}></button>
              </div>

              <div className="modal-body pt-0">
                {loadingInventory ? (
                  <div className="py-5 text-center">
                    <div className="spinner-border text-dark mb-2" role="status"></div>
                    <div className="fs-7 text-muted">Loading apartment units...</div>
                  </div>
                ) : (
                  <div>
                    {/* Inventory Overview Stats Bar */}
                    <div className="row g-3 mb-4 mt-1">
                      <div className="col-md-3">
                        <div className="card p-3 border rounded-3 bg-light">
                          <small className="text-muted fw-semibold fs-8 text-uppercase">Configured Units</small>
                          <h3 className="fw-bold text-dark mb-0">{inventory?.configuredUnitsCount || 0}</h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card p-3 border rounded-3" style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }}>
                          <small className="text-success fw-semibold fs-8 text-uppercase">Vacant Units</small>
                          <h3 className="fw-bold text-success mb-0">{inventory?.vacantCount || 0}</h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card p-3 border rounded-3" style={{ backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }}>
                          <small className="text-primary fw-semibold fs-8 text-uppercase">Occupied Units</small>
                          <h3 className="fw-bold text-primary mb-0">{inventory?.occupiedCount || 0}</h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card p-3 border rounded-3" style={{ backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }}>
                          <small className="text-warning-emphasis fw-semibold fs-8 text-uppercase">Pending Approvals / Invites</small>
                          <h3 className="fw-bold text-warning-emphasis mb-0">{inventory?.pendingCount || inventory?.pendingInvitationCount || 0}</h3>
                        </div>
                      </div>
                    </div>

                    {/* Notification Messages */}
                    {unitSuccess && (
                      <div className="alert alert-success py-2 px-3 small rounded-3 mb-3 d-flex align-items-center justify-content-between">
                        <span>{unitSuccess}</span>
                        <button type="button" className="btn-close btn-close-sm" onClick={() => setUnitSuccess('')}></button>
                      </div>
                    )}
                    {unitError && (
                      <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center justify-content-between">
                        <span>{unitError}</span>
                        <button type="button" className="btn-close btn-close-sm" onClick={() => setUnitError('')}></button>
                      </div>
                    )}

                    {/* Action Header: Add Units & Auto-Populate */}
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2 flex-wrap gap-2">
                      <div>
                        <h6 className="fw-bold text-dark mb-0">Floor-wise Apartment Layout</h6>
                        <small className="text-muted fs-8">Review unit occupancy, accept resident requests, or manage unit inventory</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {(inventory?.configuredUnitsCount || 0) < (selectedBuilding?.totalFlats || 0) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary fw-bold"
                            onClick={handleAutoGenerateUnits}
                            disabled={generatingUnits}
                          >
                            <i className="bi bi-magic me-1"></i>
                            {generatingUnits ? 'Generating...' : `Auto-Populate All ${selectedBuilding.totalFlats} Planned Units`}
                          </button>
                        )}
                        <button
                          type="button"
                          className={`btn btn-sm ${showAddUnitsForm ? 'btn-outline-secondary' : 'btn-dark'} fw-bold`}
                          onClick={() => setShowAddUnitsForm(!showAddUnitsForm)}
                        >
                          <i className={`bi ${showAddUnitsForm ? 'bi-x-lg' : 'bi-plus-lg'} me-1`}></i>
                          {showAddUnitsForm ? 'Cancel Adding' : 'Add Units to Floor'}
                        </button>
                      </div>
                    </div>

                    {/* Filter Pills for Room Status */}
                    <div className="d-flex align-items-center gap-1.5 mb-3 flex-wrap">
                      <span className="fs-8 fw-semibold text-muted me-1">View Rooms:</span>
                      {[
                        { id: 'ALL', label: 'All Units', count: inventory?.configuredUnitsCount || 0 },
                        { id: 'VACANT', label: 'Vacant (Available)', count: inventory?.vacantCount || 0 },
                        { id: 'OCCUPIED', label: 'Occupied', count: inventory?.occupiedCount || 0 },
                        { id: 'PENDING', label: 'Pending Approval / Invites', count: inventory?.pendingCount || inventory?.pendingInvitationCount || 0 }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          className={`btn btn-xs rounded-pill px-3 py-1 fw-semibold ${roomFilter === f.id ? 'btn-dark text-white' : 'btn-outline-secondary bg-white'}`}
                          onClick={() => setRoomFilter(f.id)}
                        >
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>

                    {/* Expandable Add Units Form */}
                    {showAddUnitsForm && (
                      <div className="card p-3 border rounded-3 mb-4 bg-light shadow-sm">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="fw-bold text-dark mb-0">
                            <i className="bi bi-plus-circle me-1.5 text-primary"></i>
                            Configure Floor Units & Water Meters
                          </h6>
                          <span className="badge bg-white text-muted border fs-9">Batch Setup</span>
                        </div>
                        <p className="text-muted fs-8 mb-3">
                          Each room will automatically receive a unique numeric <strong>Meter ID (#)</strong> for CSV billing uploads, along with a customizable <strong>Meter Number / Serial</strong>.
                        </p>
                        <form onSubmit={handleAddUnits}>
                          <div className="row g-3">
                            <div className="col-md-2">
                              <label className="form-label fs-8 fw-semibold text-dark">Floor Number *</label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={unitFormData.floorNumber}
                                onChange={e => setUnitFormData({...unitFormData, floorNumber: e.target.value})}
                                min={0}
                                required
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label fs-8 fw-semibold text-dark">Unit Type</label>
                              <select
                                className="form-select form-select-sm"
                                value={unitFormData.unitType}
                                onChange={e => setUnitFormData({...unitFormData, unitType: e.target.value})}
                              >
                                <option value="1BHK">1 BHK</option>
                                <option value="2BHK">2 BHK</option>
                                <option value="3BHK">3 BHK</option>
                                <option value="4BHK">4 BHK</option>
                                <option value="Studio">Studio</option>
                                <option value="Penthouse">Penthouse</option>
                              </select>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label fs-8 fw-semibold text-dark">Meter Prefix / Format</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={`WM-${selectedBuilding?.buildingNumber || 'BLDG'}-`}
                                value={unitFormData.meterPrefix}
                                onChange={e => setUnitFormData({...unitFormData, meterPrefix: e.target.value})}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fs-8 fw-semibold text-dark">
                                Room Numbers (Comma separated) *
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. 101, 102, 103, 104, 105 (5 rooms per floor)"
                                value={unitFormData.roomNumbers}
                                onChange={e => setUnitFormData({...unitFormData, roomNumbers: e.target.value})}
                                required
                              />
                            </div>

                            {/* Live Room-to-Meter Mapping Preview */}
                            {unitFormData.roomNumbers.trim().length > 0 && (
                              <div className="col-12 mt-1">
                                <div className="p-2.5 rounded-3 bg-white border">
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fs-8 fw-bold text-dark">
                                      <i className="bi bi-speedometer2 me-1 text-primary"></i>
                                      Meter ID & Number Assignment Preview
                                    </span>
                                    <small className="text-muted fs-9">Customize meter serial numbers below if needed</small>
                                  </div>
                                  <div className="row g-2">
                                    {unitFormData.roomNumbers.split(',').map(s => s.trim()).filter(Boolean).map(r => {
                                      const defaultMNum = `${unitFormData.meterPrefix || `WM-${selectedBuilding.buildingNumber}-`}${r}`;
                                      const currentVal = unitFormData.customMeters?.[r] ?? defaultMNum;
                                      return (
                                        <div className="col-sm-6 col-md-4 col-lg-3" key={r}>
                                          <div className="p-2 border rounded-2 bg-light d-flex flex-column gap-1">
                                            <div className="d-flex align-items-center justify-content-between">
                                              <strong className="fs-8 text-dark">Unit {r}</strong>
                                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-9">
                                                Meter ID: Auto (#)
                                              </span>
                                            </div>
                                            <div className="input-group input-group-sm">
                                              <span className="input-group-text px-1.5 fs-9 text-muted"><i className="bi bi-hash"></i></span>
                                              <input
                                                type="text"
                                                className="form-control form-control-sm fs-8 py-0.5"
                                                value={currentVal}
                                                onChange={ev => {
                                                  const val = ev.target.value;
                                                  setUnitFormData(prev => ({
                                                    ...prev,
                                                    customMeters: {
                                                      ...prev.customMeters,
                                                      [r]: val
                                                    }
                                                  }));
                                                }}
                                                placeholder={defaultMNum}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="col-12 d-flex justify-content-end gap-2 pt-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border px-3"
                                onClick={() => setShowAddUnitsForm(false)}
                              >
                                Cancel
                              </button>
                              <button type="submit" className="btn btn-sm btn-dark px-4 fw-bold">
                                Save Units & Water Meters
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Floor Groups */}
                    {(!inventory?.floors || inventory.floors.length === 0) ? (
                      <div className="text-center py-5 bg-light rounded-4 border">
                        <i className="bi bi-door-closed text-muted display-4 d-block mb-2"></i>
                        <h6 className="fw-bold text-dark">No Apartments Configured Yet</h6>
                        <p className="text-muted fs-8 mb-3">Click "Add Units to Floor" or "Auto-Populate" above to configure your building inventory.</p>
                      </div>
                    ) : (
                      <div className="space-y-4" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: '4px' }}>
                        {inventory.floors.map(floor => {
                          const visibleApartments = floor.apartments.filter(apt => {
                            if (roomFilter === 'ALL') return true;
                            if (roomFilter === 'VACANT') return apt.occupancyStatus === 'VACANT';
                            if (roomFilter === 'OCCUPIED') return apt.occupancyStatus === 'OCCUPIED';
                            if (roomFilter === 'PENDING') return apt.occupancyStatus?.startsWith('PENDING');
                            return true;
                          });

                          if (visibleApartments.length === 0 && roomFilter !== 'ALL') return null;

                          return (
                            <div key={floor.floorNumber} className="border rounded-4 p-3 mb-3 bg-white">
                              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-dark text-white fs-7 px-2.5 py-1">
                                    Floor {floor.floorNumber}
                                  </span>
                                  <span className="text-muted fs-8">({floor.apartments?.length || 0} Units)</span>
                                </div>
                              </div>

                              <div className="row g-2">
                                {visibleApartments.map(apt => {
                                  const isVacant = apt.occupancyStatus === 'VACANT';
                                  const isOccupied = apt.occupancyStatus === 'OCCUPIED';
                                  const isPendingApproval = apt.occupancyStatus === 'PENDING_APPROVAL';
                                  const isPendingInvite = apt.occupancyStatus === 'PENDING_INVITATION';

                                  return (
                                    <div className="col-sm-6 col-md-4 col-lg-3" key={apt.apartmentId}>
                                      <div
                                        className="p-2.5 border rounded-3 h-100 shadow-none transition-all d-flex flex-column justify-content-between"
                                        style={{
                                          backgroundColor: isVacant ? '#F8FCFD' : isOccupied ? '#F0F9FF' : '#FFFBEB',
                                          borderColor: isVacant ? '#D1EBF8' : isOccupied ? '#BAE6FD' : '#FDE68A'
                                        }}
                                      >
                                        <div>
                                          <div className="d-flex align-items-center justify-content-between mb-1">
                                            <strong className="text-dark fs-7">Unit {apt.roomNumber}</strong>
                                            <span className={`badge fs-9 ${
                                              isVacant ? 'bg-success text-white' :
                                              isOccupied ? 'bg-primary text-white' : 'bg-warning text-dark border border-warning'
                                            }`}>
                                              {isPendingApproval ? 'PENDING APPROVAL' : isPendingInvite ? 'PENDING INVITE' : apt.occupancyStatus}
                                            </span>
                                          </div>

                                          <div className="fs-8 text-muted mb-1">
                                            Type: <span className="fw-semibold text-dark">{apt.unitType || 'Flat'}</span>
                                          </div>

                                          {/* Meter ID & Number Fixture Card */}
                                          <div className="d-flex align-items-center justify-content-between p-1.5 rounded-2 bg-white border border-light-subtle my-1.5 shadow-2xs">
                                            <div className="d-flex align-items-center gap-1.5 text-truncate">
                                              <div className="rounded-circle bg-primary-subtle p-1 d-flex align-items-center justify-content-center text-primary" style={{ width: 22, height: 22, fontSize: '0.75rem' }}>
                                                <i className="bi bi-speedometer2"></i>
                                              </div>
                                              <div className="text-truncate">
                                                <div className="d-flex align-items-center gap-1">
                                                  <span className="badge bg-primary text-white fw-bold px-1.5 py-0.5 fs-9" title="Meter ID used in Bulk Billing CSV">
                                                    ID: #{apt.meterId || 'N/A'}
                                                  </span>
                                                  <code className="text-dark fw-bold fs-9 text-truncate" title="Assigned Meter Number">
                                                    {apt.meterNumber || 'Unassigned'}
                                                  </code>
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              className="btn btn-outline-secondary btn-xs py-0.5 px-1.5 border-0 text-muted"
                                              title="Configure or edit water meter for this unit"
                                              onClick={() => {
                                                setEditingMeterApt(apt);
                                                setEditingMeterNumber(apt.meterNumber || `WM-${selectedBuilding.buildingNumber}-${apt.roomNumber}`);
                                              }}
                                            >
                                              <i className="bi bi-pencil-square"></i>
                                            </button>
                                          </div>

                                          {isOccupied && apt.currentResidentName && (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-light p-1.5 text-start border w-100 d-flex align-items-center justify-content-between text-truncate mt-1.5 rounded-2 shadow-xs"
                                              style={{
                                                backgroundColor: '#EFF6FF',
                                                borderColor: '#BFDBFE',
                                                cursor: 'pointer'
                                              }}
                                              onClick={() => setResidentInfoModal({
                                                ...apt,
                                                buildingName: selectedBuilding?.buildingName,
                                                buildingNumber: selectedBuilding?.buildingNumber,
                                                location: selectedBuilding?.location
                                              })}
                                              title="Click to view resident details and profile"
                                            >
                                              <div className="d-flex align-items-center gap-1.5 text-truncate">
                                                <i className="bi bi-person-fill text-primary fs-7"></i>
                                                <strong className="text-primary fs-8 text-decoration-underline text-truncate">{apt.currentResidentName}</strong>
                                              </div>
                                              <span className="badge bg-white text-primary border border-primary-subtle fs-9 px-1.5 py-0.5">
                                                <i className="bi bi-info-circle me-1"></i>Details
                                              </span>
                                            </button>
                                          )}

                                          {(isPendingApproval || isPendingInvite) && apt.currentResidentName && (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-light p-1.5 text-start border w-100 d-flex align-items-center justify-content-between text-truncate mt-1.5 rounded-2 shadow-xs"
                                              style={{
                                                backgroundColor: '#FFFBEB',
                                                borderColor: '#FDE68A',
                                                cursor: 'pointer'
                                              }}
                                              onClick={() => setResidentInfoModal({
                                                ...apt,
                                                buildingName: selectedBuilding?.buildingName,
                                                buildingNumber: selectedBuilding?.buildingNumber,
                                                location: selectedBuilding?.location
                                              })}
                                              title="Click to view applicant information"
                                            >
                                              <div className="d-flex align-items-center gap-1.5 text-truncate">
                                                <i className="bi bi-hourglass-split text-warning-emphasis fs-7"></i>
                                                <span className="fs-8 text-dark text-truncate">Applicant: <strong className="text-decoration-underline">{apt.currentResidentName}</strong></span>
                                              </div>
                                              <span className="badge bg-white text-warning-emphasis border border-warning-subtle fs-9 px-1.5 py-0.5">
                                                <i className="bi bi-info-circle me-1"></i>Details
                                              </span>
                                            </button>
                                          )}

                                          {isVacant && (
                                            <div className="fs-8 text-success border-top pt-1">
                                              <i className="bi bi-check2 me-1"></i> Vacant (Available)
                                            </div>
                                          )}
                                        </div>

                                        {/* Dynamic Action Buttons for Building Owner */}
                                        <div className="mt-2">
                                          {isPendingApproval && (
                                            <div className="d-flex gap-1.5 pt-2 border-top">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-success fw-bold py-1 px-2 flex-grow-1"
                                                title="Accept and approve this resident"
                                                disabled={actionLoadingId === `accept-${apt.pendingRequestId}`}
                                                onClick={() => handleAcceptRequest(apt.pendingRequestId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-check-lg me-1"></i> Accept
                                              </button>
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger fw-semibold py-1 px-2 flex-grow-1"
                                                title="Reject occupancy request"
                                                disabled={actionLoadingId === `reject-${apt.pendingRequestId}`}
                                                onClick={() => handleRejectRequest(apt.pendingRequestId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-x-lg me-1"></i> Reject
                                              </button>
                                            </div>
                                          )}

                                          {isPendingInvite && (
                                            <div className="pt-2 border-top">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger fw-semibold w-100 py-1"
                                                title="Cancel pending invitation"
                                                disabled={actionLoadingId === `cancel-inv-${apt.pendingInvitationId}`}
                                                onClick={() => handleCancelInvitation(apt.pendingInvitationId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-x-circle me-1"></i> Cancel Invite
                                              </button>
                                            </div>
                                          )}

                                          {isOccupied && (
                                            <div className="pt-2 border-top d-flex gap-1.5">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger fw-semibold flex-grow-1 py-1"
                                                title="Remove resident from unit and vacate"
                                                disabled={actionLoadingId === `vacate-${apt.apartmentId}`}
                                                onClick={() => handleVacateApartment(apt.apartmentId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-person-x me-1"></i> Remove Resident
                                              </button>
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary py-1 px-2 border"
                                                title="Delete unit and remove completely from database"
                                                disabled={actionLoadingId === `delete-${apt.apartmentId}`}
                                                onClick={() => handleDeleteApartment(apt.apartmentId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-trash text-danger"></i>
                                              </button>
                                            </div>
                                          )}

                                          {isVacant && (
                                            <div className="d-flex justify-content-end align-items-center pt-2 border-top">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger py-0.5 px-2 border-0"
                                                title="Delete vacant unit from inventory"
                                                disabled={actionLoadingId === `delete-${apt.apartmentId}`}
                                                onClick={() => handleDeleteApartment(apt.apartmentId, apt.roomNumber)}
                                              >
                                                <i className="bi bi-trash fs-8 me-1"></i> Delete Unit
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" onClick={() => setSelectedBuilding(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Resident Information Pop-up */}
      {residentInfoModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060, backdropFilter: 'blur(3px)' }}
          onClick={() => setResidentInfoModal(null)}
        >
          <div 
            className="modal-dialog modal-dialog-centered" 
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Header with vibrant profile styling */}
              <div 
                className="p-4 text-white position-relative"
                style={{
                  background: residentInfoModal.occupancyStatus === 'OCCUPIED'
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                    : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                }}
              >
                <button 
                  type="button" 
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
                  onClick={() => setResidentInfoModal(null)}
                ></button>

                <div className="d-flex align-items-center gap-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold fs-3 shadow"
                    style={{
                      width: 62,
                      height: 62,
                      backgroundColor: '#ffffff',
                      border: '3px solid rgba(255,255,255,0.5)'
                    }}
                  >
                    {residentInfoModal.currentResidentName ? residentInfoModal.currentResidentName.charAt(0).toUpperCase() : 'R'}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h4 className="fw-bold mb-0 text-white">{residentInfoModal.currentResidentName}</h4>
                      <span className="badge bg-white text-dark fw-semibold fs-9 px-2 py-0.5 rounded-pill">
                        {residentInfoModal.occupancyStatus === 'OCCUPIED' ? 'Active Resident' : 'Applicant'}
                      </span>
                    </div>
                    <p className="mb-0 text-white-50 fs-7">
                      <i className="bi bi-geo-alt me-1"></i>
                      {residentInfoModal.buildingName || 'Building'} • Unit {residentInfoModal.roomNumber} (Floor {residentInfoModal.floorNumber})
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body with categorized detail cards */}
              <div className="modal-body p-4 bg-light">
                {/* Card 1: Contact Information */}
                <div className="bg-white p-3 rounded-3 border mb-3 shadow-sm">
                  <h6 className="fw-bold text-dark fs-8 text-uppercase tracking-wider text-muted mb-2.5">
                    <i className="bi bi-person-lines-fill me-1.5 text-primary"></i>
                    Resident Contact Details
                  </h6>
                  <div className="row g-2">
                    <div className="col-12 d-flex align-items-center justify-content-between p-2 rounded-2 bg-light">
                      <span className="fs-8 text-muted"><i className="bi bi-envelope me-1.5"></i>Email:</span>
                      <strong className="fs-8 text-dark text-break">{residentInfoModal.currentResidentEmail || 'Not provided'}</strong>
                    </div>
                    <div className="col-12 d-flex align-items-center justify-content-between p-2 rounded-2 bg-light">
                      <span className="fs-8 text-muted"><i className="bi bi-telephone me-1.5"></i>Phone:</span>
                      <strong className="fs-8 text-dark">{residentInfoModal.currentResidentPhone || 'Not provided'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Tenancy & Flat Allocation */}
                <div className="bg-white p-3 rounded-3 border mb-3 shadow-sm">
                  <h6 className="fw-bold text-dark fs-8 text-uppercase tracking-wider text-muted mb-2.5">
                    <i className="bi bi-building me-1.5 text-primary"></i>
                    Apartment & Occupancy Information
                  </h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="p-2.5 rounded-2 bg-light h-100">
                        <div className="fs-9 text-muted mb-0.5">Assigned Flat</div>
                        <div className="fs-7 fw-bold text-dark">Unit {residentInfoModal.roomNumber} ({residentInfoModal.unitType || 'Flat'})</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-2.5 rounded-2 bg-light h-100">
                        <div className="fs-9 text-muted mb-0.5">Floor Level</div>
                        <div className="fs-7 fw-bold text-dark">Floor {residentInfoModal.floorNumber}</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="p-2.5 rounded-2 bg-light d-flex justify-content-between align-items-center">
                        <span className="fs-8 text-muted"><i className="bi bi-calendar-check me-1.5"></i>Occupied Since:</span>
                        <span className="fs-8 fw-semibold text-dark">
                          {residentInfoModal.occupiedSince 
                            ? new Date(residentInfoModal.occupiedSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Active Occupant'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Water Meter Telemetry */}
                <div className="bg-white p-3 rounded-3 border shadow-sm">
                  <h6 className="fw-bold text-dark fs-8 text-uppercase tracking-wider text-muted mb-2.5">
                    <i className="bi bi-droplet-half me-1.5 text-primary"></i>
                    Smart Water Meter Fixture
                  </h6>
                  <div className="p-2.5 rounded-2 bg-light d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="d-flex align-items-center gap-1.5 mb-1">
                        <span className="badge bg-primary text-white fs-8 px-2 py-0.5" title="Meter ID used in CSV bulk billing uploads">
                          Meter ID: #{residentInfoModal.meterId || 'Auto'}
                        </span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-9">
                          <i className="bi bi-broadcast me-1"></i>Active Telemetry
                        </span>
                      </div>
                      <div className="fs-9 text-muted">Meter Hardware Serial / Number</div>
                      <code className="fs-7 fw-bold text-primary">{residentInfoModal.meterNumber || 'Pending Configuration'}</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-between">
                {residentInfoModal.occupancyStatus === 'OCCUPIED' ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm fw-semibold"
                    onClick={() => {
                      const aptId = residentInfoModal.apartmentId;
                      const roomNum = residentInfoModal.roomNumber;
                      setResidentInfoModal(null);
                      handleVacateApartment(aptId, roomNum);
                    }}
                  >
                    <i className="bi bi-person-x me-1"></i> Remove Resident
                  </button>
                ) : (
                  <div></div>
                )}

                <button 
                  type="button" 
                  className="btn btn-dark btn-sm px-4 fw-semibold" 
                  onClick={() => setResidentInfoModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Meter ID & Number */}
      {editingMeterApt && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                    <i className="bi bi-speedometer2 fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark">Configure Unit Meter</h5>
                    <p className="text-muted fs-8 mb-0">Unit {editingMeterApt.roomNumber} • {selectedBuilding?.buildingName}</p>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setEditingMeterApt(null)}></button>
              </div>
              <form onSubmit={handleSaveMeter}>
                <div className="modal-body">
                  <div className="p-3 rounded-3 bg-light border mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="fs-8 fw-semibold text-muted">Database Meter ID:</span>
                      <span className="badge bg-primary text-white fs-7 px-2 py-1">
                        #{editingMeterApt.meterId || 'Auto'}
                      </span>
                    </div>
                    <small className="text-muted fs-9 d-block">
                      <i className="bi bi-info-circle me-1"></i>
                      Use this Meter ID <strong>(#{editingMeterApt.meterId})</strong> in your CSV reading upload file.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-dark">Meter Number / Hardware Serial *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingMeterNumber}
                      onChange={e => setEditingMeterNumber(e.target.value)}
                      placeholder={`WM-${selectedBuilding?.buildingNumber}-${editingMeterApt.roomNumber}`}
                      required
                    />
                    <small className="text-muted fs-9">
                      This is the readable serial code printed on the physical water meter.
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setEditingMeterApt(null)}>Cancel</button>
                  <button type="submit" className="btn btn-dark px-4 fw-bold" disabled={updatingMeter}>
                    {updatingMeter ? 'Saving...' : 'Save Meter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
