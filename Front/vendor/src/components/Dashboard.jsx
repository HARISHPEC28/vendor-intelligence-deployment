import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const PROCUREMENT_ACTIVE_STATUSES = [
  "Pending",
  "Approved",
  "Ordered",
  "Delivered",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatCurrencyLakhs(value) {
  return `₹${(Number(value || 0) / 100000).toFixed(1)}L`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key) {
  if (!key) return "—";
  const parts = key.split("-").map(Number);
  return `${MONTHS[parts[1] - 1]} ${parts[0]}`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function riskClass(risk) {
  const value = String(risk || "").toLowerCase().split(" ")[0];
  if (value === "low") return "vi-risk-low";
  if (value === "medium") return "vi-risk-medium";
  return "vi-risk-high";
}

async function fetchJson(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || `Failed to load ${path}`);
  }

  return data;
}

function KpiCard({ icon, label, value, helper, tone = "blue" }) {
  return (
    <div className={`vi-kpi-card vi-kpi-${tone}`}>
      <div className="vi-kpi-icon">{icon}</div>
      <div className="vi-kpi-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {helper && <small>{helper}</small>}
      </div>
    </div>
  );
}

function DashboardSection({ title, subtitle, children, className = "" }) {
  return (
    <section className={`vi-dashboard-section ${className}`.trim()}>
      <div className="vi-dashboard-section-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ text = "No data available" }) {
  return <div className="vi-chart-empty">{text}</div>;
}

function BarChart({ items, valueFormatter = (value) => value, maxItems = 8 }) {
  const visibleItems = items.slice(-maxItems);
  const max = Math.max(...visibleItems.map((item) => Number(item.value) || 0), 1);

  if (!visibleItems.length) return <EmptyChart />;

  return (
    <div className="vi-bar-chart">
      {visibleItems.map((item) => {
        const height = (Number(item.value || 0) / max) * 100;
        return (
          <div className="vi-bar-group" key={item.label}>
            <span className="vi-bar-value">{valueFormatter(item.value)}</span>
            <div className="vi-bar-track">
              <div className="vi-bar-fill" style={{ height: `${Math.max(height, 2)}%` }} />
            </div>
            <span className="vi-bar-label">{item.shortLabel || item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function VendorPerformanceChart({ items }) {
  const series = [
    { key: "delivery", label: "Delivery", color: "#287df0" },
    { key: "quality", label: "Quality", color: "#20aa79" },
    { key: "communication", label: "Communication", color: "#f28b35" },
    { key: "compliance", label: "Compliance", color: "#7957d5" },
  ];
  const visibleItems = items.slice(0, 6);

  if (!visibleItems.length) return <EmptyChart text="No vendor performance data available" />;

  return (
    <div className="vi-vendor-performance-chart">
      <div className="vi-vendor-performance-groups">
        {visibleItems.map((vendor) => (
          <div className="vi-vendor-performance-group" key={vendor.id}>
            <div className="vi-vendor-performance-bars">
              {series.map((metric) => (
                <span
                  key={metric.key}
                  title={`${metric.label}: ${Math.round(Number(vendor[metric.key] || 0))}`}
                  style={{
                    height: `${Math.max(Math.min(Number(vendor[metric.key] || 0), 100), 2)}%`,
                    background: metric.color,
                  }}
                />
              ))}
            </div>
            <span className="vi-vendor-performance-label">{vendor.shortName}</span>
          </div>
        ))}
      </div>
      <div className="vi-vendor-performance-legend">
        {series.map((metric) => (
          <span key={metric.key}><i style={{ background: metric.color }} />{metric.label}</span>
        ))}
      </div>
    </div>
  );
}

function DualBarChart({ items }) {
  const visible = items.slice(-6);
  const max = Math.max(
    ...visible.flatMap((item) => [Number(item.cost) || 0, Number(item.orders) || 0]),
    1
  );

  if (!visible.length) return <EmptyChart />;

  return (
    <div className="vi-dual-chart">
      <div className="vi-axis-labels">
        <span>Cost</span>
        <span>POs</span>
      </div>
      <div className="vi-dual-chart-body">
        {visible.map((item) => (
          <div className="vi-dual-column" key={item.key}>
            <div className="vi-dual-bars">
              <div
                className="vi-dual-bar vi-dual-cost"
                style={{ height: `${Math.max((Number(item.cost || 0) / max) * 100, 3)}%` }}
                title={formatCurrency(item.cost)}
              />
              <div
                className="vi-dual-bar vi-dual-orders"
                style={{ height: `${Math.max((Number(item.orders || 0) / max) * 100, 3)}%` }}
                title={`${item.orders} POs`}
              />
            </div>
            <span>{item.shortLabel}</span>
          </div>
        ))}
      </div>
      <div className="vi-chart-legend">
        <span><i className="vi-dot vi-dot-blue" /> Procurement Cost</span>
        <span><i className="vi-dot vi-dot-orange" /> Number of POs</span>
      </div>
    </div>
  );
}

function DonutChart({ items, centerValue, centerLabel = "Total" }) {
  const safeItems = items.map((item) => ({
    ...item,
    value: Math.max(Number(item.value) || 0, 0),
  }));
  const total = safeItems.reduce((sum, item) => sum + item.value, 0);
  const segmentResult = safeItems
    .filter((item) => item.value > 0)
    .reduce(
      (result, item) => {
        const start = (result.cursor / Math.max(total, 1)) * 360;
        const nextCursor = result.cursor + item.value;
        const end = (nextCursor / Math.max(total, 1)) * 360;

        return {
          cursor: nextCursor,
          segments: [
            ...result.segments,
            `${item.color} ${start}deg ${end}deg`,
          ],
        };
      },
      { cursor: 0, segments: [] }
    );

  const segments = segmentResult.segments;

  return (
    <div className="vi-donut-layout">
      <div
        className="vi-donut"
        style={{
          background: segments.length
            ? `conic-gradient(${segments.join(", ")})`
            : "var(--vi-donut-empty, #dbe4ee)",
        }}
      >
        <div className="vi-donut-hole">
          <strong>{centerValue ?? total.toLocaleString("en-IN")}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="vi-donut-legend">
        {safeItems.map((item) => (
          <div className="vi-donut-row" key={item.label}>
            <span className="vi-legend-dot" style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString("en-IN")}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ value, label = "On-Time" }) {
  const safe = clamp(value);
  return (
    <div className="vi-progress-ring-wrap">
      <div
        className="vi-progress-ring"
        style={{
          background: `conic-gradient(#13b58b ${safe * 3.6}deg, var(--vi-ring-bg, #d9e2eb) 0deg)`,
        }}
      >
        <div className="vi-progress-ring-inner">
          <strong>{Math.round(safe)}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ items }) {
  if (!items.length) return <EmptyChart text="No monthly trend data available" />;

  const width = 640;
  const height = 250;
  const padding = { left: 34, right: 20, top: 24, bottom: 38 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = items.map((item) => Number(item.value) || 0);
  const max = Math.max(...values, 100);

  const points = items.map((item, index) => ({
    ...item,
    x: padding.left + (index / Math.max(items.length - 1, 1)) * plotWidth,
    y: padding.top + plotHeight - (Number(item.value || 0) / max) * plotHeight,
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const area = `${line} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`;

  return (
    <div className="vi-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reliability trend">
        {[0, 1, 2, 3, 4].map((step) => {
          const y = padding.top + (step / 4) * plotHeight;
          return (
            <line
              key={step}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="vi-grid-line"
            />
          );
        })}
        <path d={area} className="vi-line-area" />
        <path d={line} className="vi-line-path" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" className="vi-line-point" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" className="vi-line-value">
              {Math.round(point.value)}
            </text>
            <text x={point.x} y={height - 12} textAnchor="middle" className="vi-line-label">
              {point.shortLabel || point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RadarChart({ values }) {
  const labels = [
    ["Delivery", values.delivery_score],
    ["Quality", values.quality_score],
    ["Communication", values.communication_score],
    ["Compliance", values.compliance_score],
    ["Purchase", values.purchase_history_score],
    ["Issue Resolution", values.issue_resolution_score],
  ];

  const cx = 160;
  const cy = 145;
  const radius = 92;
  const count = labels.length;

  const pointFor = (index, value) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const r = radius * (clamp(value) / 100);
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  const fullPointFor = (index, scale) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const r = radius * scale;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  const polygon = labels.map(([, value], index) => pointFor(index, value).join(",")).join(" ");
  const average = labels.reduce((sum, [, value]) => sum + Number(value || 0), 0) / count;

  return (
    <div className="vi-radar-layout">
      <svg className="vi-radar" viewBox="0 0 320 290">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={labels.map((_, index) => fullPointFor(index, scale).join(",")).join(" ")}
            className="vi-radar-grid"
          />
        ))}
        {labels.map(([label], index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
          const x2 = cx + Math.cos(angle) * radius;
          const y2 = cy + Math.sin(angle) * radius;
          const tx = cx + Math.cos(angle) * (radius + 20);
          const ty = cy + Math.sin(angle) * (radius + 20);
          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} className="vi-radar-axis" />
              <text x={tx} y={ty} textAnchor="middle" className="vi-radar-label">{label}</text>
            </g>
          );
        })}
        <polygon points={polygon} className="vi-radar-shape" />
        {labels.map(([, value], index) => {
          const [x, y] = pointFor(index, value);
          return <circle key={index} cx={x} cy={y} r="3.5" className="vi-radar-point" />;
        })}
        <text x={cx} y={cy + 6} textAnchor="middle" className="vi-radar-center">{Math.round(average)}</text>
      </svg>
      <div className="vi-radar-values">
        {labels.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{Math.round(Number(value || 0))}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcurementDashboard({ data, analyticsView = false }) {
  const activePOs = data.purchaseOrders.filter((po) => PROCUREMENT_ACTIVE_STATUSES.includes(po.status));
  const deliveredOrders = data.purchaseOrders.filter((po) => ["Delivered", "Completed"].includes(po.status));
  const cancelledOrders = data.purchaseOrders.filter((po) => po.status === "Cancelled");

  const statusItems = [
    { label: "Pending", value: data.statusCounts.Pending || 0, color: "#2684ff" },
    { label: "Approved", value: data.statusCounts.Approved || 0, color: "#7b55d9" },
    { label: "Ordered", value: data.statusCounts.Ordered || 0, color: "#1ab3bd" },
    { label: "Delivered", value: data.statusCounts.Delivered || 0, color: "#11b78f" },
    { label: "Completed", value: data.statusCounts.Completed || 0, color: "#f39c39" },
    { label: "Cancelled", value: data.statusCounts.Cancelled || 0, color: "#ef5350" },
  ];

  const categoryItems = data.categoryCosts.map((item, index) => ({
    label: item.label,
    value: item.value,
    color: ["#2c83f2", "#ef5350", "#16b28b", "#7b55d9", "#f39c39", "#f0b934"][index % 6],
  }));

  const deliveryRows = [
    { label: "Delivered", value: deliveredOrders.length },
    { label: "In Progress", value: activePOs.length },
    { label: "Delayed", value: data.delayedOrders.length },
    { label: "Cancelled", value: cancelledOrders.length },
  ];

  return (
    <div className="vi-dashboard vi-role-procurement">
      <div className="vi-role-banner procurement">
        <div className="vi-role-banner-title">
          <span className="vi-role-icon">🛒</span>
          <div>
            <h1>{analyticsView ? "Analytics Dashboard" : "Procurement Dashboard"}</h1>
            <p>{analyticsView
              ? "Procurement overview, active purchase orders, vendor performance, cost analysis and delivery status."
              : "Track procurement activities, costs, vendors and delivery performance in real time."}</p>
          </div>
        </div>
        <div className="vi-live-pill">● Live database data</div>
      </div>

      <div className="vi-kpi-grid">
        <KpiCard icon="📋" label="Total Purchase Orders" value={data.purchaseOrders.length} helper="All stored purchase orders" tone="blue" />
        <KpiCard icon="💰" label="Total Procurement Cost" value={formatCurrency(data.totalProcurementCost)} helper="PO total amount" tone="pink" />
        <KpiCard icon="👥" label="Active Vendors" value={data.activeVendors} helper="Approved vendors" tone="green" />
        <KpiCard icon="📦" label="Items Procured" value={data.itemsProcured} helper="From procurement requests" tone="purple" />
      </div>

      <div className="vi-dashboard-grid procurement-grid">
        <DashboardSection title="Procurement Overview" subtitle="Monthly procurement cost and purchase order volume" className="span-2">
          <DualBarChart items={data.monthlyProcurement} />
        </DashboardSection>

        <DashboardSection title="Active Purchase Orders" subtitle="Current procurement workflow status">
          <DonutChart items={statusItems} centerLabel="Orders" />
        </DashboardSection>

        <DashboardSection title="Vendor Performance Summary" subtitle="Average system-calculated reliability factors">
          {data.averageReliability ? <RadarChart values={data.averageReliability} /> : <EmptyChart text="No reliability data available" />}
        </DashboardSection>

        <DashboardSection title="Procurement Cost Analysis" subtitle="Spend by vendor category">
          <DonutChart items={categoryItems.length ? categoryItems : [{ label: "No spend", value: 0, color: "#d6dee8" }]} centerValue={formatCurrencyLakhs(data.totalProcurementCost)} centerLabel="Total Cost" />
        </DashboardSection>

        <DashboardSection title="Delivery Status" subtitle="Actual delivery compared with expected delivery">
          <div className="vi-delivery-layout">
            <ProgressRing value={data.onTimeDeliveryRate ?? 0} />
            <div className="vi-delivery-list">
              {deliveryRows.map((item) => (
                <div className="vi-delivery-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}

export function VendorDashboard({ data, platform = false }) {
  const reliability = data.reliability;
  const latestPerformance = data.latestPerformance;
  const performanceScore = latestPerformance?.quality_score ?? (latestPerformance?.rating != null ? Number(latestPerformance.rating) * 20 : reliability?.reliability_score ?? 0);

  const trend = data.vendorTrend;
  const contractItems = [
    { label: "Active", value: data.activeContracts, color: "#18b68d" },
    { label: "Renewal Pending", value: data.vendorRenewalContracts, color: "#f4a43b" },
    { label: "Expired", value: data.vendorExpiredContracts, color: "#ef5350" },
  ];

  return (
    <div className="vi-dashboard vi-role-vendor">
      <div className="vi-role-banner vendor">
        <div className="vi-role-banner-title">
          <span className="vi-role-icon">👥</span>
          <div>
            <h1>Vendor Dashboard</h1>
            <p>Monitor vendor performance, reliability, contracts and communication.</p>
          </div>
        </div>
        <div className="vi-vendor-pill">{data.vendor?.company_name || "Vendor"}</div>
      </div>

      <div className="vi-kpi-grid">
        <KpiCard icon="★" label="Performance Score" value={`${Math.round(performanceScore)}%`} helper="Latest stored evaluation" tone="green" />
        <KpiCard icon="🛡" label="Reliability Score" value={reliability ? reliability.reliability_score : "—"} helper={reliability?.risk_level ? `${reliability.risk_level} risk` : "No score"} tone="blue" />
        <KpiCard icon="📄" label="Active Contracts" value={data.vendorActiveContracts} helper={`of ${data.contracts.length} total`} tone="orange" />
        <KpiCard icon="🛒" label="Total Orders" value={data.purchaseOrders.length} helper="Purchase history" tone="purple" />
      </div>

      <div className="vi-dashboard-grid vendor-grid">
        <DashboardSection title="Vendor Performance" subtitle={platform ? "Performance indicators by vendor" : "Latest reliability factors"}>
          {platform ? (
            <VendorPerformanceChart items={data.vendorScores || []} />
          ) : reliability ? (
            <div className="vi-factor-list">
              {[
                ["Delivery", reliability.delivery_score],
                ["Quality", reliability.quality_score],
                ["Communication", reliability.communication_score],
                ["Compliance", reliability.compliance_score],
                ["Purchase History", reliability.purchase_history_score],
                ["Issue Resolution", reliability.issue_resolution_score],
              ].map(([label, value]) => (
                <div className="vi-factor-row" key={label}>
                  <div className="vi-factor-label">
                    <span>{label}</span>
                    <strong>{Math.round(Number(value || 0))}</strong>
                  </div>
                  <div className="vi-factor-track"><div style={{ width: `${clamp(value)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart text="No reliability data available" />
          )}
        </DashboardSection>

        <DashboardSection title="Reliability Score Trend" subtitle="Stored performance history">
          {trend.length ? <LineChart items={trend} /> : <EmptyChart text="No historical reliability snapshots available" />}
        </DashboardSection>

        <DashboardSection title="Contract Status" subtitle="Current vendor contracts">
          <DonutChart items={contractItems} centerValue={data.contracts.length} centerLabel="Contracts" />
        </DashboardSection>

        <DashboardSection title="Order History" subtitle="Orders and procurement value">
          <div className="vi-order-history-summary">
            <strong>{data.purchaseOrders.length}</strong>
            <span>orders</span>
            <em>{formatCurrency(data.vendorOrderValue)}</em>
          </div>
          <BarChart
            items={data.vendorMonthlyOrders}
            valueFormatter={(value) => value}
            maxItems={6}
          />
        </DashboardSection>

        <DashboardSection title="Communication Activity" subtitle={platform ? "Read and unread messages" : "Stored messages associated with your vendor"}>
          {platform ? (
            <DonutChart
              items={[
                { label: "Unread", value: data.unreadCommunications, color: "#e65389" },
                { label: "Read", value: Math.max(data.communicationCount - data.unreadCommunications, 0), color: "#2d83f3" },
              ]}
              centerValue={data.communicationCount}
              centerLabel="Activities"
            />
          ) : (
            <>
              <div className="vi-communication-hero">
                <strong>{data.communicationCount}</strong>
                <span>total activities</span>
              </div>
              <div className="vi-list-rows">
                <div><span>Unread</span><strong>{data.unreadCommunications}</strong></div>
                <div><span>Read</span><strong>{Math.max(data.communicationCount - data.unreadCommunications, 0)}</strong></div>
              </div>
            </>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}

function AdminDashboard({ data }) {
  const riskItems = [
    { label: "Low Risk", value: data.riskDistribution.Low || 0, color: "#22b573" },
    { label: "Medium Risk", value: data.riskDistribution.Medium || 0, color: "#f2b632" },
    { label: "High Risk", value: data.riskDistribution.High || 0, color: "#f07835" },
    { label: "Critical / Review", value: data.riskDistribution.Critical || 0, color: "#e74c5e" },
  ];

  const userItems = Object.entries(data.userRoleDistribution).map(([label, value], index) => ({
    label,
    value,
    color: ["#3d7ef6", "#21b77b", "#a85ce0", "#ff9f43", "#596cf6", "#f06595"][index % 6],
  }));

  const complianceItems = [
    { label: "Compliant", value: data.complianceSummary.compliant, color: "#20b77a" },
    { label: "Minor Issues", value: data.complianceSummary.minor, color: "#f0b73d" },
    { label: "Major Issues", value: data.complianceSummary.major, color: "#f28a37" },
    { label: "Non-Compliant", value: data.complianceSummary.nonCompliant, color: "#e85a68" },
  ];

  return (
    <div className="vi-dashboard vi-role-admin">
      <div className="vi-role-banner admin">
        <div className="vi-role-banner-title">
          <span className="vi-role-icon">⚙</span>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage users, analyze vendors, monitor compliance and system performance.</p>
          </div>
        </div>
        <div className="vi-live-pill">● System overview</div>
      </div>

      <div className="vi-kpi-grid">
        <KpiCard icon="👤" label="Total Users" value={data.users.length} helper="Stored user accounts" tone="blue" />
        <KpiCard icon="🏢" label="Total Vendors" value={data.vendors.length} helper={`${data.activeVendors} active`} tone="green" />
        <KpiCard icon="📄" label="Total Contracts" value={data.contracts.length} helper={`${data.activeContracts} active`} tone="pink" />
        <KpiCard icon="🗄" label="API Status" value={data.healthStatus} helper="Live backend health check" tone="purple" />
      </div>

      <div className="vi-dashboard-grid admin-grid">
        <DashboardSection title="User Management" subtitle="Role distribution from the database">
          <DonutChart items={userItems.length ? userItems : [{ label: "No users", value: 0, color: "#d6dee8" }]} centerValue={data.users.length} centerLabel="Users" />
        </DashboardSection>

        <DashboardSection title="Vendor Analytics" subtitle="Risk distribution from reliability scoring">
          <BarChart items={riskItems} valueFormatter={(value) => value} maxItems={4} />
          <div className="vi-risk-summary">
            {riskItems.map((item) => (
              <div key={item.label}>
                <span className={`vi-legend-dot ${riskClass(item.label)}`} style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Procurement Reports" subtitle="Monthly purchase order cost and volume">
          <DualBarChart items={data.monthlyProcurement} />
        </DashboardSection>

        <DashboardSection title="Contract & Compliance Monitoring" subtitle="Current contract status used in vendor risk analysis">
          <DonutChart items={complianceItems} centerValue={data.complianceTotal} centerLabel="Checks" />
        </DashboardSection>

        <DashboardSection title="System Statistics" subtitle="Current database-driven application statistics">
          <div className="vi-system-stats">
            <div><span>Purchase Orders</span><strong>{data.purchaseOrders.length}</strong></div>
            <div><span>Total Spend</span><strong>{formatCurrency(data.totalProcurementCost)}</strong></div>
            <div><span>Invoices</span><strong>{data.invoices.length}</strong></div>
            <div><span>Unread Communications</span><strong>{data.unreadCommunicationsTotal}</strong></div>
            <div><span>Communications</span><strong>{data.communications.length}</strong></div>
            <div><span>Active Vendors</span><strong>{data.activeVendors}</strong></div>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}

function Dashboard({ analyticsView = false }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role || "";
  const userId = Number(user?.id || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const coreResults = await Promise.all([
          fetchJson("/vendors", token),
          fetchJson("/purchase-orders", token),
          fetchJson("/vendor-performance", token),
        ]);

        const [vendors, purchaseOrders, performance] = coreResults;

        let procurements = [];
        if (role !== "Vendor") {
          try {
            procurements = await fetchJson("/procurements", token);
          } catch (err) {
            console.warn("Procurements unavailable for dashboard:", err.message);
          }
        }

        const optionalResults = await Promise.allSettled([
          fetchJson("/contracts", token),
          fetchJson("/communications", token),
          role !== "Vendor" ? fetchJson("/invoices", token) : Promise.resolve([]),
          role === "System Administrator" ? fetchJson("/users", token) : Promise.resolve([]),
          role === "System Administrator" ? fetchJson("/health", token) : Promise.resolve(null),
        ]);

        const contracts = optionalResults[0].status === "fulfilled" ? optionalResults[0].value : [];
        const communications = optionalResults[1].status === "fulfilled" ? optionalResults[1].value : [];
        const invoices = optionalResults[2].status === "fulfilled" ? optionalResults[2].value : [];
        const users = optionalResults[3].status === "fulfilled" ? optionalResults[3].value : [];
        const health = optionalResults[4].status === "fulfilled" ? optionalResults[4].value : null;

        const reliabilityEntries = await Promise.all(
          vendors.map(async (vendor) => {
            try {
              const reliability = await fetchJson(`/vendor-reliability/${vendor.id}`, token);
              return [vendor.id, reliability];
            } catch (err) {
              console.warn(`Reliability unavailable for vendor ${vendor.id}:`, err.message);
              return [vendor.id, null];
            }
          })
        );

        const reliabilityMap = Object.fromEntries(reliabilityEntries);

        const activeVendors = vendors.filter((vendor) => vendor.status === "Active").length;
        const activeContracts = contracts.filter((contract) => contract.status === "Active").length;
        const totalProcurementCost = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
        const itemsProcured = procurements.reduce((sum, request) => sum + Number(request.quantity || 0), 0);

        const statusCounts = purchaseOrders.reduce((result, po) => {
          result[po.status] = (result[po.status] || 0) + 1;
          return result;
        }, {});

        const deliveredWithDates = purchaseOrders.filter((po) =>
          ["Delivered", "Completed"].includes(po.status) && po.actual_delivery_date && po.delivery_date
        );

        const onTimeOrders = deliveredWithDates.filter((po) => {
          const expected = new Date(po.delivery_date);
          const actual = new Date(po.actual_delivery_date);
          return !Number.isNaN(expected.getTime()) && !Number.isNaN(actual.getTime()) && actual <= expected;
        });

        const onTimeDeliveryRate = deliveredWithDates.length
          ? (onTimeOrders.length / deliveredWithDates.length) * 100
          : null;

        const delayedOrders = purchaseOrders.filter((po) => {
          const expected = po.delivery_date ? new Date(po.delivery_date) : null;
          const actual = po.actual_delivery_date ? new Date(po.actual_delivery_date) : null;

          if (expected && actual && !Number.isNaN(expected.getTime()) && !Number.isNaN(actual.getTime())) {
            return actual > expected;
          }

          if (!actual && expected && PROCUREMENT_ACTIVE_STATUSES.includes(po.status)) {
            return expected < new Date();
          }

          return false;
        });

        const monthlyMap = {};
        purchaseOrders.forEach((po) => {
          const key = getMonthKey(po.order_date || po.created_at);
          if (!key) return;
          if (!monthlyMap[key]) monthlyMap[key] = { key, label: getMonthLabel(key), shortLabel: key.split("-")[1] ? MONTHS[Number(key.split("-")[1]) - 1] : "", cost: 0, orders: 0 };
          monthlyMap[key].cost += Number(po.total_amount || 0);
          monthlyMap[key].orders += 1;
        });

        const monthlyProcurement = Object.values(monthlyMap).sort((a, b) => a.key.localeCompare(b.key));

        const categoryMap = {};
        purchaseOrders.forEach((po) => {
          const vendor = vendors.find((item) => item.id === po.vendor_id);
          const category = vendor?.category || "Other";
          categoryMap[category] = (categoryMap[category] || 0) + Number(po.total_amount || 0);
        });
        const categoryCosts = Object.entries(categoryMap)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);

        const reliabilityValues = Object.values(reliabilityMap).filter(Boolean);
        const averageReliability = reliabilityValues.length
          ? reliabilityValues.reduce(
              (result, item) => {
                result.delivery_score += Number(item.delivery_score || 0);
                result.quality_score += Number(item.quality_score || 0);
                result.communication_score += Number(item.communication_score || 0);
                result.compliance_score += Number(item.compliance_score || 0);
                result.purchase_history_score += Number(item.purchase_history_score || 0);
                result.issue_resolution_score += Number(item.issue_resolution_score || 0);
                return result;
              },
              {
                delivery_score: 0,
                quality_score: 0,
                communication_score: 0,
                compliance_score: 0,
                purchase_history_score: 0,
                issue_resolution_score: 0,
              }
            )
          : null;

        if (averageReliability) {
          Object.keys(averageReliability).forEach((key) => {
            averageReliability[key] = averageReliability[key] / reliabilityValues.length;
          });
        }

        const riskDistribution = reliabilityValues.reduce((result, item) => {
          const score = Number(item.reliability_score || 0);
          if (score >= 80) result.Low += 1;
          else if (score >= 60) result.Medium += 1;
          else result.High += 1;
          return result;
        }, { Low: 0, Medium: 0, High: 0, Critical: 0 });

        const selectedVendor = role === "Vendor"
          ? vendors.find((vendor) => vendor.user_id === userId) || vendors[0] || null
          : null;

        const vendorReliability = selectedVendor ? reliabilityMap[selectedVendor.id] : null;
        const vendorPerformanceRecords = selectedVendor
          ? performance.filter((record) => record.vendor_id === selectedVendor.id)
          : [];
        const latestPerformance = vendorPerformanceRecords
          .slice()
          .sort((a, b) => new Date(b.evaluated_at || 0) - new Date(a.evaluated_at || 0))[0] || null;
        const vendorContracts = selectedVendor
          ? contracts.filter((contract) => contract.vendor_id === selectedVendor.id)
          : [];
        const vendorOrders = selectedVendor
          ? purchaseOrders.filter((po) => po.vendor_id === selectedVendor.id)
          : [];
        const vendorCommunications = selectedVendor
          ? communications.filter((message) => message.related_vendor_id === selectedVendor.id)
          : [];
        const vendorOrderValue = vendorOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);

        const vendorMonthlyMap = {};
        vendorOrders.forEach((po) => {
          const key = getMonthKey(po.order_date || po.created_at);
          if (!key) return;
          if (!vendorMonthlyMap[key]) vendorMonthlyMap[key] = { key, label: getMonthLabel(key), shortLabel: MONTHS[Number(key.split("-")[1]) - 1], value: 0 };
          vendorMonthlyMap[key].value += 1;
        });

        const vendorMonthlyOrders = Object.values(vendorMonthlyMap).sort((a, b) => a.key.localeCompare(b.key));

        const vendorTrend = vendorPerformanceRecords
          .slice()
          .sort((a, b) => new Date(a.evaluated_at || 0) - new Date(b.evaluated_at || 0))
          .map((record) => ({
            label: formatDate(record.evaluated_at),
            shortLabel: new Date(record.evaluated_at || 0).toLocaleDateString("en-IN", { month: "short" }),
            value: Number(record.quality_score ?? (record.rating != null ? Number(record.rating) * 20 : 0)),
          }))
          .filter((point) => Number.isFinite(point.value));

        if (!vendorTrend.length && vendorReliability) {
          vendorTrend.push({
            label: "Current",
            shortLabel: "Now",
            value: Number(vendorReliability.reliability_score || 0),
          });
        }

        const userRoleDistribution = users.reduce((result, item) => {
          result[item.role] = (result[item.role] || 0) + 1;
          return result;
        }, {});

        const complianceSummary = contracts.reduce(
          (result, contract) => {
            if (contract.status === "Active") result.compliant += 1;
            else if (contract.status === "Renewal Pending") result.minor += 1;
            else if (contract.status === "Expired") result.nonCompliant += 1;
            else result.major += 1;
            return result;
          },
          { compliant: 0, minor: 0, major: 0, nonCompliant: 0 }
        );
        const complianceTotal = Object.values(complianceSummary).reduce((sum, value) => sum + value, 0);

        const dashboardData = {
          vendors,
          purchaseOrders,
          procurements,
          performance,
          contracts,
          communications,
          invoices,
          users,
          activeVendors,
          activeContracts,
          totalProcurementCost,
          itemsProcured,
          statusCounts,
          monthlyProcurement,
          categoryCosts,
          delayedOrders,
          onTimeDeliveryRate,
          averageReliability,
          riskDistribution,
          reliabilityMap,
          selectedVendor,
          reliability: vendorReliability,
          latestPerformance,
          vendorActiveContracts: vendorContracts.filter((contract) => contract.status === "Active").length,
          vendorRenewalContracts: vendorContracts.filter((contract) => contract.status === "Renewal Pending").length,
          vendorExpiredContracts: vendorContracts.filter((contract) => contract.status === "Expired").length,
          vendorMonthlyOrders,
          vendorOrderValue,
          communicationCount: vendorCommunications.length,
          unreadCommunications: vendorCommunications.filter((item) => item.is_read === false).length,
          vendorTrend,
          userRoleDistribution,
          unreadCommunicationsTotal: communications.filter((item) => item.is_read === false).length,
          healthStatus: health?.status === "healthy" ? "Healthy" : "Connected",
          complianceSummary,
          complianceTotal,
        };

        if (!cancelled) {
          setData(dashboardData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [token, role, userId]);

  const recentActivity = useMemo(() => {
    if (!data) return [];

    const activity = [];

    data.purchaseOrders.forEach((order) => {
      activity.push({
        date: order.order_date || order.created_at || "",
        text: `${order.po_number} is currently ${order.status}`,
      });
    });

    data.vendors.forEach((vendor) => {
      if (vendor.status === "Active") {
        activity.push({ date: vendor.onboarded_on || "", text: `${vendor.company_name} is an active vendor` });
      } else if (vendor.status === "Pending") {
        activity.push({ date: "", text: `${vendor.company_name} is awaiting approval` });
      }
    });

    data.procurements.forEach((request) => {
      activity.push({
        date: request.needed_date || request.created_at || "",
        text: `${request.procurement_number} is ${request.status}`,
      });
    });

    return activity
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [data]);

  if (loading) {
    return (
      <div className="vi-dashboard-loading">
        <div className="vi-loading-spinner" />
        <h2>Loading dashboard...</h2>
        <p>Reading current procurement and vendor records.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vi-dashboard-error">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button type="button" className="primary-button" onClick={() => window.location.reload()}>
          Reload Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  let dashboardContent;
  if (role === "Vendor") {
    dashboardContent = <VendorDashboard data={data} />;
  } else if (role === "System Administrator") {
    dashboardContent = <AdminDashboard data={data} />;
  } else {
    dashboardContent = <ProcurementDashboard data={data} analyticsView={analyticsView} />;
  }

  return (
    <div>
      {dashboardContent}

      {role !== "Vendor" && recentActivity.length > 0 && (
        <div className="vi-dashboard-activity-strip">
          <DashboardSection title="Recent Activity" subtitle="Latest activity generated from stored records">
            <div className="vi-recent-activity">
              {recentActivity.map((item, index) => (
                <div key={`${item.text}-${index}`}>
                  <span>{formatDate(item.date)}</span>
                  <strong>{item.text}</strong>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
