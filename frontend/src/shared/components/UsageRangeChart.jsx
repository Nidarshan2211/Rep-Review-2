import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

/**
 * Custom Tooltip for UsageRangeChart
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const actual = data.actual != null ? Number(data.actual).toFixed(2) : 'N/A';
  const min = data.expectedMin != null ? Number(data.expectedMin).toFixed(2) : 'N/A';
  const max = data.expectedMax != null ? Number(data.expectedMax).toFixed(2) : 'N/A';
  const status = data.status || 'NORMAL';
  const risk = data.riskScore != null ? Math.round(data.riskScore) : null;
  const isExceeded = data.actual != null && data.expectedMax != null && data.actual > data.expectedMax;

  return (
    <div className="card shadow-lg border-0 p-3 rounded-3" style={{ backgroundColor: '#ffffff', minWidth: 220, fontSize: '0.85rem' }}>
      <div className="fw-bold text-dark border-bottom pb-1 mb-2 d-flex justify-content-between align-items-center">
        <span>{label}</span>
        {risk != null && (
          <span className={`badge ${risk >= 70 ? 'bg-danger' : risk >= 40 ? 'bg-warning text-dark' : 'bg-success'}`}>
            Risk: {risk}%
          </span>
        )}
      </div>
      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-droplet-fill text-primary me-1"></i> Actual Usage:</span>
        <strong className={isExceeded ? 'text-danger' : 'text-dark'}>{actual} kL</strong>
      </div>
      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-dash-lg text-secondary me-1"></i> Expected Min:</span>
        <span className="text-secondary">{min} kL</span>
      </div>
      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-dash-lg text-danger me-1"></i> Expected Max:</span>
        <span className="text-danger">{max} kL</span>
      </div>
      {status === 'POTENTIAL_LEAK' && !data.hasFeedback && (
        <div className="mt-2 p-1.5 rounded bg-danger-subtle text-danger small fw-semibold text-center">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> Potential Leak Detected
        </div>
      )}
      {data.hasFeedback && (
        <div className="mt-2 p-1.5 rounded bg-success-subtle text-success small fw-semibold text-center">
          <i className="bi bi-check-circle-fill me-1"></i> Feedback Logged ({data.latestFeedback || 'Acknowledged'})
        </div>
      )}
    </div>
  );
};

/**
 * UsageRangeChart
 * Renders monthly water consumption plotted against the machine-learned expected range band.
 */
export default function UsageRangeChart({ data = [], height = 320 }) {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center text-muted bg-light rounded-4" style={{ height: `${height}px` }}>
        <i className="bi bi-water display-4 opacity-50 mb-2"></i>
        <p className="mb-0 fw-semibold">No usage and range history available yet.</p>
        <small className="opacity-75">Historical data will populate as billing cycles are scored.</small>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item, idx) => {
    const label = item.label || `${item.month || ''}/${item.year || ''}` || `Cycle ${idx + 1}`;
    const actual = Number(item.actual || item.unitsConsumed || 0);
    const expectedMin = item.expectedMin != null ? Number(item.expectedMin) : null;
    const expectedMax = item.expectedMax != null ? Number(item.expectedMax) : null;
    
    // For shaded band: delta between max and min
    const rangeDelta = (expectedMax != null && expectedMin != null && expectedMax >= expectedMin)
      ? Math.max(0, expectedMax - expectedMin)
      : null;

    return {
      ...item,
      label,
      actual,
      expectedMin,
      expectedMax,
      rangeMin: expectedMin,
      rangeDelta
    };
  });

  return (
    <div className="w-100" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#005F73" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#005F73" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94D2BD" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#94D2BD" stopOpacity={0.15} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#486581', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          />
          <YAxis
            unit=" kL"
            tick={{ fill: '#486581', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '0.8rem', paddingBottom: '8px' }}
          />

          {/* Shaded Expected Normal Bandwidth Corridor */}
          <Area
            type="monotone"
            dataKey="rangeMin"
            stackId="bandwidth"
            stroke="none"
            fill="none"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="rangeDelta"
            stackId="bandwidth"
            name="Normal Bandwidth Corridor"
            stroke="none"
            fill="url(#bandGradient)"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />

          {/* Upper Bound Line */}
          <Line
            type="monotone"
            dataKey="expectedMax"
            name="Expected Max (Upper Limit)"
            stroke="#E76F51"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: '#E76F51', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />

          {/* Lower Bound Line */}
          <Line
            type="monotone"
            dataKey="expectedMin"
            name="Expected Min (Lower Limit)"
            stroke="#2A9D8F"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: '#2A9D8F', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />

          {/* Actual Consumption */}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual Water Usage (kL)"
            stroke="#005F73"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const isLeak = payload.status === 'POTENTIAL_LEAK';
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={isLeak ? 6 : 4}
                  fill={isLeak ? '#dc3545' : '#005F73'}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 7, stroke: '#005F73', strokeWidth: 2, fill: '#ffffff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
