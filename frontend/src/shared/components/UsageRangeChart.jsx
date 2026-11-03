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
 * Custom Tooltip for UsageRangeChart - Multi-Quantile Regression Display
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isFirstMonth = Boolean(data.isFirstMonth || data.status === 'INSUFFICIENT_HISTORY');
  const actual = data.actual != null ? Number(data.actual).toFixed(2) : 'N/A';
  const min = data.expectedMin != null ? Number(data.expectedMin).toFixed(2) : 'N/A';
  const median = data.expectedMedian != null ? Number(data.expectedMedian).toFixed(2) : 'N/A';
  const max = data.expectedMax != null ? Number(data.expectedMax).toFixed(2) : 'N/A';
  const status = data.status || 'NORMAL';
  const pattern = data.pattern || 'NORMAL';
  const risk = data.riskScore != null ? Math.round(data.riskScore) : null;
  const isExceeded = data.actual != null && data.expectedMax != null && data.actual > data.expectedMax;

  return (
    <div className="card shadow-lg border-0 p-3 rounded-3" style={{ backgroundColor: '#ffffff', minWidth: 240, fontSize: '0.85rem' }}>
      <div className="fw-bold text-dark border-bottom pb-1 mb-2 d-flex justify-content-between align-items-center">
        <span>{label}</span>
        {isFirstMonth ? (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
            Cycle 1 Baseline
          </span>
        ) : risk != null ? (
          <span className={`badge ${risk >= 70 ? 'bg-danger' : risk >= 40 ? 'bg-warning text-dark' : 'bg-success'}`}>
            Risk: {risk}%
          </span>
        ) : null}
      </div>

      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-droplet-fill text-primary me-1"></i> Actual Usage:</span>
        <strong className={isExceeded && !isFirstMonth ? 'text-danger' : 'text-dark'}>{actual} kL</strong>
      </div>

      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-dash-lg text-secondary me-1"></i> Lower Limit (q10):</span>
        <span className="text-secondary">{min} kL</span>
      </div>

      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-dot text-primary me-1"></i> Expected Normal (q50):</span>
        <strong className="text-primary">{median} kL</strong>
      </div>

      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted"><i className="bi bi-dash-lg text-danger me-1"></i> Upper Limit (q95):</span>
        <span className="text-danger">{max} kL</span>
      </div>

      <div className="mt-2 pt-1 border-top d-flex justify-content-between align-items-center fs-8 text-muted">
        <span>Predicted Pattern:</span>
        <span className={`badge ${pattern === 'NORMAL' ? 'bg-light text-dark border' : 'bg-danger-subtle text-danger'}`}>
          {pattern}
        </span>
      </div>
    </div>
  );
};

/**
 * UsageRangeChart
 * Renders monthly water consumption plotted against LightGBM 3-quantile regression boundaries (q10, q50, q95).
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

  const isFirstMonth = data.some(d => d.isFirstMonth) || data.length <= 1;

  const chartData = data.map((item, idx) => {
    const label = item.label || `${item.month || ''}/${item.year || ''}` || `Cycle ${idx + 1}`;
    const actual = Number(item.actual || item.unitsConsumed || 0);
    const expectedMin = item.expectedMin != null ? Number(item.expectedMin) : null;
    const expectedMax = item.expectedMax != null ? Number(item.expectedMax) : null;
    const expectedMedian = item.expectedMedian != null
      ? Number(item.expectedMedian)
      : (expectedMin != null && expectedMax != null ? Math.round(((expectedMin + expectedMax) / 2.0) * 10) / 10 : null);
    
    // For shaded band: delta between max and min
    const rangeDelta = (expectedMax != null && expectedMin != null && expectedMax >= expectedMin)
      ? Math.max(0, expectedMax - expectedMin)
      : null;

    return {
      ...item,
      label,
      actual,
      expectedMin,
      expectedMedian,
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
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94D2BD" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#94D2BD" stopOpacity={0.12} />
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

          {/* Shaded Expected Corridor between q10 and q95 */}
          <Area
            type="monotone"
            dataKey="rangeMin"
            stackId="corridor"
            stroke="none"
            fill="none"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="rangeDelta"
            stackId="corridor"
            name={isFirstMonth ? "Baseline Normal Corridor" : "Quantile Normal Corridor (q10 – q95)"}
            stroke="none"
            fill="url(#bandGradient)"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />

          {/* Upper Bound Line (q95) */}
          <Line
            type="monotone"
            dataKey="expectedMax"
            name={isFirstMonth ? "Baseline Max (Upper Benchmark)" : "Upper Bound (q95 Limit)"}
            stroke="#E76F51"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: '#E76F51', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />

          {/* Expected Median Normal Line (q50) */}
          <Line
            type="monotone"
            dataKey="expectedMedian"
            name={isFirstMonth ? "Baseline Median (Expected Normal)" : "Expected Normal (q50 Median)"}
            stroke="#0A9396"
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={{ r: 3.5, fill: '#0A9396', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 5 }}
            connectNulls={true}
          />

          {/* Lower Bound Line (q10) */}
          <Line
            type="monotone"
            dataKey="expectedMin"
            name={isFirstMonth ? "Baseline Min (Lower Benchmark)" : "Lower Bound (q10 Limit)"}
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
                  r={isLeak ? 6 : 4.5}
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
