import React, { useState, useEffect } from 'react';
import API from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import LeakStatusBadge, { formatFeedbackLabel } from '../../shared/components/LeakStatusBadge';
import RiskScoreBar from '../../shared/components/RiskScoreBar';
import UsageRangeChart from '../../shared/components/UsageRangeChart';
import HouseholdSizeModal from '../../shared/components/HouseholdSizeModal';
import AwayPeriodModal from '../../shared/components/AwayPeriodModal';
import LeakFeedbackModal from '../../shared/components/LeakFeedbackModal';

/**
 * ResidentLeakStatusPage
 * Dedicated dashboard for residents to view AI leak diagnostics,
 * expected vs actual usage bands, manage household size, and log away periods.
 */
export default function ResidentLeakStatusPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingHh, setConfirmingHh] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState('');

  // Modals
  const [showHhModal, setShowHhModal] = useState(false);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/resident/leak-status');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load resident leak status:', err);
      setError(err.response?.data?.message || 'Unable to fetch leak diagnostics at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConfirmHousehold = async () => {
    setConfirmingHh(true);
    setConfirmSuccess('');
    try {
      await API.post('/resident/household/confirm');
      setConfirmSuccess('✓ Household size confirmed! Your leak detection thresholds are now verified.');
      await fetchStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm household size.');
    } finally {
      setConfirmingHh(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Analyzing water consumption & leak risk..." />;
  }

  const status = data?.anomalyStatus || 'INSUFFICIENT_HISTORY';
  const hasFeedback = Boolean(data?.hasFeedback);
  const latestFeedback = data?.latestFeedback;
  const isLeak = (status === 'POTENTIAL_LEAK') && !hasFeedback;
  const units = data?.unitsConsumed != null ? Number(data.unitsConsumed).toFixed(2) : '0.00';
  const expMin = data?.expectedMin != null ? Number(data.expectedMin).toFixed(2) : '0.00';
  const expMax = data?.expectedMax != null ? Number(data.expectedMax).toFixed(2) : '0.00';
  const rawRisk = data?.anomalyScore;
  const riskScore = rawRisk != null
    ? (rawRisk > 0 && rawRisk <= 1.0 ? Math.round(rawRisk * 100) : Math.round(rawRisk))
    : 0;
  const confidence = data?.anomalyConfidence ? parseFloat(data.anomalyConfidence) : null;
  const extraCost = data?.estimatedExtraCost != null ? Number(data.estimatedExtraCost).toFixed(2) : null;
  const aptLabel = data?.apartmentNumber ? `Flat ${data.apartmentNumber}` : 'Your Flat';
  const isHhConfirmed = Boolean(data?.householdSizeConfirmed);

  // Format historical data for UsageRangeChart - sorted chronologically (past -> present)
  const defaultHh = data?.householdSize || 2;
  const fallbackMin = Math.round(defaultHh * 0.10 * 30 * 10) / 10;
  const fallbackMax = Math.round(defaultHh * 0.25 * 30 * 10) / 10;

  const chartData = (data?.recentHistory || []).map((h) => ({
    label: `${h.month}/${h.year}`,
    month: h.month,
    year: h.year,
    actual: h.unitsConsumed,
    expectedMin: h.expectedMin != null ? h.expectedMin : fallbackMin,
    expectedMax: h.expectedMax != null ? h.expectedMax : fallbackMax,
    status: h.anomalyStatus,
    riskScore: h.anomalyScore,
    hasFeedback: h.hasFeedback,
    latestFeedback: h.latestFeedback
  })).slice().sort((a, b) => (a.year - b.year) || (a.month - b.month));

  return (
    <div className="container-fluid py-4">
      {/* Modals */}
      <HouseholdSizeModal
        show={showHhModal}
        onClose={() => setShowHhModal(false)}
        onSaved={fetchStatus}
        currentSize={data?.householdSize || 2}
        apartmentLabel={aptLabel}
      />
      <AwayPeriodModal
        show={showAwayModal}
        onClose={() => setShowAwayModal(false)}
        onUpdated={fetchStatus}
      />
      <LeakFeedbackModal
        show={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmitted={fetchStatus}
        usageId={data?.usageId}
        incidentId={data?.incidentId}
        apartmentLabel={aptLabel}
        isOwner={false}
      />

      {/* Header Banner */}
      <div className="card glass-card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0 text-dark">Leak Diagnostics & Water Health</h2>
              <span className="badge bg-light text-dark border px-2.5 py-1 fw-semibold fs-7">
                {aptLabel}
              </span>
            </div>
            <p className="text-muted small mb-0">
              AI-driven water anomaly detection calibrated specifically to your tenancy and household size.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
              onClick={() => setShowAwayModal(true)}
            >
              <i className="bi bi-airplane me-1.5 text-primary"></i> Log Away Period
            </button>
            <button
              className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-semibold"
              onClick={() => setShowHhModal(true)}
            >
              <i className="bi bi-people me-1.5"></i> Household Details
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 p-3 shadow-sm mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
        </div>
      )}

      {/* Household Size Confirmation Alert Banner */}
      {!isHhConfirmed && (
        <div className="alert alert-warning border border-warning-subtle rounded-4 p-3 mb-4 shadow-xs d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 rounded-circle bg-warning text-white">
              <i className="bi bi-person-exclamation fs-5"></i>
            </div>
            <div>
              <strong className="text-dark">Please Confirm Your Household Details</strong>
              <div className="fs-7 text-muted">
                Your flat currently has an estimated size of <strong>{data?.householdSize || 2} members</strong>. Confirming or updating this ensures leak detection thresholds are accurate.
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-warning btn-sm fw-bold px-3 shadow-xs"
              onClick={handleConfirmHousehold}
              disabled={confirmingHh}
            >
              {confirmingHh ? 'Confirming...' : 'Confirm Household Size'}
            </button>
            <button
              className="btn btn-outline-dark btn-sm px-3 fw-semibold"
              onClick={() => setShowHhModal(true)}
            >
              Update
            </button>
          </div>
        </div>
      )}

      {confirmSuccess && (
        <div className="alert alert-success border border-success-subtle rounded-4 p-3 mb-4 shadow-xs">
          <i className="bi bi-check-circle-fill me-2"></i> {confirmSuccess}
        </div>
      )}

      {/* Main Status Hero Card */}
      <div className={`card border-0 shadow-sm p-4 mb-4 rounded-4 ${
        isLeak
          ? 'bg-danger-subtle border-start border-danger border-5'
          : hasFeedback
          ? 'bg-success-subtle border-start border-success border-5'
          : 'bg-white'
      }`}>
        <div className="row align-items-center g-4">
          <div className="col-lg-8">
            <div className="d-flex align-items-center gap-3 mb-3">
              <LeakStatusBadge
                status={status}
                confidence={confidence}
                hasFeedback={hasFeedback}
                feedbackLabel={latestFeedback}
                size="lg"
              />
              {data?.month && data?.year && (
                <span className="text-muted fs-7">
                  Current Billing Cycle: <strong>{data.month}/{data.year}</strong>
                </span>
              )}
            </div>

            {hasFeedback ? (
              <div>
                <h4 className="fw-bold text-success mb-2">
                  <i className="bi bi-shield-check me-2"></i>
                  Leak Alert Addressed & Feedback Logged
                </h4>
                <p className="text-dark fs-6 mb-2">
                  You submitted feedback for this cycle: <strong>{formatFeedbackLabel(latestFeedback)}</strong>
                  {data?.feedbackNote ? ` — "${data.feedbackNote}"` : ''}.
                  This cycle is no longer flagged as an active leak risk. Our machine learning engine has absorbed your input to prevent future false alarms.
                </p>
                <div className="d-flex align-items-center gap-2 flex-wrap pt-2">
                  <button
                    className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    <i className="bi bi-pencil-square me-1"></i> Update Feedback
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
                    onClick={() => setShowAwayModal(true)}
                  >
                    <i className="bi bi-airplane me-1"></i> Log Away Period
                  </button>
                </div>
              </div>
            ) : isLeak ? (
              <div>
                <h4 className="fw-bold text-danger mb-2">
                  <i className="bi bi-droplet-half me-2 animate-pulse"></i>
                  Potential Water Leak Detected in {aptLabel}
                </h4>
                <p className="text-dark fs-6 mb-2">
                  {data?.anomalyReason || 'Actual water consumption is significantly higher than machine-learned household expectations.'}
                </p>
                {data?.anomalyPattern && (
                  <div className="mb-3">
                    <span className="badge bg-danger text-white me-2">Pattern: {data.anomalyPattern}</span>
                    {extraCost && (
                      <span className="badge bg-white text-danger border border-danger-subtle">
                        Estimated Extra Cost: ₹{extraCost} <small className="text-muted">(Informational only)</small>
                      </span>
                    )}
                  </div>
                )}
                <div className="d-flex align-items-center gap-2 flex-wrap pt-2">
                  <button
                    className="btn btn-danger btn-sm rounded-pill px-3 fw-bold shadow-xs"
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    <i className="bi bi-chat-dots me-1"></i> Report Feedback / False Alarm
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold"
                    onClick={() => setShowAwayModal(true)}
                  >
                    <i className="bi bi-airplane me-1"></i> I Was Away During Cycle
                  </button>
                </div>
              </div>
            ) : status === 'NORMAL' ? (
              <div>
                <h4 className="fw-bold text-success mb-2">
                  <i className="bi bi-shield-check me-2"></i> Normal Water Consumption
                </h4>
                <p className="text-muted fs-6 mb-0">
                  {data?.anomalyReason || 'Your water consumption is safely within the predicted normal bounds for your household.'}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="fw-bold text-secondary mb-2">
                  <i className="bi bi-hourglass-split me-2"></i> Baseline Profile Building
                </h4>
                <p className="text-muted fs-6 mb-0">
                  {data?.anomalyReason || 'We are building your consumption profile. At least two consecutive billing cycles are needed to generate tight confidence intervals.'}
                </p>
              </div>
            )}
          </div>

          <div className="col-lg-4 border-start-lg ps-lg-4">
            <div className="p-3 bg-light rounded-3">
              {hasFeedback ? (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fs-8 text-muted text-uppercase fw-semibold">Investigation Status</span>
                    <span className="badge bg-success text-white">ACKNOWLEDGED</span>
                  </div>
                  <div className="fs-6 fw-bold text-dark mb-1">
                    <i className="bi bi-check2-circle text-success me-1.5"></i>
                    {formatFeedbackLabel(latestFeedback)}
                  </div>
                  <div className="fs-8 text-muted">
                    Resident feedback recorded. Active alert redness cleared.
                  </div>
                </div>
              ) : (
                <RiskScoreBar score={riskScore} showLabel={true} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-4 mb-4">
        {/* Actual Usage Card */}
        <div className="col-md-4">
          <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase text-muted fs-8 fw-semibold">Current Usage</span>
              <div className="p-2 rounded-circle bg-primary-subtle text-primary">
                <i className="bi bi-speedometer2 fs-5"></i>
              </div>
            </div>
            <h2 className={`fw-bold mb-1 ${isLeak ? 'text-danger' : 'text-dark'}`}>
              {units} <span className="fs-5 text-muted fw-normal">kL</span>
            </h2>
            <div className="fs-8 text-muted">
              Total volume consumed during current billing cycle.
            </div>
          </div>
        </div>

        {/* Expected Range Card */}
        <div className="col-md-4">
          <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase text-muted fs-8 fw-semibold">Predicted Normal Band</span>
              <div className="p-2 rounded-circle bg-info-subtle text-info">
                <i className="bi bi-graph-up fs-5"></i>
              </div>
            </div>
            <h2 className="fw-bold mb-1 text-dark">
              {expMin} – {expMax} <span className="fs-5 text-muted fw-normal">kL</span>
            </h2>
            <div className="fs-8 text-muted">
              Learned from past cycles, peer units, and household size.
            </div>
          </div>
        </div>

        {/* Household Details Card */}
        <div className="col-md-4">
          <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase text-muted fs-8 fw-semibold">Household Profile</span>
              <div className="p-2 rounded-circle bg-success-subtle text-success">
                <i className="bi bi-people-fill fs-5"></i>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-dark">
                {data?.householdSize || 2} <span className="fs-6 text-muted fw-normal">People</span>
              </h3>
              {isHhConfirmed ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle fs-8">
                  <i className="bi bi-check-circle me-1"></i> Verified
                </span>
              ) : (
                <span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-8">
                  Estimated
                </span>
              )}
            </div>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="fs-8 text-muted">Calibrated Per-Capita Baseline</span>
              <button
                className="btn btn-link btn-sm p-0 fs-8 text-primary fw-semibold"
                onClick={() => setShowHhModal(true)}
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Range Band Chart */}
      <div className="card glass-card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h5 className="fw-bold text-dark mb-1">
              <i className="bi bi-water text-primary me-2"></i>
              Consumption vs. Learned Expectation Band
            </h5>
            <p className="text-muted small mb-0">
              Track your actual water usage against the algorithmic range boundaries over consecutive billing cycles.
            </p>
          </div>
          {data?.usageId && (
            <button
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              onClick={() => setShowFeedbackModal(true)}
            >
              <i className={`bi ${hasFeedback ? 'bi-check2-circle text-success' : 'bi-chat-square-text'} me-1`}></i>
              {hasFeedback ? 'Update Feedback' : 'Provide Cycle Feedback'}
            </button>
          )}
        </div>
        <UsageRangeChart data={chartData} height={340} />
      </div>

      {/* Leak Troubleshooting Guide */}
      <div className="card glass-card border-0 shadow-sm p-4 bg-white rounded-4">
        <h5 className="fw-bold text-dark mb-3">
          <i className="bi bi-tools text-primary me-2"></i>
          Quick Water Leak Checklist for Residents
        </h5>
        <div className="row g-3 fs-7">
          <div className="col-md-6">
            <div className="p-3 rounded-3 bg-light border h-100">
              <strong className="text-dark d-block mb-1">
                <i className="bi bi-check2-circle text-primary me-1"></i> 1. The Toilet Flapper Test
              </strong>
              <p className="text-muted mb-0 fs-8">
                A leaking flapper is the #1 silent leak source, wasting 200+ liters a day. Put 2 drops of food coloring into the toilet tank. If color seeps into the bowl after 15 minutes without flushing, replace the rubber flapper.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-3 rounded-3 bg-light border h-100">
              <strong className="text-dark d-block mb-1">
                <i className="bi bi-check2-circle text-primary me-1"></i> 2. The 15-Minute Meter Spin Test
              </strong>
              <p className="text-muted mb-0 fs-8">
                Turn off all water fixtures, taps, and appliances in your flat. Check your water meter. If the low-flow indicator dial is still turning, there is an active pressurized leak in internal plumbing.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-3 rounded-3 bg-light border h-100">
              <strong className="text-dark d-block mb-1">
                <i className="bi bi-check2-circle text-primary me-1"></i> 3. Under-Sink Supply Lines
              </strong>
              <p className="text-muted mb-0 fs-8">
                Check flexible braided hoses connecting to kitchen and bathroom faucets. Feel under valves for moisture, white calcification scale, or damp cabinet boards.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-3 rounded-3 bg-light border h-100">
              <strong className="text-dark d-block mb-1">
                <i className="bi bi-check2-circle text-primary me-1"></i> 4. RO Purifier Reject Lines
              </strong>
              <p className="text-muted mb-0 fs-8">
                Verify that reverse osmosis (RO) drinking water units auto-shut off once their internal storage tank fills. Faulty auto-cut valves run water down the drain continuously 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
