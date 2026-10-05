import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const API_URL = "https://vendor-intelligence-deployment.onrender.com";

function Reports() {
  const token = localStorage.getItem("token");

  const [data, setData] = useState({
    procurements: [],
    purchaseOrders: [],
    vendors: [],
    performance: [],
    contracts: [],
  });

  const [reportType, setReportType] = useState(
    "Vendor Performance"
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // LOAD REPORT DATA
  // ============================================================

  useEffect(() => {
  let cancelled = false;

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        procurementsResponse,
        purchaseOrdersResponse,
        vendorsResponse,
        performanceResponse,
        contractsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/procurements`, { headers }),
        fetch(`${API_URL}/purchase-orders`, { headers }),
        fetch(`${API_URL}/vendors`, { headers }),
        fetch(`${API_URL}/vendor-performance`, { headers }),
        fetch(`${API_URL}/contracts`, { headers }),
      ]);

      const procurements =
        await procurementsResponse.json();

      const purchaseOrders =
        await purchaseOrdersResponse.json();

      const vendors =
        await vendorsResponse.json();

      const performance =
        await performanceResponse.json();

      const contracts =
        await contractsResponse.json();

      if (!procurementsResponse.ok) {
        throw new Error(
          procurements.detail ||
            "Failed to load procurements"
        );
      }

      if (!purchaseOrdersResponse.ok) {
        throw new Error(
          purchaseOrders.detail ||
            "Failed to load purchase orders"
        );
      }

      if (!vendorsResponse.ok) {
        throw new Error(
          vendors.detail ||
            "Failed to load vendors"
        );
      }

      if (!performanceResponse.ok) {
        throw new Error(
          performance.detail ||
            "Failed to load performance"
        );
      }

      if (!contractsResponse.ok) {
        throw new Error(
          contracts.detail ||
            "Failed to load contracts"
        );
      }

      if (!cancelled) {
        setData({
          procurements,
          purchaseOrders,
          vendors,
          performance,
          contracts,
        });

        setLoading(false);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  if (!token) {
    return;
  }

  loadReports();

  return () => {
    cancelled = true;
  };
}, [token]);

  // ============================================================
  // VENDOR NAME
  // ============================================================



  // ============================================================
  // REPORT DATA
  // ============================================================

const reportRows = useMemo(() => {
  const getVendorNameForReport = (vendorId) => {
    const vendor = data.vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  switch (reportType) {
    case "Vendor Performance":
      return data.vendors.map((vendor) => {
        const records =
          data.performance.filter(
            (record) =>
              record.vendor_id === vendor.id
          );

        const latest =
          records.length > 0
            ? records[records.length - 1]
            : null;

        return {
          Vendor: vendor.company_name,
          "Vendor Code": vendor.vendor_code,
          Status: vendor.status,
          Rating:
            latest?.rating ?? "-",
          Quality:
            latest?.quality_score ?? "-",
          Delivery:
            latest?.delivery_score ?? "-",
          Compliance:
            latest?.compliance_score ?? "-",
          Comments:
            latest?.comments || "-",
        };
      });

    case "Procurement":
      return data.procurements.map(
        (procurement) => ({
          "PR Number":
            procurement.procurement_number,
          Title: procurement.title,
          Budget:
            procurement.budget ?? 0,
          Status: procurement.status,
          "Start Date":
            procurement.start_date || "-",
          "End Date":
            procurement.end_date || "-",
        })
      );

    case "Purchase Orders":
      return data.purchaseOrders.map(
        (order) => ({
          "PO Number":
            order.po_number,
          Vendor:
            getVendorNameForReport(
              order.vendor_id
            ),
          "Procurement ID":
            order.procurement_id,
          "Order Date":
            order.order_date || "-",
          "Delivery Date":
            order.delivery_date || "-",
          Amount:
            order.total_amount ?? 0,
          Status:
            order.status,
        })
      );

    case "Contracts":
      return data.contracts.map(
        (contract) => ({
          "Contract Number":
            contract.contract_number,
          Vendor:
            getVendorNameForReport(
              contract.vendor_id
            ),
          Title:
            contract.title,
          "Start Date":
            contract.start_date || "-",
          "End Date":
            contract.end_date || "-",
          Amount:
            contract.amount ?? 0,
          Status:
            contract.status,
        })
      );

    case "Compliance":
      return data.vendors.map((vendor) => {
        const vendorContracts =
          data.contracts.filter(
            (contract) =>
              contract.vendor_id === vendor.id
          );

        const activeContracts =
          vendorContracts.filter(
            (contract) =>
              contract.status === "Active"
          ).length;

        const expiredContracts =
          vendorContracts.filter(
            (contract) =>
              contract.status === "Expired"
          ).length;

        const vendorPerformance =
          data.performance.filter(
            (record) =>
              record.vendor_id === vendor.id
          );

        const latest =
          vendorPerformance.length > 0
            ? vendorPerformance[
                vendorPerformance.length - 1
              ]
            : null;

        return {
          Vendor:
            vendor.company_name,
          "Vendor Status":
            vendor.status,
          "Total Contracts":
            vendorContracts.length,
          "Active Contracts":
            activeContracts,
          "Expired Contracts":
            expiredContracts,
          "Compliance Score":
            latest?.compliance_score ?? "-",
          "Compliance Status":
            expiredContracts > 0
              ? "Review Required"
              : "Compliant",
        };
      });

    default:
      return [];
  }
}, [reportType, data]);

  // ============================================================
  // PDF EXPORT
  // ============================================================

  const exportPDF = () => {
    if (reportRows.length === 0) {
      setError("No report data available");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(
      `Vendor Intelligence - ${reportType} Report`,
      14,
      20
    );

    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      28
    );

    const headers = Object.keys(
      reportRows[0]
    );

    const rows = reportRows.map((row) =>
      headers.map((header) =>
        String(row[header])
      )
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fontStyle: "bold",
      },
    });

    doc.save(
      `${reportType
        .toLowerCase()
        .replace(/\s+/g, "-")}-report.pdf`
    );

    setMessage("PDF report exported successfully");
    setError("");
  };

  // ============================================================
  // EXCEL EXPORT
  // ============================================================

  const exportExcel = () => {
    if (reportRows.length === 0) {
      setError("No report data available");
      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(
        reportRows
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Report"
    );

    XLSX.writeFile(
      workbook,
      `${reportType
        .toLowerCase()
        .replace(/\s+/g, "-")}-report.xlsx`
    );

    setMessage(
      "Excel report exported successfully"
    );
    setError("");
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>Reports</h1>

          <p>
            Generate and export procurement,
            vendor and compliance reports.
          </p>
        </div>

      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {/* REPORT SELECTOR */}

      <div className="vendor-form-card">

        <h2>
          Report Generator
        </h2>

        <div className="form-grid">

          <div className="form-group">

            <label>
              Report Type
            </label>

            <select
              value={reportType}
              onChange={(e) => {
                setReportType(
                  e.target.value
                );
                setMessage("");
                setError("");
              }}
            >

              <option>
                Vendor Performance
              </option>

              <option>
                Procurement
              </option>

              <option>
                Purchase Orders
              </option>

              <option>
                Contracts
              </option>

              <option>
                Compliance
              </option>

            </select>

          </div>

        </div>

        <div className="form-actions">

          <button
            type="button"
            className="primary-button"
            onClick={exportPDF}
          >
            Export PDF
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={exportExcel}
          >
            Export Excel
          </button>

        </div>

      </div>

      {/* REPORT PREVIEW */}

      <div className="table-container">

        <div className="page-header">

          <div>
            <h2>
              {reportType} Report
            </h2>

            <p>
              Records:{" "}
              <strong>
                {reportRows.length}
              </strong>
            </p>
          </div>

        </div>

        {loading ? (
          <p className="loading-text">
            Loading report data...
          </p>
        ) : reportRows.length === 0 ? (
          <div className="empty-state">

            <h3>
              No data available
            </h3>

            <p>
              There are no records for
              this report.
            </p>

          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>

            <table>

              <thead>

                <tr>
                  {Object.keys(
                    reportRows[0]
                  ).map((header) => (
                    <th key={header}>
                      {header}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {reportRows.map(
                  (row, index) => (
                    <tr key={index}>

                      {Object.keys(
                        reportRows[0]
                      ).map((header) => (
                        <td key={header}>
                          {String(
                            row[header]
                          )}
                        </td>
                      ))}

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default Reports;