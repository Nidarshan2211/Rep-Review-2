import React, { useState, useEffect } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function BulkBillingPage() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [readiness, setReadiness] = useState(null);

  const [loading, setLoading] = useState(true);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [validating, setValidating] = useState(false);
  const [downloadingErrors, setDownloadingErrors] = useState(false);

  // File Upload & Preview State
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  // Bulk Generation State (Phase 3)
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Fetch Owner's Buildings on mount
  useEffect(() => {
    API.get('/owners/buildings')
      .then(res => {
        const bList = res.data || [];
        setBuildings(bList);
        if (bList.length > 0) {
          setSelectedBuildingId(String(bList[0].buildingId));
        }
      })
      .catch(err => {
        console.error('Failed to load buildings', err);
        setErrorBanner('Could not load buildings for current owner.');
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Fetch cycles when selected building changes
  useEffect(() => {
    if (!selectedBuildingId) return;

    API.get(`/owner/billing-cycles?buildingId=${selectedBuildingId}`)
      .then(res => {
        const cList = res.data || [];
        setCycles(cList);
        if (cList.length > 0) {
          setSelectedCycleId(String(cList[0].id));
        } else {
          setSelectedCycleId('');
          setReadiness(null);
        }
      })
      .catch(() => {
        setCycles([]);
        setSelectedCycleId('');
        setReadiness(null);
      });
  }, [selectedBuildingId]);

  // 3. Fetch readiness metrics when cycle changes
  useEffect(() => {
    setValidationResult(null);
    setSelectedFile(null);
    setErrorBanner('');

    if (!selectedBuildingId || !selectedCycleId) {
      setReadiness(null);
      return;
    }

    API.get(`/bulk-billing/readiness?buildingId=${selectedBuildingId}&billingCycleId=${selectedCycleId}`)
      .then(res => setReadiness(res.data))
      .catch(err => console.error('Failed to fetch readiness info:', err));
  }, [selectedBuildingId, selectedCycleId]);

  // Handle Template Download
  const handleDownloadTemplate = async () => {
    if (!selectedBuildingId || !selectedCycleId) {
      alert('Please select both a building and an active billing cycle first.');
      return;
    }

    setDownloadingTemplate(true);
    try {
      const response = await API.get(
        `/bulk-billing/template?buildingId=${selectedBuildingId}&billingCycleId=${selectedCycleId}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const bObj = buildings.find(b => String(b.buildingId) === String(selectedBuildingId));
      const bName = bObj ? bObj.buildingName.replace(/[^a-zA-Z0-9]/g, '_') : 'Building';
      link.setAttribute('download', `Meter_Readings_Template_${bName}_Cycle_${selectedCycleId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download CSV template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Handle File Input Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a valid CSV file (.csv).');
        return;
      }
      setSelectedFile(file);
      setValidationResult(null); // Clear previous preview on new file
      setErrorBanner('');
    }
  };

  // Handle Upload & Validate CSV
  const handleValidateCsv = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a CSV file to upload.');
      return;
    }
    if (!selectedBuildingId || !selectedCycleId) {
      alert('Please select a building and billing cycle.');
      return;
    }

    setValidating(true);
    setErrorBanner('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('buildingId', selectedBuildingId);
    formData.append('billingCycleId', selectedCycleId);

    try {
      const res = await API.post('/bulk-billing/validate', formData);
      setValidationResult(res.data);
    } catch (err) {
      console.error(err);
      let msg = err.response?.data?.message || err.response?.data?.error;
      if (!msg && typeof err.response?.data === 'string' && err.response.data.trim()) {
        msg = err.response.data;
      }
      if (!msg) {
        msg = err.message || 'Failed to validate uploaded CSV file. Please verify file format.';
      }
      setErrorBanner(msg);
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  // Handle Download Error Report CSV
  const handleDownloadErrorReport = async () => {
    if (!validationResult) return;

    setDownloadingErrors(true);
    try {
      const response = await API.post('/bulk-billing/error-report', validationResult, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Meter_Readings_Errors_Cycle_${selectedCycleId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download error report.');
    } finally {
      setDownloadingErrors(false);
    }
  };

  // Handle Finalize & Generate Bills (Phase 3)
  const handleGenerateBills = async () => {
    if (!selectedFile || !selectedBuildingId || !selectedCycleId) {
      alert('Please select a building, an open billing cycle, and a validated CSV file.');
      return;
    }

    setGenerating(true);
    setShowConfirmModal(false);
    setErrorBanner('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('buildingId', selectedBuildingId);
    formData.append('billingCycleId', selectedCycleId);

    try {
      const response = await API.post(
        `/bulk-billing/generate?buildingId=${selectedBuildingId}&billingCycleId=${selectedCycleId}`,
        formData
      );

      setGenerationResult(response.data);
      setValidationResult(null);
      setSelectedFile(null);
      setShowConfirmModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Refresh readiness metrics to update cycle status in UI
      API.get(`/bulk-billing/readiness?buildingId=${selectedBuildingId}&billingCycleId=${selectedCycleId}`)
        .then(res => setReadiness(res.data))
        .catch(err => console.error('Failed to refresh readiness:', err));

      // Refresh cycles list to show FINALIZED status
      API.get(`/owner/billing-cycles?buildingId=${selectedBuildingId}`)
        .then(res => setCycles(res.data || []))
        .catch(err => console.error(err));

    } catch (err) {
      console.error(err);
      let msg = err.response?.data?.message || err.response?.data?.error;
      if (!msg && typeof err.response?.data === 'string' && err.response.data.trim()) {
        msg = err.response.data;
      }
      if (!msg) {
        msg = err.message || 'Bulk bill generation failed. Please review error details.';
      }
      setErrorBanner(msg);
      alert('Bulk Generation Error: ' + msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setGenerationResult(null);
    setErrorBanner('');
  };

  if (loading) return <LoadingSpinner text="Loading Bulk Billing Import Studio..." />;

  const selectedBuilding = buildings.find(b => String(b.buildingId) === String(selectedBuildingId));
  const selectedCycle = cycles.find(c => String(c.id) === String(selectedCycleId));
  const isCycleOpen = selectedCycle && selectedCycle.status === 'OPEN';

  return (
    <div className="container-fluid py-4">
      {/* Header Banner */}
      <div className="card glass-card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1.5 fw-semibold fs-7 rounded-pill">
                <i className="bi bi-file-earmark-spreadsheet me-1"></i> Bulk Operations
              </span>
              <span className="badge bg-success bg-opacity-10 text-success px-3 py-1.5 fw-semibold fs-7 rounded-pill">
                Phase 3 Generation Engine
              </span>
            </div>
            <h2 className="fw-bold mb-1 mt-2 text-dark">Bulk Meter Reading Import & Bill Generation</h2>
            <p className="text-muted small mb-0">
              Upload meter readings via CSV, run server-side verification, and generate individual resident bills in bulk.
            </p>
          </div>
        </div>
      </div>

      {/* Finalized Cycle Banner for already finalized cycle */}
      {selectedCycle?.status === 'FINALIZED' && !generationResult && (
        <div className="card border-0 shadow-sm p-4 mb-4 bg-white rounded-4 border-start border-success border-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                <i className="bi bi-check-lg fs-4"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="fw-bold text-dark mb-0">Billing Cycle #{selectedCycle.id} is Finalized</h4>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2.5 py-1 fs-8 fw-semibold rounded-pill">
                    COMPLETED &amp; LOCKED
                  </span>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  Bills and invoices for period <strong>{selectedCycle.startDate} to {selectedCycle.endDate}</strong> have been finalized and issued to residents.
                </p>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <a href="/owner/invoices" className="btn btn-success px-4 py-2 fw-semibold shadow-sm">
                <i className="bi bi-receipt me-1"></i> View Generated Invoices
              </a>
              <a href="/owner/billing" className="btn btn-outline-primary px-3.5 py-2 fw-semibold">
                <i className="bi bi-file-earmark-text me-1"></i> Monthly Bills
              </a>
            </div>
          </div>

          {readiness && (
            <div className="row g-3 mt-1">
              <div className="col-sm-6 col-lg-3">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="text-muted small text-uppercase fw-semibold">Residents Billed</div>
                  <div className="fs-3 fw-bold text-dark">{readiness.eligibleResidentsCount}</div>
                  <small className="text-success fw-semibold"><i className="bi bi-check-circle-fill me-1"></i>100% Coverage</small>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="text-muted small text-uppercase fw-semibold">Meter Readings</div>
                  <div className="fs-3 fw-bold text-primary">{readiness.recordedReadingsCount}</div>
                  <small className="text-muted">Logged in database</small>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="text-muted small text-uppercase fw-semibold">Invoices Created</div>
                  <div className="fs-3 fw-bold text-success">{readiness.existingBillsCount}</div>
                  <small className="text-muted">Issued to tenants</small>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="text-muted small text-uppercase fw-semibold">Cycle Status</div>
                  <div className="fs-3 fw-bold text-secondary">FINALIZED</div>
                  <small className="text-danger fw-semibold"><i className="bi bi-lock-fill me-1"></i>Locked Against Drift</small>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {generationResult && (
        <div className="card border-0 shadow-sm p-4 mb-4 bg-success bg-opacity-10 rounded-4 border-start border-success border-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                <i className="bi bi-check-lg fs-4"></i>
              </div>
              <div>
                <h4 className="fw-bold text-success mb-0">Billing Cycle Finalized & Bills Generated!</h4>
                <p className="text-muted small mb-0">{generationResult.message}</p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-success px-3.5 py-2 fw-semibold" onClick={handleResetImport}>
                <i className="bi bi-arrow-repeat me-1"></i> Import Another Cycle
              </button>
              <a href="/owner/invoices" className="btn btn-success px-4 py-2 fw-semibold shadow-sm">
                <i className="bi bi-receipt me-1"></i> View Generated Invoices
              </a>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-6 col-lg-3">
              <div className="bg-white p-3 rounded-3 border">
                <div className="text-muted small text-uppercase fw-semibold">Bills Generated</div>
                <div className="fs-3 fw-bold text-dark">{generationResult.billsGeneratedCount}</div>
                <small className="text-success fw-semibold"><i className="bi bi-check-circle me-1"></i>100% Coverage</small>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="bg-white p-3 rounded-3 border">
                <div className="text-muted small text-uppercase fw-semibold">Total Units Billed</div>
                <div className="fs-3 fw-bold text-primary">{generationResult.totalUnitsBilled?.toFixed(2)} <span className="fs-6 text-muted">kL</span></div>
                <small className="text-muted">Calculated from meters</small>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="bg-white p-3 rounded-3 border">
                <div className="text-muted small text-uppercase fw-semibold">Total Revenue</div>
                <div className="fs-3 fw-bold text-success">₹{generationResult.totalAmountBilled?.toFixed(2)}</div>
                <small className="text-muted">3-Tier Progressive Rates</small>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="bg-white p-3 rounded-3 border">
                <div className="text-muted small text-uppercase fw-semibold">Cycle Status</div>
                <div className="fs-3 fw-bold text-dark">{generationResult.cycleStatus}</div>
                <small className="text-danger fw-semibold"><i className="bi bi-lock-fill me-1"></i>Locked Against Drift</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="alert alert-danger alert-dismissible fade show border-0 shadow-sm rounded-3 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Error: </strong> {errorBanner}
          <button type="button" className="btn-close" onClick={() => setErrorBanner('')}></button>
        </div>
      )}

      {/* Scope Controls: Building & Billing Cycle */}
      <div className="card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <h5 className="fw-bold text-dark mb-3">
          <i className="bi bi-sliders me-2 text-primary"></i>1. Select Building & Billing Period
        </h5>
        <div className="row g-3">
          <div className="col-md-6 col-lg-4">
            <label className="form-label fw-semibold text-secondary small">Target Building</label>
            <select
              className="form-select border-2 py-2"
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setValidationResult(null);
                setSelectedFile(null);
              }}
            >
              {buildings.map(b => (
                <option key={b.buildingId} value={b.buildingId}>
                  {b.buildingName} ({b.buildingNumber}) — {b.totalFlats} Flats
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 col-lg-5">
            <label className="form-label fw-semibold text-secondary small">Billing Period (Cycle)</label>
            <select
              className="form-select border-2 py-2"
              value={selectedCycleId}
              onChange={(e) => {
                setSelectedCycleId(e.target.value);
                setValidationResult(null);
                setSelectedFile(null);
                setGenerationResult(null);
                setErrorBanner('');
              }}
              disabled={cycles.length === 0}
            >
              {cycles.length === 0 ? (
                <option value="">No billing cycles found for this building</option>
              ) : (
                cycles.map(c => (
                  <option key={c.id} value={c.id}>
                    Cycle #{c.id}: {c.startDate} to {c.endDate} [{c.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="col-lg-3 d-flex align-items-end">
            <div className="w-100 p-2.5 rounded-3 bg-light border text-center">
              <small className="text-muted d-block fs-8 fw-semibold text-uppercase">Cycle Status</small>
              <span className={`badge ${selectedCycle?.status === 'OPEN' ? 'bg-success' : selectedCycle?.status === 'FINALIZED' ? 'bg-secondary' : 'bg-warning'} px-3 py-1.5 mt-1`}>
                {selectedCycle?.status || 'NO CYCLE'}
              </span>
            </div>
          </div>

          <div className="col-12 text-end pt-1">
            <a href="/owner/billing?tab=purchases" className="text-decoration-none small fw-semibold text-primary">
              <i className="bi bi-truck me-1"></i> Manage Bulk Water Purchases for Dynamic Tariffs →
            </a>
          </div>
        </div>

        {/* Readiness Info Strip */}
        {readiness && (
          <div className="row g-3 mt-2 pt-3 border-top">
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-light rounded-3 text-center">
                <div className="text-muted fs-8 fw-semibold text-uppercase">Eligible Residents</div>
                <div className="fs-4 fw-bold text-dark mt-1">{readiness.eligibleResidentsCount}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-light rounded-3 text-center">
                <div className="text-muted fs-8 fw-semibold text-uppercase">Logged In DB</div>
                <div className="fs-4 fw-bold text-primary mt-1">{readiness.recordedReadingsCount}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-light rounded-3 text-center">
                <div className="text-muted fs-8 fw-semibold text-uppercase">Pending Readings</div>
                <div className="fs-4 fw-bold text-warning mt-1">{readiness.missingReadingsCount}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-light rounded-3 text-center">
                <div className="text-muted fs-8 fw-semibold text-uppercase">Existing Bills</div>
                <div className="fs-4 fw-bold text-secondary mt-1">{readiness.existingBillsCount}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Action Cards */}
      <div className="row g-4 mb-4">
        {/* Step 2: Download Template Card */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm p-4 h-100 bg-white rounded-4">
            <h5 className="fw-bold text-dark mb-2">
              <i className="bi bi-download me-2 text-success"></i>2. Download CSV Template
            </h5>
            <p className="text-muted small mb-3">
              Download the official pre-populated CSV template for <strong>{selectedBuilding?.buildingName}</strong>.
              All active residents and meter numbers are included, with historical previous readings auto-populated from database history.
            </p>

            <div className="p-3 bg-light rounded-3 mb-4 border">
              <div className="small fw-semibold text-secondary mb-1">
                <i className="bi bi-table me-1.5 text-primary"></i> Template Columns:
              </div>
              <code className="text-dark small d-block">
                resident_id, apartment_number, resident_name, meter_id, meter_number, previous_reading, current_reading
              </code>
              <small className="text-muted mt-2 d-block fs-8">
                * Simply enter values into the <code>current_reading</code> column and save the file. <code>meter_id</code> and <code>meter_number</code> are pre-populated and match the <strong>Meter ID (#)</strong> on each unit card in <strong>Building &amp; Unit Inventory</strong>.
              </small>
            </div>

            <button
              className="btn btn-outline-success py-2.5 fw-semibold mt-auto d-flex align-items-center justify-content-center gap-2"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate || !isCycleOpen}
            >
              {downloadingTemplate ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span> Generating Template...
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-arrow-down-fill fs-5"></i> Download Pre-Filled CSV Template
                </>
              )}
            </button>
            {!isCycleOpen && (
              <small className="text-danger mt-2 d-block text-center fs-8">
                * Template download requires an OPEN billing cycle.
              </small>
            )}
          </div>
        </div>

        {/* Step 3: Upload & Validate CSV Card */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm p-4 h-100 bg-white rounded-4">
            <h5 className="fw-bold text-dark mb-2">
              <i className="bi bi-cloud-arrow-up me-2 text-primary"></i>3. Upload & Validate Meter Readings
            </h5>
            <p className="text-muted small mb-3">
              Upload the completed CSV file to run a server-side dry-run validation.
              Checks numeric validity, detects decreasing readings, and calculates estimated slab charges without modifying the database.
            </p>

            <form onSubmit={handleValidateCsv} className="d-flex flex-column h-100">
              <div className="border border-2 border-dashed p-4 rounded-3 text-center mb-3 bg-light">
                <i className="bi bi-filetype-csv fs-1 text-primary mb-2 d-block"></i>
                <label htmlFor="csvUploadInput" className="btn btn-sm btn-primary px-3 py-2 fw-semibold cursor-pointer">
                  <i className="bi bi-folder2-open me-1"></i> Choose CSV File
                </label>
                <input
                  id="csvUploadInput"
                  type="file"
                  accept=".csv,text/csv"
                  className="d-none"
                  onChange={handleFileChange}
                />
                <div className="mt-2 text-dark small fw-semibold">
                  {selectedFile ? (
                    <span className="text-success">
                      <i className="bi bi-check-circle-fill me-1"></i> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    <span className="text-muted">No file selected yet</span>
                  )}
                </div>
              </div>

              {!isCycleOpen ? (
                <div className="alert alert-secondary py-3 px-3 mt-auto mb-0 rounded-3 text-center">
                  <i className="bi bi-lock-fill fs-4 text-secondary d-block mb-1"></i>
                  <div className="fw-semibold text-dark small">Billing Cycle Finalized &amp; Locked</div>
                  <div className="text-muted fs-8">Bills and invoices have already been issued for this cycle. Switch to an OPEN cycle to upload new readings.</div>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-between mt-auto gap-3 flex-wrap">
                  <span className="badge bg-light text-muted border px-3 py-2 fs-8 fw-semibold">
                    <i className="bi bi-shield-check me-1 text-success"></i> Safe Dry-Run (No Bills Created)
                  </span>

                  <button
                    type="submit"
                    className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
                    disabled={validating || !selectedFile || !isCycleOpen}
                  >
                    {validating ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span> Validating Readings...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle fs-5"></i> Run Pre-Flight Validation
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Step 4: Validation Preview & Results Card */}
      {validationResult && isCycleOpen && (
        <div className="card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 border-bottom mb-4">
            <div>
              <span className={`badge ${validationResult.canFinalize ? 'bg-success' : 'bg-danger'} px-3 py-1.5 fw-semibold fs-7 rounded-pill`}>
                {validationResult.canFinalize ? 'Validation Passed' : 'Action Required / Errors Detected'}
              </span>
              <h4 className="fw-bold text-dark mt-2 mb-0">Pre-Flight Batch Reading Preview</h4>
              <small className="text-muted">{validationResult.statusMessage}</small>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              {validationResult.errorCount > 0 && (
                <button
                  className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold d-flex align-items-center gap-1.5"
                  onClick={handleDownloadErrorReport}
                  disabled={downloadingErrors}
                >
                  <i className="bi bi-file-earmark-x"></i> Download Error Report CSV
                </button>
              )}
              <button
                className="btn btn-outline-secondary btn-sm px-3 py-2 fw-semibold"
                onClick={() => {
                  setValidationResult(null);
                  setSelectedFile(null);
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reset / Re-Upload
              </button>
            </div>
          </div>

          {/* Validation Metrics Strip */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-light border-0 p-3 rounded-3 text-center">
                <small className="text-muted fw-semibold fs-8 text-uppercase">Total Rows in CSV</small>
                <h3 className="fw-bold mb-0 text-dark mt-1">{validationResult.totalRowsInCsv}</h3>
              </div>
            </div>
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-success bg-opacity-10 border-0 p-3 rounded-3 text-center">
                <small className="text-success fw-semibold fs-8 text-uppercase">Valid Readings</small>
                <h3 className="fw-bold mb-0 text-success mt-1">{validationResult.validCount}</h3>
              </div>
            </div>
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-danger bg-opacity-10 border-0 p-3 rounded-3 text-center">
                <small className="text-danger fw-semibold fs-8 text-uppercase">Error Rows</small>
                <h3 className="fw-bold mb-0 text-danger mt-1">{validationResult.errorCount}</h3>
              </div>
            </div>
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-secondary bg-opacity-10 border-0 p-3 rounded-3 text-center">
                <small className="text-secondary fw-semibold fs-8 text-uppercase">Already Billed</small>
                <h3 className="fw-bold mb-0 text-secondary mt-1">{validationResult.alreadyBilledCount}</h3>
              </div>
            </div>
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-primary bg-opacity-10 border-0 p-3 rounded-3 text-center">
                <small className="text-primary fw-semibold fs-8 text-uppercase">Estimated Units</small>
                <h3 className="fw-bold mb-0 text-primary mt-1">{validationResult.totalEstimatedUnits} kL</h3>
              </div>
            </div>
            <div className="col-sm-6 col-lg-2">
              <div className="card bg-info bg-opacity-10 border-0 p-3 rounded-3 text-center">
                <small className="text-info fw-semibold fs-8 text-uppercase">Estimated Total</small>
                <h3 className="fw-bold mb-0 text-info mt-1">₹{validationResult.totalEstimatedAmount.toFixed(2)}</h3>
              </div>
            </div>
          </div>

          {/* Missing Residents Warning Banner */}
          {validationResult.missingResidentsCount > 0 && (
            <div className="alert alert-warning border-0 shadow-sm rounded-3 p-3 mb-4" role="alert">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-exclamation-circle-fill text-warning fs-5"></i>
                <h6 className="fw-bold mb-0 text-dark">
                  Missing Residents in Uploaded CSV ({validationResult.missingResidentsCount} missing)
                </h6>
              </div>
              <p className="small text-muted mb-2">
                Under the system billing policy, all active residents in a building must have recorded meter readings before a cycle can be finalized.
                The following residents were not included in your CSV file:
              </p>
              <div className="d-flex flex-wrap gap-1.5">
                {validationResult.missingResidents.map((m, idx) => (
                  <span key={idx} className="badge bg-white text-dark border px-2.5 py-1.5 fs-8 fw-semibold">
                    <i className="bi bi-person-x-fill text-danger me-1"></i> {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Row Preview Table */}
          <div className="table-responsive rounded-3 border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-uppercase fs-8 text-secondary">
                <tr>
                  <th>Row</th>
                  <th>Flat / Apt</th>
                  <th>Resident Name</th>
                  <th>Meter Number</th>
                  <th>Prev Reading</th>
                  <th>Cur Reading</th>
                  <th>Units (kL)</th>
                  <th>Est. Charge</th>
                  <th>Status</th>
                  <th>Validation Notes</th>
                </tr>
              </thead>
              <tbody className="fs-7">
                {validationResult.rows.map((row, idx) => {
                  const isErr = row.status === 'INVALID' || row.status === 'DUPLICATE_ROW';
                  const isBilled = row.status === 'ALREADY_BILLED';
                  const isValid = row.status === 'VALID';

                  return (
                    <tr key={idx} className={isErr ? 'table-danger bg-opacity-25' : isBilled ? 'table-secondary bg-opacity-25' : ''}>
                      <td className="fw-semibold text-muted">{row.rowNumber}</td>
                      <td className="fw-bold text-dark">{row.apartmentNumber || 'N/A'}</td>
                      <td>{row.residentName || 'Unknown Resident'}</td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace fs-8">
                          {row.meterNumber || 'Unassigned'}
                        </span>
                      </td>
                      <td className="text-muted">{row.previousReading !== null ? row.previousReading.toFixed(2) : '-'}</td>
                      <td className="fw-semibold text-dark">{row.currentReading !== null ? row.currentReading.toFixed(2) : '-'}</td>
                      <td>
                        {row.unitsConsumed !== null ? (
                          <span className="fw-bold text-primary">{row.unitsConsumed.toFixed(2)} kL</span>
                        ) : '-'}
                      </td>
                      <td>
                        {row.estimatedCharge !== null ? (
                          <span className="fw-bold text-dark">₹{row.estimatedCharge.toFixed(2)}</span>
                        ) : '-'}
                      </td>
                      <td>
                        {isValid && <span className="badge bg-success px-2.5 py-1">VALID</span>}
                        {row.status === 'INVALID' && <span className="badge bg-danger px-2.5 py-1">ERROR</span>}
                        {row.status === 'DUPLICATE_ROW' && <span className="badge bg-warning text-dark px-2.5 py-1">DUPLICATE</span>}
                        {isBilled && <span className="badge bg-secondary px-2.5 py-1">BILLED</span>}
                      </td>
                      <td>
                        {row.errorMessage ? (
                          <span className="text-danger small fw-semibold">
                            <i className="bi bi-x-circle me-1"></i> {row.errorMessage}
                          </span>
                        ) : (
                          <span className="text-success small">
                            <i className="bi bi-check-circle me-1"></i> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phase 3 Finalization Action Bar */}
          <div className="p-3.5 mt-4 rounded-3 bg-light border d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="fw-bold text-dark mb-0.5">
                <i className={`bi ${validationResult.canFinalize ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} me-1.5`}></i>
                {validationResult.canFinalize ? 'All Residents Verified — Ready for Finalization' : 'Validation Incomplete'}
              </div>
              <small className="text-muted">
                {validationResult.canFinalize
                  ? `All ${validationResult.validCount} eligible residents verified. Finalizing will persist readings, apply tariffs, generate bills, and notify residents.`
                  : 'Please resolve errors or missing residents before bulk bill generation.'}
              </small>
            </div>

            <button
              className={`btn px-4 py-2.5 fw-semibold ${validationResult.canFinalize ? 'btn-success shadow-sm' : 'btn-secondary'}`}
              disabled={!validationResult.canFinalize || generating}
              onClick={() => setShowConfirmModal(true)}
              id="confirm-generate-bills-btn"
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing Generation...
                </>
              ) : (
                <>
                  <i className="bi bi-play-circle-fill me-1.5"></i> Finalize Cycle & Generate Bills
                </>
              )}
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                  <div className="modal-header bg-primary text-white border-0 py-3">
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-shield-check me-2"></i> Confirm Bulk Bill Generation
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowConfirmModal(false)}></button>
                  </div>
                  <div className="modal-body p-4">
                    <div className="alert alert-warning border-0 d-flex gap-3 align-items-start mb-3">
                      <i className="bi bi-exclamation-triangle-fill fs-4 text-warning flex-shrink-0"></i>
                      <div className="fs-7">
                        <strong>Important: This operation is final.</strong><br />
                        You are about to finalize <strong>Billing Cycle #{selectedCycleId}</strong> ({validationResult.cyclePeriod}) for building <strong>{validationResult.buildingName}</strong>.
                      </div>
                    </div>

                    <div className="bg-light p-3 rounded-3 border mb-3 fs-7">
                      <div className="fw-semibold text-secondary mb-2 text-uppercase fs-8">Batch Execution Summary</div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">Total Eligible Residents:</span>
                        <span className="fw-bold text-dark">{validationResult.validCount}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">Total Units to Bill:</span>
                        <span className="fw-bold text-primary">{validationResult.totalEstimatedUnits?.toFixed(2)} kL</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">Total Estimated Amount:</span>
                        <span className="fw-bold text-success">₹{validationResult.totalEstimatedAmount?.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <span className="text-muted">Post-Action Cycle Status:</span>
                        <span className="badge bg-secondary">FINALIZED (LOCKED)</span>
                      </div>
                    </div>

                    <p className="text-muted fs-8 mb-0">
                      By proceeding, meter readings will be logged to trusted history, bills and invoices will be created, and notifications will be dispatched to residents.
                    </p>
                  </div>
                  <div className="modal-footer border-0 bg-light px-4 py-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3.5 py-2 fw-semibold"
                      onClick={() => setShowConfirmModal(false)}
                      disabled={generating}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-success px-4 py-2 fw-semibold shadow-sm"
                      onClick={handleGenerateBills}
                      disabled={generating}
                      id="modal-confirm-submit-btn"
                    >
                      {generating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1"></i> Yes, Finalize & Generate Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
