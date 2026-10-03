from datetime import date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Boolean,
    func,
)

from database import Base


# ============================================================
# COMPANY
# ============================================================

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(200),
        nullable=False,
    )

    registration_number = Column(
        String(100),
        unique=True,
        nullable=True,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    address = Column(
        String(500),
        nullable=True,
    )

    status = Column(
        String(50),
        default="Active",
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # NULL for System Administrators and Vendor users
    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
    )

    password = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(50),
        nullable=False,
        default="Vendor",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR
# ============================================================

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Vendor login account
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=True,
    )

    # Company that manages/owns this vendor record
    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    # Basic vendor information
    company_name = Column(
        String(200),
        nullable=False,
    )

    vendor_code = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    # Primary contact
    contact_person = Column(
        String(150),
        nullable=False,
    )

    contact_designation = Column(
        String(150),
        nullable=True,
    )

    contact_department = Column(
        String(150),
        nullable=True,
    )

    email = Column(
        String(255),
        nullable=True,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    # Business information
    address = Column(
        String(500),
        nullable=False,
    )

    tax_gst_id = Column(
        String(100),
        nullable=True,
    )

    payment_terms = Column(
        String(100),
        nullable=True,
    )

    # Products / services supplied
    products_services = Column(
        String(1000),
        nullable=True,
    )

    # Additional notes
    notes = Column(
        String(2000),
        nullable=True,
    )

    # Pending -> Active / Inactive / Suspended / Rejected
    status = Column(
        String(50),
        default="Pending",
        nullable=False,
    )

    # Set when vendor becomes Active
    onboarded_on = Column(
        Date,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR DOCUMENTS
# ============================================================

class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    document_type = Column(
        String(100),
        nullable=True,
    )

    document_url = Column(
        String(500),
        nullable=True,
    )

    expiry_date = Column(
        Date,
        nullable=True,
    )

    status = Column(
        String(50),
        default="Active",
    )


# ============================================================
# CERTIFICATION
# ============================================================

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    issue_date = Column(
        Date,
        nullable=True,
    )

    expiry_date = Column(
        Date,
        nullable=True,
    )

    status = Column(
        String(50),
        default="Valid",
        nullable=False,
    )

    document_url = Column(
        String(500),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# COMPLIANCE CHECK
# ============================================================

class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    requirement = Column(
        String(300),
        nullable=False,
    )

    status = Column(
        String(50),
        default="Pending",
        nullable=False,
    )

    comments = Column(
        String(1000),
        nullable=True,
    )

    checked_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    checked_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR CONTACTS
# ============================================================

class VendorContact(Base):
    __tablename__ = "vendor_contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    designation = Column(
        String(150),
        nullable=True,
    )

    department = Column(
        String(150),
        nullable=True,
    )

    email = Column(
        String(255),
        nullable=True,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    is_primary = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR APPROVAL
# ============================================================

class VendorApproval(Base):
    __tablename__ = "vendor_approvals"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    # System Administrator who approves/rejects
    approved_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    status = Column(
        String(50),
        default="Pending",
        nullable=False,
    )

    comments = Column(
        String(1000),
        nullable=True,
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


# ============================================================
# PROCUREMENT
# ============================================================

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
        index=True,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
    )

    procurement_number = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    title = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    status = Column(
        String(50),
        default="Pending",
        nullable=False,
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1,
    )

    unit_price = Column(
        Float,
        nullable=False,
        default=0,
    )

    needed_date = Column(
        Date,
        nullable=True,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
    )


# ============================================================
# VENDOR STATUS HISTORY
# ============================================================

class VendorStatusHistory(Base):
    __tablename__ = "vendor_status_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    changed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    from_status = Column(
        String(50),
        nullable=True,
    )

    to_status = Column(
        String(50),
        nullable=False,
    )

    comments = Column(
        String(1000),
        nullable=True,
    )

    changed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# ============================================================
# PURCHASE ORDER
# ============================================================

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    po_number = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    # Optional:
    # PO can be linked to a Procurement request
    # or created independently.
    procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        nullable=True,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # PO creation date
    order_date = Column(
        Date,
        nullable=True,
    )

    # Expected delivery date
    delivery_date = Column(
        Date,
        nullable=True,
    )

    # Actual delivery date
    actual_delivery_date = Column(
        Date,
        nullable=True,
    )

    # Payment terms
    payment_terms = Column(
        String(100),
        nullable=True,
        default="Net 15",
    )

    # Final amount calculated from PO items
    total_amount = Column(
        Float,
        nullable=True,
    )

    # Draft / Pending / Approved / Ordered /
    # Delivered / Completed / Cancelled
    status = Column(
        String(50),
        default="Ordered",
        nullable=False,
    )


# ============================================================
# PURCHASE ORDER ITEMS
# ============================================================

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False,
        index=True,
    )

    item_name = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    quantity = Column(
        Integer,
        nullable=False,
    )

    unit_price = Column(
        Float,
        nullable=False,
    )

    total_price = Column(
        Float,
        nullable=False,
    )


# ============================================================
# PURCHASE ORDER REQUEST
# ============================================================

class PurchaseOrderRequest(Base):
    __tablename__ = "purchase_order_requests"

    id = Column(Integer, primary_key=True, index=True)

    request_number = Column(String(100), unique=True, nullable=False)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    assigned_vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=True,
    )

    order_date = Column(Date, nullable=True)
    delivery_date = Column(Date, nullable=True)
    payment_terms = Column(String(100), nullable=True, default="Net 15")
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), nullable=False, default="Open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PurchaseOrderRequestItem(Base):
    __tablename__ = "purchase_order_request_items"

    id = Column(Integer, primary_key=True, index=True)

    request_id = Column(
        Integer,
        ForeignKey("purchase_order_requests.id"),
        nullable=False,
        index=True,
    )

    item_name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)


