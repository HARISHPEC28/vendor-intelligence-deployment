from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


# ============================================================
# ROLES
# ============================================================

UserRole = Literal[
    "Administrator",
    "System Administrator",
    "Company Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
    "Vendor",
]

EmployeeRole = Literal[
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
]


# ============================================================
# COMPANY
# ============================================================

class CompanyCreate(BaseModel):
    name: str
    registration_number: str | None = None
    email: EmailStr
    phone: str | None = None
    address: str | None = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    registration_number: str | None = None
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    status: str

    class Config:
        from_attributes = True


# ============================================================
# AUTHENTICATION
# ============================================================

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = "Vendor"

    category: str | None = None

    company_name: str | None = None
    company_registration_number: str | None = None
    company_phone: str | None = None
    company_address: str | None = None


class CompanyRegistration(BaseModel):
    company_name: str
    company_registration_number: str | None = None
    company_email: EmailStr
    company_phone: str | None = None
    company_address: str | None = None

    admin_name: str
    admin_email: EmailStr
    admin_password: str


class VendorRegistration(BaseModel):
    name: str
    email: EmailStr
    password: str

    company_name: str
    vendor_code: str
    contact_person: str
    phone: str
    address: str
    category: str


class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: EmployeeRole


class SystemAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    company_id: int | None = None
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# ============================================================
# VENDOR
# ============================================================

class VendorCreate(BaseModel):
    company_name: str
    category: str
    contact_person: str
    contact_designation: str
    contact_department: str | None = None
    email: EmailStr
    phone: str
    address: str
    tax_gst_id: str | None = None

    payment_terms: Literal[
        "Net 30",
        "Net 60",
        "Net 90",
    ] | None = None

    products_services: str | None = None
    notes: str | None = None


class VendorResponse(BaseModel):
    id: int
    user_id: int | None = None
    company_id: int | None = None

    company_name: str
    vendor_code: str
    category: str | None = None

    contact_person: str | None = None
    contact_designation: str | None = None
    contact_department: str | None = None

    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None

    tax_gst_id: str | None = None
    payment_terms: str | None = None
    products_services: str | None = None
    notes: str | None = None

    status: str
    onboarded_on: date | None = None

    class Config:
        from_attributes = True


class VendorStatusUpdate(BaseModel):
    status: Literal[
        "Pending",
        "Active",
        "Inactive",
        "Suspended",
        "Rejected",
    ]

    comments: str | None = None


class VendorApprovalRequest(BaseModel):
    status: Literal[
        "Active",
        "Rejected",
    ]

    comments: str | None = None


# ============================================================
# VENDOR PERFORMANCE
# ============================================================

class VendorPerformanceCreate(BaseModel):
    company_id: int | None = None
    vendor_id: int

    rating: float | None = None
    quality_score: float | None = None

    comments: str | None = None


class VendorPerformanceResponse(BaseModel):
    id: int
    company_id: int
    vendor_id: int

    rating: float | None = None
    quality_score: float | None = None

    delivery_score: float | None = None
    compliance_score: float | None = None

    comments: str | None = None
    evaluated_by: int | None = None
    evaluated_at: datetime | None = None

    class Config:
        from_attributes = True


# ============================================================
# VENDOR RELIABILITY
# ============================================================

class VendorReliabilityResponse(BaseModel):
    vendor_id: int
    vendor_name: str

    reliability_score: float
    risk_level: str

    delivery_score: float
    on_time_deliveries: int
    delayed_deliveries: int
    total_delivered_orders: int

    quality_score: float

    compliance_score: float
    valid_contracts: int
    active_contracts: int
    total_contracts: int
    contract_score: float

    communication_score: float
    communication_count: int

    purchase_history_score: float
    total_purchase_orders: int
    completed_purchase_orders: int

    issue_resolution_score: float
    total_issues: int
    resolved_issues: int
    issues_resolved_within_agreed_time: int

    class Config:
        from_attributes = True


# ============================================================
# VENDOR ISSUES
# ============================================================

class VendorIssueCreate(BaseModel):
    vendor_id: int
    purchase_order_id: int | None = None

    title: str
    description: str | None = None

    agreed_resolution_hours: float


class VendorIssueStatusUpdate(BaseModel):
    status: Literal[
        "Open",
        "In Progress",
        "Resolved",
        "Closed",
    ]


class VendorIssueResponse(BaseModel):
    id: int
    vendor_id: int
    purchase_order_id: int | None = None

    title: str
    description: str | None = None

    status: str
    agreed_resolution_hours: float

    raised_at: datetime
    resolved_at: datetime | None = None

    created_by: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# CERTIFICATION
# ============================================================

class CertificationCreate(BaseModel):
    vendor_id: int
    name: str

    issue_date: date | None = None
    expiry_date: date | None = None

    status: Literal[
        "Valid",
        "Expired",
        "Expiring Soon",
    ] = "Valid"

    document_url: str | None = None


class CertificationResponse(BaseModel):
    id: int
    vendor_id: int

    name: str
    issue_date: date | None = None
    expiry_date: date | None = None

    status: str
    document_url: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# COMPLIANCE CHECK
# ============================================================

class ComplianceCheckCreate(BaseModel):
    vendor_id: int
    requirement: str

    status: Literal[
        "Pending",
        "Passed",
        "Failed",
    ] = "Pending"

    comments: str | None = None


class ComplianceCheckResponse(BaseModel):
    id: int
    vendor_id: int

    requirement: str
    status: str

    comments: str | None = None
    checked_by: int | None = None
    checked_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# VENDOR DOCUMENT
# ============================================================

class VendorDocumentCreate(BaseModel):
    vendor_id: int
    name: str

    document_type: str | None = None
    document_url: str | None = None
    expiry_date: date | None = None

    status: Literal[
        "Active",
        "Expired",
        "Expiring Soon",
    ] = "Active"


class VendorDocumentResponse(BaseModel):
    id: int
    vendor_id: int

    name: str
    document_type: str | None = None
    document_url: str | None = None
    expiry_date: date | None = None

    status: str

    class Config:
        from_attributes = True


# ============================================================
# PROCUREMENT
# ============================================================

class ProcurementCreate(BaseModel):
    # Vendor is optional.
    # Procurement can be created without selecting a vendor.
    vendor_id: int | None = None

    title: str
    description: str | None = None

    quantity: int
    unit_price: float

    needed_date: date | None = None

    priority: Literal[
        "Low",
        "Medium",
        "High",
        "Urgent",
    ] = "Medium"


class ProcurementResponse(BaseModel):
    id: int

    company_id: int | None = None
    vendor_id: int | None = None

    procurement_number: str

    title: str
    description: str | None = None

    created_by: int

    status: str

    quantity: int
    unit_price: float

    needed_date: date | None = None

    priority: str = "Medium"

    class Config:
        from_attributes = True


class ProcurementStatusUpdate(BaseModel):
    status: Literal[
        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled",
    ]

# ============================================================
# PURCHASE ORDER
# ============================================================

class PurchaseOrderItemCreate(BaseModel):
    item_name: str
    description: str | None = None

    quantity: int
    unit_price: float


class PurchaseOrderCreate(BaseModel):
    vendor_id: int

    # Optional for standalone Purchase Orders.
    # When created from an Approved Procurement,
    # this contains the procurement ID.
    procurement_id: int | None = None

    # Purchase Order creation date
    order_date: date | None = None

    # Expected delivery date
    delivery_date: date | None = None

    # Payment terms selected for this Purchase Order
    payment_terms: str | None = "Net 15"

    # Client sends this value.
    # Backend should calculate the final amount from items.
    total_amount: float

    # One or more PO line items
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderItemResponse(BaseModel):
    id: int
    purchase_order_id: int

    item_name: str
    description: str | None = None

    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True


class PurchaseOrderResponse(BaseModel):
    id: int

    company_id: int | None = None

    po_number: str

    vendor_id: int

    # Optional for standalone Purchase Orders
    procurement_id: int | None = None

    created_by: int

    # Purchase Order creation date
    order_date: date | None = None

    # Expected delivery date
    delivery_date: date | None = None

    # Actual delivery date
    actual_delivery_date: date | None = None

    # Payment terms
    payment_terms: str | None = None

    # Final calculated amount
    total_amount: float | None = None

    status: str

    class Config:
        from_attributes = True


class PurchaseOrderStatusUpdate(BaseModel):
    status: Literal[
        "Draft",
        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled",
    ]

    # Required when a PO is marked as Delivered
    actual_delivery_date: date | None = None


class PurchaseOrderRequestCreate(BaseModel):
    order_date: date | None = None
    delivery_date: date | None = None
    payment_terms: str | None = "Net 15"
    total_amount: float
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderRequestItemResponse(BaseModel):
    id: int
    request_id: int
    item_name: str
    description: str | None = None
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True


class PurchaseOrderRequestResponse(BaseModel):
    id: int
    request_number: str
    created_by: int
    assigned_vendor_id: int | None = None
    assigned_vendor_name: str | None = None
    purchase_order_id: int | None = None
    po_number: str | None = None
    order_date: date | None = None
    delivery_date: date | None = None
    payment_terms: str | None = None
    total_amount: float
    status: str
    created_at: datetime | None = None
    items: list[PurchaseOrderRequestItemResponse] = []


class PurchaseOrderRequestVendorAssignment(BaseModel):
    vendor_id: int


# ============================================================
# CONTRACT
# ============================================================

class ContractCreate(BaseModel):
    vendor_id: int
    contract_number: str
    title: str

    start_date: date | None = None
    end_date: date | None = None

    amount: float | None = None
    document_url: str | None = None


class ContractResponse(BaseModel):
    id: int

    # Contracts may have company_id = None
    company_id: int | None = None

    vendor_id: int
    contract_number: str
    title: str

    start_date: date | None = None
    end_date: date | None = None

    amount: float | None = None
    document_url: str | None = None

    status: str

    class Config:
        from_attributes = True


class ContractStatusUpdate(BaseModel):
    status: Literal[
        "Active",
        "Expired",
        "Renewal Pending",
        "Cancelled",
    ]


# ============================================================
# COMMUNICATION
# ============================================================

class CommunicationCreate(BaseModel):
    receiver_id: int

    subject: str | None = None
    message: str

    related_vendor_id: int | None = None
    related_procurement_id: int | None = None


class CommunicationResponse(BaseModel):
    id: int

    sender_id: int
    receiver_id: int

    company_id: int | None = None

    subject: str | None = None
    message: str

    related_vendor_id: int | None = None
    related_procurement_id: int | None = None

    is_read: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CommunicationReadUpdate(BaseModel):
    is_read: bool


# ============================================================
# PROFILE
# ============================================================

class ProfileUpdate(BaseModel):
    name: str
    email: EmailStr


class ProfileResponse(BaseModel):
    id: int

    company_id: int | None = None

    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# ============================================================
# PASSWORD RESET
# ============================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ============================================================
# INVOICE
# ============================================================

class InvoiceCreate(BaseModel):
    purchase_order_id: int
    vendor_id: int
    invoice_number: str

    invoice_date: date | None = None
    due_date: date | None = None

    amount: float
    document_url: str | None = None


class InvoiceResponse(BaseModel):
    id: int

    invoice_number: str

    purchase_order_id: int
    vendor_id: int

    invoice_date: date | None = None
    due_date: date | None = None

    amount: float
    status: str

    document_url: str | None = None

    class Config:
        from_attributes = True


class InvoiceStatusUpdate(BaseModel):
    status: Literal[
        "Pending",
        "Approved",
        "Paid",
        "Overdue",
        "Cancelled",
    ]