# ============================================================
# CONTRACT
# ============================================================

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    contract_number = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    title = Column(
        String(200),
        nullable=False,
    )

    start_date = Column(
        Date,
        nullable=True,
    )

    end_date = Column(
        Date,
        nullable=True,
    )

    amount = Column(
        Float,
        nullable=True,
    )

    document_url = Column(
        String(500),
        nullable=True,
    )

    status = Column(
        String(50),
        default="Active",
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR PERFORMANCE
# ============================================================

class VendorPerformance(Base):
    __tablename__ = "vendor_performance"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    rating = Column(
        Float,
        nullable=True,
    )

    quality_score = Column(
        Float,
        nullable=True,
    )

    delivery_score = Column(
        Float,
        nullable=True,
    )

    compliance_score = Column(
        Float,
        nullable=True,
    )

    comments = Column(
        String(1000),
        nullable=True,
    )

    evaluated_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    evaluated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# VENDOR ISSUES
# ============================================================

class VendorIssue(Base):
    __tablename__ = "vendor_issues"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=True,
        index=True,
    )

    title = Column(
        String(300),
        nullable=False,
    )

    description = Column(
        String(2000),
        nullable=True,
    )

    status = Column(
        String(50),
        default="Open",
        nullable=False,
    )

    # Maximum allowed time to resolve the issue
    agreed_resolution_hours = Column(
        Float,
        nullable=False,
    )

    raised_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# ============================================================
# COMMUNICATION
# ============================================================

class Communication(Base):
    __tablename__ = "communications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    receiver_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )

    subject = Column(
        String(300),
        nullable=True,
    )

    message = Column(
        String(5000),
        nullable=False,
    )

    related_vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
    )

    related_procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        nullable=True,
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    title = Column(
        String(300),
        nullable=False,
    )

    message = Column(
        String(1000),
        nullable=False,
    )

    type = Column(
        String(100),
        nullable=True,
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ============================================================
# INVOICE
# ============================================================

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    invoice_number = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    invoice_date = Column(
        Date,
        nullable=True,
    )

    due_date = Column(
        Date,
        nullable=True,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    status = Column(
        String(50),
        default="Pending",
        nullable=False,
    )

    document_url = Column(
        String(500),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )