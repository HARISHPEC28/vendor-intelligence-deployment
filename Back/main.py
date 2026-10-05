from datetime import datetime, timezone
from typing import List
import uuid

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import or_

from jose import JWTError, jwt

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    SECRET_KEY,
    ALGORITHM,
)

from database import Base, engine, get_db
import models

from schemas import (
    UserRegister,
    CompanyRegistration,
    VendorRegistration,
    EmployeeCreate,
    SystemAdminCreate,

    UserLogin,
    Token,
    UserResponse,

    CompanyResponse,

    VendorCreate,
    VendorResponse,
    VendorStatusUpdate,
    VendorApprovalRequest,

    ProcurementCreate,
    ProcurementResponse,
    ProcurementStatusUpdate,

    PurchaseOrderCreate,
    PurchaseOrderItemResponse,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
    PurchaseOrderRequestCreate,
    PurchaseOrderRequestResponse,
    PurchaseOrderRequestItemResponse,
    PurchaseOrderRequestVendorAssignment,

    ContractCreate,
    ContractResponse,
    ContractStatusUpdate,

    CommunicationCreate,
    CommunicationResponse,
    CommunicationReadUpdate,

    ProfileUpdate,
    ProfileResponse,

    ForgotPasswordRequest,
    ResetPasswordRequest,

    InvoiceCreate,
    InvoiceResponse,
    InvoiceStatusUpdate,

    VendorPerformanceCreate,
    VendorPerformanceResponse,

    VendorIssueCreate,
    VendorIssueStatusUpdate,
    VendorIssueResponse,

    VendorReliabilityResponse,

    CertificationCreate,
    CertificationResponse,

    ComplianceCheckCreate,
    ComplianceCheckResponse,

    VendorDocumentCreate,
    VendorDocumentResponse,
)


# ============================================================
# APPLICATION
# ============================================================

security = HTTPBearer()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vendor Intelligence API",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONSTANTS
# ============================================================

SYSTEM_ADMIN = "System Administrator"
COMPANY_ADMIN = "Company Administrator"

PROCUREMENT_MANAGER = "Procurement Manager"
SUPPLY_CHAIN_MANAGER = "Supply Chain Manager"
FINANCE_OFFICER = "Finance Officer"
AUDITOR = "Auditor"
VENDOR = "Vendor"

EMPLOYEE_ROLES = [
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    FINANCE_OFFICER,
    AUDITOR,
]

ALL_ROLES = [
    SYSTEM_ADMIN,
    COMPANY_ADMIN,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    FINANCE_OFFICER,
    AUDITOR,
    VENDOR,
]

VENDOR_CATEGORIES = [
    "Raw Material Suppliers",
    "Equipment Vendors",
    "IT Vendors",
    "Service Providers",
    "Logistics Partners",
    "Maintenance Vendors",
]

PROCUREMENT_STATUSES = [
    "Pending",
    "Approved",
    "Ordered",
    "Delivered",
    "Completed",
    "Cancelled",
]

PURCHASE_ORDER_STATUSES = [
    "Draft",
    "Pending",
    "Approved",
    "Ordered",
    "Delivered",
    "Completed",
    "Cancelled",
]

CONTRACT_STATUSES = [
    "Active",
    "Expired",
    "Renewal Pending",
    "Cancelled",
]

INVOICE_STATUSES = [
    "Pending",
    "Approved",
    "Paid",
    "Overdue",
    "Cancelled",
]

VENDOR_STATUSES = [
    "Pending",
    "Active",
    "Inactive",
    "Suspended",
    "Rejected",
]


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Vendor Intelligence API is running",
        "version": "2.0.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ============================================================
# AUTH HELPERS
# ============================================================

def check_roles(user, allowed_roles):
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to perform this action",
        )


def require_system_admin(current_user):
    check_roles(
        current_user,
        [SYSTEM_ADMIN],
    )


def require_company_admin(current_user):
    check_roles(
        current_user,
        [COMPANY_ADMIN],
    )


def require_company_user(current_user):
    check_roles(
        current_user,
        [
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
        ],
    )


def ensure_same_company(current_user, company_id):
    if current_user.role == SYSTEM_ADMIN:
        return

    if current_user.company_id != company_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this company's data",
        )


def ensure_vendor_access(current_user, vendor):
    """
    Internal users can view vendor records.
    Vendor users can only access their own vendor profile.
    System Administrator can access all vendors.
    """

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own vendor profile",
            )

        return

    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
        ],
    )


# ============================================================
# CURRENT USER
# ============================================================

@app.get(
    "/auth/me",
    response_model=UserResponse,
)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token",
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    try:
        user_id = int(user_id)

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    # Pending vendors cannot use the application yet.
    if user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id == user.id
            )
            .first()
        )

        if vendor and vendor.status != "Active":

            raise HTTPException(
                status_code=403,
                detail=(
                    f"Vendor account is {vendor.status}. "
                    "System Administrator approval is required."
                ),
            )

    return user


# ============================================================
# INITIAL SYSTEM ADMIN SETUP
# ============================================================

@app.post(
    "/auth/setup-system-admin",
    response_model=UserResponse,
)
def setup_system_admin(
    admin: SystemAdminCreate,
    db: Session = Depends(get_db),
):
    existing_admin = (
        db.query(models.User)
        .filter(
            models.User.role == SYSTEM_ADMIN
        )
        .first()
    )

    if existing_admin:
        raise HTTPException(
            status_code=403,
            detail="System Administrator setup has already been completed",
        )

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == admin.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_admin = models.User(
        company_id=None,
        name=admin.name,
        email=admin.email,
        password=hash_password(admin.password),
        role=SYSTEM_ADMIN,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return new_admin


# ============================================================
# COMPANY REGISTRATION
# ============================================================

@app.post(
    "/auth/register-company",
    response_model=UserResponse,
)
def register_company(
    registration: CompanyRegistration,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email
            == registration.admin_email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Administrator email already registered",
        )

    existing_company_email = (
        db.query(models.Company)
        .filter(
            models.Company.email
            == registration.company_email
        )
        .first()
    )

    if existing_company_email:
        raise HTTPException(
            status_code=400,
            detail="Company email already registered",
        )

    if registration.company_registration_number:

        existing_registration = (
            db.query(models.Company)
            .filter(
                models.Company.registration_number
                == registration.company_registration_number
            )
            .first()
        )

        if existing_registration:
            raise HTTPException(
                status_code=400,
                detail="Company registration number already exists",
            )

    new_company = models.Company(
        name=registration.company_name,
        registration_number=(
            registration.company_registration_number
        ),
        email=registration.company_email,
        phone=registration.company_phone,
        address=registration.company_address,
        status="Active",
    )

    db.add(new_company)
    db.flush()

    new_admin = models.User(
        company_id=new_company.id,
        name=registration.admin_name,
        email=registration.admin_email,
        password=hash_password(
            registration.admin_password
        ),
        role=COMPANY_ADMIN,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return new_admin


# ============================================================
# VENDOR REGISTRATION
# ============================================================

@app.post(
    "/auth/register-vendor",
    response_model=VendorResponse,
)
def register_vendor(
    registration: VendorRegistration,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == registration.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    existing_vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.vendor_code
            == registration.vendor_code
        )
        .first()
    )

    if existing_vendor:
        raise HTTPException(
            status_code=400,
            detail="Vendor code already exists",
        )

    if registration.category not in VENDOR_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid vendor category",
        )

    new_user = models.User(
        company_id=None,
        name=registration.name,
        email=registration.email,
        password=hash_password(
            registration.password
        ),
        role=VENDOR,
    )

    db.add(new_user)
    db.flush()

    new_vendor = models.Vendor(
        user_id=new_user.id,
        company_name=registration.company_name,
        vendor_code=registration.vendor_code,
        contact_person=registration.contact_person,
        email=registration.email,
        phone=registration.phone,
        address=registration.address,
        category=registration.category,
        status="Pending",
    )

    db.add(new_vendor)
    db.flush()

    approval = models.VendorApproval(
        vendor_id=new_vendor.id,
        approved_by=None,
        status="Pending",
        comments=None,
        approved_at=None,
    )

    db.add(approval)

    db.commit()
    db.refresh(new_vendor)

    return new_vendor


# ============================================================
# NORMAL USER REGISTRATION
# ============================================================

@app.post(
    "/auth/register",
    response_model=UserResponse,
)
def register(
    user: UserRegister,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == user.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    if user.role not in [
        "Administrator",
        SYSTEM_ADMIN,
        PROCUREMENT_MANAGER,
        SUPPLY_CHAIN_MANAGER,
        VENDOR,
        FINANCE_OFFICER,
        AUDITOR,
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role selected",
        )

    if user.role == "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Administrator registration is not allowed",
        )

    role = user.role

    new_user = models.User(
        company_id=None,
        name=user.name,
        email=user.email,
        password=hash_password(
            user.password
        ),
        role=role,
    )

    db.add(new_user)
    db.flush()

    # ========================================================
    # VENDOR
    # ========================================================

    if role == VENDOR:

        if not user.category:
            raise HTTPException(
                status_code=400,
                detail="Vendor category is required",
            )

        if user.category not in VENDOR_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid vendor category",
            )

        existing_vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id
                == new_user.id
            )
            .first()
        )

        if not existing_vendor:

            new_vendor = models.Vendor(
                user_id=new_user.id,
                company_name=user.name,
                vendor_code=(
                    f"VEN-{new_user.id:05d}"
                ),
                contact_person=user.name,
                email=user.email,
                phone=None,
                address=None,
                category=user.category,
                status="Pending",
            )

            db.add(new_vendor)
            db.flush()

            approval = models.VendorApproval(
                vendor_id=new_vendor.id,
                approved_by=None,
                status="Pending",
                comments=None,
                approved_at=None,
            )

            db.add(approval)

    db.commit()
    db.refresh(new_user)

    return new_user


# ============================================================
# LOGIN
# ============================================================

@app.post(
    "/auth/login",
    response_model=Token,
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db),
):
    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == user.email
        )
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user.password,
        db_user.password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if db_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id
                == db_user.id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=403,
                detail="Vendor profile not found",
            )

        if vendor.status == "Pending":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Vendor registration is awaiting "
                    "System Administrator approval"
                ),
            )

        if vendor.status == "Rejected":
            raise HTTPException(
                status_code=403,
                detail="Vendor registration was rejected",
            )

    token = create_access_token(
        {
            "sub": str(db_user.id),
            "email": db_user.email,
            "role": db_user.role,
            "company_id": db_user.company_id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# ============================================================
# PASSWORD RESET
# ============================================================

reset_tokens = {}


@app.post("/auth/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(
            models.User.email == request.email
        )
        .first()
    )

    if not user:
        return {
            "message": (
                "If the email exists, "
                "a reset token has been generated."
            )
        }

    token = create_reset_token()

    reset_tokens[token] = user.id

    return {
        "message": "Password reset token generated",
        "reset_token": token,
    }


@app.post("/auth/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user_id = reset_tokens.get(
        request.token
    )

    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )

    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.password = hash_password(
        request.new_password
    )

    db.commit()

    del reset_tokens[request.token]

    return {
        "message": "Password reset successful"
    }


# ============================================================
# PROFILE
# ============================================================

@app.put(
    "/auth/profile",
    response_model=ProfileResponse,
)
def update_profile(
    profile: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == profile.email,
            models.User.id != current_user.id,
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail=(
                "Email already registered "
                "by another user"
            ),
        )

    current_user.name = profile.name
    current_user.email = profile.email

    db.commit()
    db.refresh(current_user)

    return current_user


# ============================================================
# SYSTEM ADMIN - CREATE ANOTHER SYSTEM ADMIN
# ============================================================

@app.post(
    "/auth/system-admins",
    response_model=UserResponse,
)
def create_system_admin(
    admin: SystemAdminCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    require_system_admin(current_user)

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == admin.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_admin = models.User(
        company_id=None,
        name=admin.name,
        email=admin.email,
        password=hash_password(
            admin.password
        ),
        role=SYSTEM_ADMIN,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return new_admin


# ============================================================
# COMPANY ADMIN - CREATE EMPLOYEE
# ============================================================

@app.post(
    "/company/employees",
    response_model=UserResponse,
)
def create_company_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    require_company_admin(current_user)

    if employee.role not in EMPLOYEE_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid employee role",
        )

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == employee.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_employee = models.User(
        company_id=None,
        name=employee.name,
        email=employee.email,
        password=hash_password(
            employee.password
        ),
        role=employee.role,
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


# ============================================================
# COMPANY ADMIN - GET EMPLOYEES
# ============================================================

@app.get(
    "/company/employees",
    response_model=List[UserResponse],
)
def get_company_employees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    require_company_admin(current_user)

    return (
        db.query(models.User)
        .filter(
            models.User.company_id
            == current_user.company_id,
            models.User.role != COMPANY_ADMIN,
        )
        .all()
    )


# ============================================================
# COMPANY MANAGEMENT
# ============================================================

@app.get(
    "/companies",
    response_model=List[CompanyResponse],
)
def get_companies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    require_system_admin(current_user)

    return (
        db.query(models.Company)
        .all()
    )


@app.get(
    "/companies/{company_id}",
    response_model=CompanyResponse,
)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    if current_user.role != SYSTEM_ADMIN:
        ensure_same_company(
            current_user,
            company_id,
        )

    company = (
        db.query(models.Company)
        .filter(
            models.Company.id == company_id
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return company


# ============================================================
# VENDOR MANAGEMENT
# ============================================================

@app.get(
    "/vendors",
    response_model=List[VendorResponse],
)
def get_vendors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    if current_user.role == VENDOR:

        return (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .all()
        )

    return (
        db.query(models.Vendor)
        .order_by(
            models.Vendor.id.asc()
        )
        .all()
    )


@app.get(
    "/vendors/{vendor_id}",
    response_model=VendorResponse,
)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    ensure_vendor_access(
        current_user,
        vendor,
    )

    return vendor


# ============================================================
# VENDOR PERFORMANCE
# ============================================================

@app.get(
    "/vendor-performance",
    response_model=List[VendorPerformanceResponse],
)
def get_vendor_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        ALL_ROLES,
    )

    if current_user.role == SYSTEM_ADMIN:

        return (
            db.query(
                models.VendorPerformance
            )
            .order_by(
                models.VendorPerformance.evaluated_at.desc()
            )
            .all()
        )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .first()
        )

        if not vendor:
            return []

        return (
            db.query(
                models.VendorPerformance
            )
            .filter(
                models.VendorPerformance.vendor_id
                == vendor.id
            )
            .order_by(
                models.VendorPerformance.evaluated_at.desc()
            )
            .all()
        )

    if current_user.company_id is None:
        return (
            db.query(models.VendorPerformance)
            .order_by(models.VendorPerformance.evaluated_at.desc())
            .all()
        )

    return (
        db.query(
            models.VendorPerformance
        )
        .filter(
            models.VendorPerformance.company_id
            == current_user.company_id
        )
        .order_by(
            models.VendorPerformance.evaluated_at.desc()
        )
        .all()
    )


@app.get(
    "/vendor-performance/{vendor_id}",
    response_model=List[VendorPerformanceResponse],
)
def get_vendor_performance_by_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        ALL_ROLES,
    )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .first()
        )

        if (
            not vendor
            or vendor.id != vendor_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only access "
                    "your own performance"
                ),
            )

        return (
            db.query(
                models.VendorPerformance
            )
            .filter(
                models.VendorPerformance.vendor_id
                == vendor_id
            )
            .order_by(
                models.VendorPerformance.evaluated_at.desc()
            )
            .all()
        )

    if current_user.role == SYSTEM_ADMIN:

        return (
            db.query(
                models.VendorPerformance
            )
            .filter(
                models.VendorPerformance.vendor_id
                == vendor_id
            )
            .order_by(
                models.VendorPerformance.evaluated_at.desc()
            )
            .all()
        )

    if current_user.company_id is None:
        return (
            db.query(models.VendorPerformance)
            .filter(models.VendorPerformance.vendor_id == vendor_id)
            .order_by(models.VendorPerformance.evaluated_at.desc())
            .all()
        )

    return (
        db.query(
            models.VendorPerformance
        )
        .filter(
            models.VendorPerformance.vendor_id
            == vendor_id,
            models.VendorPerformance.company_id
            == current_user.company_id,
        )
        .order_by(
            models.VendorPerformance.evaluated_at.desc()
        )
        .all()
    )


@app.post(
    "/vendor-performance",
    response_model=VendorPerformanceResponse,
)
def create_vendor_performance(
    performance: VendorPerformanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == performance.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == SYSTEM_ADMIN:

        if performance.company_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "company_id is required "
                    "for System Administrator"
                ),
            )

        company_id = performance.company_id

    else:

        company_id = current_user.company_id

    company = (
        db.query(models.Company)
        .filter(
            models.Company.id
            == company_id
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    new_performance = models.VendorPerformance(
        company_id=company_id,
        vendor_id=performance.vendor_id,
        rating=performance.rating,
        quality_score=performance.quality_score,
        comments=performance.comments,
        evaluated_by=current_user.id,
    )

    db.add(new_performance)
    db.commit()
    db.refresh(new_performance)

    return new_performance


@app.put(
    "/vendor-performance/{performance_id}",
    response_model=VendorPerformanceResponse,
)
def update_vendor_performance(
    performance_id: int,
    performance: VendorPerformanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    record = (
        db.query(
            models.VendorPerformance
        )
        .filter(
            models.VendorPerformance.id
            == performance_id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Performance record not found",
        )

    if current_user.role != SYSTEM_ADMIN:

        if (
            record.company_id
            != current_user.company_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Access denied",
            )

    record.rating = performance.rating
    record.quality_score = performance.quality_score
    record.comments = performance.comments
    record.evaluated_by = current_user.id

    db.commit()
    db.refresh(record)

    return record


# ============================================================
# VENDOR RELIABILITY SCORING
# ============================================================

@app.get(
    "/vendor-reliability/{vendor_id}",
    response_model=VendorReliabilityResponse,
)
def get_vendor_reliability(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        ALL_ROLES,
    )

    # --------------------------------------------------------
    # FIND VENDOR
    # --------------------------------------------------------

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    # --------------------------------------------------------
    # VENDOR ACCESS
    # --------------------------------------------------------

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own reliability score"
                ),
            )

    # --------------------------------------------------------
    # PURCHASE ORDERS
    # --------------------------------------------------------

    purchase_orders = (
        db.query(models.PurchaseOrder)
        .filter(
            models.PurchaseOrder.vendor_id
            == vendor_id
        )
        .all()
    )

    total_purchase_orders = len(
        purchase_orders
    )

    # --------------------------------------------------------
    # PURCHASE HISTORY SCORE
    # --------------------------------------------------------

    completed_purchase_orders = len(
        [
            po
            for po in purchase_orders
            if po.status == "Completed"
        ]
    )

    if total_purchase_orders > 0:

        purchase_history_score = (
            completed_purchase_orders
            / total_purchase_orders
        ) * 100

    else:

        purchase_history_score = 0

    # --------------------------------------------------------
    # DELIVERY PERFORMANCE
    # --------------------------------------------------------

    delivered_orders = [
        po
        for po in purchase_orders
        if po.status in [
            "Delivered",
            "Completed",
        ]
        and po.delivery_date is not None
        and po.actual_delivery_date is not None
    ]

    on_time_deliveries = [
        po
        for po in delivered_orders
        if po.actual_delivery_date
        <= po.delivery_date
    ]

    delayed_deliveries = [
        po
        for po in delivered_orders
        if po.actual_delivery_date
        > po.delivery_date
    ]

    total_delivered_orders = len(
        delivered_orders
    )

    if total_delivered_orders > 0:

        delivery_score = (
            len(on_time_deliveries)
            / total_delivered_orders
        ) * 100

    else:

        delivery_score = 0

    # --------------------------------------------------------
    # PERFORMANCE EVALUATION
    # --------------------------------------------------------

    performance_query = (
        db.query(
            models.VendorPerformance
        )
        .filter(
            models.VendorPerformance.vendor_id
            == vendor_id
        )
    )

    if current_user.role not in [
        SYSTEM_ADMIN,
        VENDOR,
    ]:

        performance_query = (
            performance_query
            .filter(
                models.VendorPerformance.company_id
                == current_user.company_id
            )
        )

    performance_records = (
        performance_query.all()
    )

    # --------------------------------------------------------
    # QUALITY SCORE
    # --------------------------------------------------------

    quality_values = [
        record.quality_score
        for record in performance_records
        if record.quality_score is not None
    ]

    if quality_values:

        quality_score = (
            sum(quality_values)
            / len(quality_values)
        )

    else:

        quality_score = 0

    # --------------------------------------------------------
    # CONTRACT & COMPLIANCE
    # --------------------------------------------------------

    today = (
        datetime.now(timezone.utc).date()
    )

    # ========================================================
    # CONTRACTS
    # ========================================================

    contracts = (
        db.query(models.Contract)
        .filter(
            models.Contract.vendor_id
            == vendor_id
        )
        .all()
    )

    total_contracts = len(contracts)

    active_contracts = len(
        [
            contract
            for contract in contracts
            if contract.status == "Active"
        ]
    )

    valid_contract_count = 0

    for contract in contracts:

        if contract.status != "Active":
            continue

        if (
            contract.start_date is not None
            and contract.start_date > today
        ):
            continue

        if (
            contract.end_date is not None
            and contract.end_date < today
        ):
            continue

        valid_contract_count += 1

    if total_contracts > 0:

        contract_score = (
            valid_contract_count
            / total_contracts
        ) * 100

    else:

        contract_score = 0

    # ========================================================
    # CERTIFICATIONS
    # ========================================================

    certifications = (
        db.query(models.Certification)
        .filter(
            models.Certification.vendor_id
            == vendor_id
        )
        .all()
    )

    total_certifications = len(
        certifications
    )

    valid_certification_count = 0

    for certification in certifications:

        if (
            certification.expiry_date is not None
            and certification.expiry_date < today
        ):
            continue

        if certification.status != "Valid":
            continue

        valid_certification_count += 1

    if total_certifications > 0:

        certification_score = (
            valid_certification_count
            / total_certifications
        ) * 100

    else:

        certification_score = 0

    # ========================================================
    # COMPLIANCE CHECKS
    # ========================================================

    compliance_checks = (
        db.query(
            models.ComplianceCheck
        )
        .filter(
            models.ComplianceCheck.vendor_id
            == vendor_id
        )
        .all()
    )

    total_compliance_checks = len(
        compliance_checks
    )

    passed_compliance_checks = len(
        [
            check
            for check in compliance_checks
            if check.status == "Passed"
        ]
    )

    if total_compliance_checks > 0:

        compliance_check_score = (
            passed_compliance_checks
            / total_compliance_checks
        ) * 100

    else:

        compliance_check_score = 0

    # ========================================================
    # FINAL COMPLIANCE SCORE
    # ========================================================

    compliance_score = (
        contract_score
        + certification_score
        + compliance_check_score
    ) / 3

    # --------------------------------------------------------
    # COMMUNICATION SCORE
    # --------------------------------------------------------

    communications = (
        db.query(models.Communication)
        .filter(
            models.Communication.related_vendor_id
            == vendor_id
        )
        .order_by(
            models.Communication.created_at.asc()
        )
        .all()
    )

    communication_count = len(
        communications
    )

    response_scores = []
    used_reply_ids = set()

    if vendor.user_id is not None:

        for message in communications:

            # Incoming message to vendor
            if (
                message.receiver_id
                == vendor.user_id
                and message.sender_id
                != vendor.user_id
            ):

                reply = None

                for possible_reply in communications:

                    if (
                        possible_reply.id
                        in used_reply_ids
                    ):
                        continue

                    if (
                        possible_reply.sender_id
                        == vendor.user_id
                        and possible_reply.receiver_id
                        == message.sender_id
                        and possible_reply.created_at
                        > message.created_at
                    ):

                        reply = possible_reply
                        break

                if reply is None:
                    continue

                used_reply_ids.add(
                    reply.id
                )

                response_seconds = (
                    reply.created_at
                    - message.created_at
                ).total_seconds()

                response_hours = (
                    response_seconds / 3600
                )

                if response_hours <= 4:

                    response_score = 100

                elif response_hours <= 24:

                    response_score = 70

                else:

                    response_score = 40

                response_scores.append(
                    response_score
                )

    if response_scores:

        communication_score = (
            sum(response_scores)
            / len(response_scores)
        )

    else:

        communication_score = 0

    # --------------------------------------------------------
    # ISSUE RESOLUTION SCORE
    # --------------------------------------------------------

    issues = (
        db.query(models.VendorIssue)
        .filter(
            models.VendorIssue.vendor_id
            == vendor_id
        )
        .all()
    )

    total_issues = len(issues)

    resolved_issues = len(
        [
            issue
            for issue in issues
            if issue.resolved_at is not None
        ]
    )

    issues_resolved_within_agreed_time = 0

    for issue in issues:

        if (
            issue.resolved_at is not None
            and issue.raised_at is not None
            and issue.agreed_resolution_hours
            is not None
        ):

            resolution_seconds = (
                issue.resolved_at
                - issue.raised_at
            ).total_seconds()

            resolution_hours = (
                resolution_seconds / 3600
            )

            if (
                resolution_hours
                <= issue.agreed_resolution_hours
            ):
                issues_resolved_within_agreed_time += 1

    if total_issues > 0:

        issue_resolution_score = (
            issues_resolved_within_agreed_time
            / total_issues
        ) * 100

    else:

        issue_resolution_score = 0

    # --------------------------------------------------------
    # FINAL RELIABILITY SCORE
    # --------------------------------------------------------

    reliability_score = (
        delivery_score * 0.25
        + quality_score * 0.25
        + communication_score * 0.10
        + compliance_score * 0.15
        + purchase_history_score * 0.10
        + issue_resolution_score * 0.15
    )

    reliability_score = round(
        reliability_score,
        2,
    )

    # --------------------------------------------------------
    # RISK LEVEL
    # --------------------------------------------------------

    if reliability_score >= 80:

        risk_level = "Low"

    elif reliability_score >= 60:

        risk_level = "Medium"

    else:

        risk_level = "High"

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "vendor_id": vendor.id,
        "vendor_name": vendor.company_name,

        "reliability_score":
            reliability_score,

        "risk_level":
            risk_level,

        "delivery_score":
            round(delivery_score, 2),

        "on_time_deliveries":
            len(on_time_deliveries),

        "delayed_deliveries":
            len(delayed_deliveries),

        "total_delivered_orders":
            total_delivered_orders,

        "quality_score":
            round(quality_score, 2),

        "compliance_score":
            round(compliance_score, 2),

        "communication_score":
            round(communication_score, 2),

        "communication_count":
            communication_count,

        "purchase_history_score":
            round(purchase_history_score, 2),

        "total_purchase_orders":
            total_purchase_orders,

        "completed_purchase_orders":
            completed_purchase_orders,

        "contract_score":
            round(contract_score, 2),

        "valid_contracts":
            valid_contract_count,

        "active_contracts":
            active_contracts,

        "total_contracts":
            total_contracts,

        "valid_certifications":
            valid_certification_count,

        "total_certifications":
            total_certifications,

        "passed_compliance_checks":
            passed_compliance_checks,

        "total_compliance_checks":
            total_compliance_checks,

        "issue_resolution_score":
            round(issue_resolution_score, 2),

        "total_issues":
            total_issues,

        "resolved_issues":
            resolved_issues,

        "issues_resolved_within_agreed_time":
            issues_resolved_within_agreed_time,
    }


# ============================================================
# PUBLIC VENDOR PLATFORM READS
# ============================================================

@app.get(
    "/public/vendor-platform/dashboard",
)
def get_public_vendor_platform_dashboard(
    db: Session = Depends(get_db),
):
    vendors = (
        db.query(models.Vendor)
        .order_by(models.Vendor.id.asc())
        .all()
    )
    purchase_orders = (
        db.query(models.PurchaseOrder)
        .order_by(models.PurchaseOrder.id.asc())
        .all()
    )
    performance = (
        db.query(models.VendorPerformance)
        .order_by(models.VendorPerformance.evaluated_at.asc())
        .all()
    )
    contracts = db.query(models.Contract).all()
    communications = db.query(models.Communication).all()

    platform_user = models.User(role=SYSTEM_ADMIN)
    reliability_scores = [
        get_vendor_reliability(vendor.id, db, platform_user)
        for vendor in vendors
    ]

    reliability_fields = [
        "reliability_score",
        "delivery_score",
        "quality_score",
        "compliance_score",
        "communication_score",
        "purchase_history_score",
        "issue_resolution_score",
    ]
    average_reliability = None

    if reliability_scores:
        average_reliability = {
            field: round(
                sum(float(score[field] or 0) for score in reliability_scores)
                / len(reliability_scores),
                2,
            )
            for field in reliability_fields
        }
        average_reliability["risk_level"] = (
            "Low" if average_reliability["reliability_score"] >= 80
            else "Medium" if average_reliability["reliability_score"] >= 60
            else "High"
        )

    performance_records = [
        {
            "id": record.id,
            "vendor_id": record.vendor_id,
            "rating": record.rating,
            "quality_score": record.quality_score,
            "evaluated_at": record.evaluated_at,
        }
        for record in performance
    ]
    latest_performance = performance_records[-1] if performance_records else None
    trend = [
        {
            "label": record["evaluated_at"].strftime("%b %Y") if record["evaluated_at"] else "Evaluation",
            "shortLabel": record["evaluated_at"].strftime("%b") if record["evaluated_at"] else "Score",
            "value": float(record["quality_score"] or (float(record["rating"] or 0) * 20)),
        }
        for record in performance_records
    ]

    monthly_orders = {}
    for order in purchase_orders:
        order_date = order.order_date
        if not order_date:
            continue
        month_key = order_date.strftime("%Y-%m")
        if month_key not in monthly_orders:
            monthly_orders[month_key] = {
                "key": month_key,
                "label": order_date.strftime("%b %Y"),
                "shortLabel": order_date.strftime("%b"),
                "value": 0,
            }
        monthly_orders[month_key]["value"] += 1

    return {
        "vendor": {"company_name": "All Vendors"},
        "reliability": average_reliability,
        "latestPerformance": latest_performance,
        "vendorTrend": trend,
        "activeContracts": sum(contract.status == "Active" for contract in contracts),
        "vendorRenewalContracts": sum(contract.status == "Renewal Pending" for contract in contracts),
        "vendorExpiredContracts": sum(contract.status == "Expired" for contract in contracts),
        "vendorActiveContracts": sum(contract.status == "Active" for contract in contracts),
        "contracts": [{"status": contract.status} for contract in contracts],
        "purchaseOrders": [
            {
                "id": order.id,
                "po_number": order.po_number,
                "vendor_id": order.vendor_id,
                "order_date": order.order_date,
                "created_at": None,
                "total_amount": order.total_amount,
                "status": order.status,
            }
            for order in purchase_orders
        ],
        "vendorOrderValue": sum(float(order.total_amount or 0) for order in purchase_orders),
        "vendorMonthlyOrders": sorted(monthly_orders.values(), key=lambda item: item["key"]),
        "communicationCount": len(communications),
        "unreadCommunications": sum(not message.is_read for message in communications),
        "vendorScores": [
            {
                "id": vendor.id,
                "shortName": vendor.company_name[:10] + "…" if len(vendor.company_name) > 12 else vendor.company_name,
                "delivery": score["delivery_score"],
                "quality": score["quality_score"],
                "communication": score["communication_score"],
                "compliance": score["compliance_score"],
            }
            for vendor, score in zip(vendors, reliability_scores)
        ],
    }


@app.get("/public/communications")
def get_public_communications(
    db: Session = Depends(get_db),
):
    messages = (
        db.query(models.Communication)
        .filter(models.Communication.related_vendor_id.isnot(None))
        .order_by(models.Communication.created_at.desc())
        .all()
    )

    user_ids = {
        user_id
        for item in messages
        for user_id in (item.sender_id, item.receiver_id)
    }
    vendor_ids = {item.related_vendor_id for item in messages}
    procurement_ids = {
        item.related_procurement_id
        for item in messages
        if item.related_procurement_id is not None
    }

    users = (
        db.query(models.User.id, models.User.name)
        .filter(models.User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    vendors = (
        db.query(models.Vendor.id, models.Vendor.company_name)
        .filter(models.Vendor.id.in_(vendor_ids))
        .all()
        if vendor_ids
        else []
    )
    procurements = (
        db.query(models.Procurement.id, models.Procurement.procurement_number)
        .filter(models.Procurement.id.in_(procurement_ids))
        .all()
        if procurement_ids
        else []
    )

    return {
        "messages": [
            {
                "id": item.id,
                "sender_id": item.sender_id,
                "receiver_id": item.receiver_id,
                "subject": item.subject,
                "message": item.message,
                "related_vendor_id": item.related_vendor_id,
                "related_procurement_id": item.related_procurement_id,
                "is_read": item.is_read,
                "created_at": item.created_at,
            }
            for item in messages
        ],
        "users": [{"id": user.id, "name": user.name} for user in users],
        "vendors": [
            {"id": vendor.id, "company_name": vendor.company_name}
            for vendor in vendors
        ],
        "procurements": [
            {"id": procurement.id, "procurement_number": procurement.procurement_number}
            for procurement in procurements
        ],
    }


@app.get(
    "/public/vendors",
    response_model=List[VendorResponse],
)
def get_public_vendors(
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Vendor)
        .order_by(models.Vendor.id.asc())
        .all()
    )


@app.get(
    "/public/purchase-orders",
    response_model=List[PurchaseOrderResponse],
)
def get_public_purchase_orders(
    db: Session = Depends(get_db),
):
    return (
        db.query(models.PurchaseOrder)
        .order_by(models.PurchaseOrder.id.desc())
        .all()
    )


@app.get(
    "/public/contracts",
    response_model=List[ContractResponse],
)
def get_public_contracts(
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Contract)
        .order_by(models.Contract.id.desc())
        .all()
    )


@app.get(
    "/public/vendors/{vendor_id}",
    response_model=VendorResponse,
)
def get_public_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.get(
    "/public/vendor-reliability/{vendor_id}",
    response_model=VendorReliabilityResponse,
)
def get_public_vendor_reliability(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    platform_user = models.User(role=SYSTEM_ADMIN)
    return get_vendor_reliability(vendor_id, db, platform_user)


@app.get("/public/vendors/{vendor_id}/status-history")
def get_public_vendor_status_history(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(models.VendorStatusHistory)
        .filter(models.VendorStatusHistory.vendor_id == vendor_id)
        .order_by(models.VendorStatusHistory.changed_at.desc())
        .all()
    )


@app.get(
    "/public/vendor-issues/{vendor_id}",
    response_model=List[VendorIssueResponse],
)
def get_public_vendor_issues(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(models.VendorIssue)
        .filter(models.VendorIssue.vendor_id == vendor_id)
        .order_by(models.VendorIssue.raised_at.desc())
        .all()
    )


# ============================================================
# CREATE VENDOR PROFILE
# ============================================================

@app.post(
    "/public/vendor-applications",
    response_model=VendorResponse,
)
def create_public_vendor_application(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
):
    if vendor.category not in VENDOR_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid vendor category",
        )

    existing_vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.email == vendor.email)
        .first()
    )

    if existing_vendor:
        raise HTTPException(
            status_code=400,
            detail="A vendor application already exists for this email",
        )

    new_vendor = models.Vendor(
        user_id=None,
        company_id=None,
        company_name=vendor.company_name,
        vendor_code=f"APP-{uuid.uuid4().hex[:12].upper()}",
        category=vendor.category,
        contact_person=vendor.contact_person,
        contact_designation=vendor.contact_designation,
        contact_department=vendor.contact_department,
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        tax_gst_id=vendor.tax_gst_id,
        payment_terms=vendor.payment_terms,
        products_services=vendor.products_services,
        notes=vendor.notes,
        status="Pending",
        onboarded_on=None,
    )

    db.add(new_vendor)
    db.flush()

    db.add(
        models.VendorApproval(
            vendor_id=new_vendor.id,
            approved_by=None,
            status="Pending",
            comments=None,
            approved_at=None,
        )
    )
    db.add(
        models.VendorStatusHistory(
            vendor_id=new_vendor.id,
            changed_by=None,
            from_status=None,
            to_status="Pending",
            comments="Application submitted through Vendor Platform",
        )
    )

    db.commit()
    db.refresh(new_vendor)

    return new_vendor


@app.post(
    "/vendors",
    response_model=VendorResponse,
)
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    if vendor.category not in VENDOR_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid vendor category",
        )

    new_vendor = models.Vendor(
        user_id=None,
        company_id=None,

        company_name=vendor.company_name,

        vendor_code=(
            f"TEMP-{uuid.uuid4().hex}"
        ),

        category=vendor.category,

        contact_person=vendor.contact_person,
        contact_designation=(
            vendor.contact_designation
        ),
        contact_department=(
            vendor.contact_department
        ),

        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,

        tax_gst_id=vendor.tax_gst_id,

        payment_terms=vendor.payment_terms,

        products_services=(
            vendor.products_services
        ),

        notes=vendor.notes,

        status="Pending",
        onboarded_on=None,
    )

    db.add(new_vendor)
    db.flush()

    existing_vendors = (
        db.query(
            models.Vendor.vendor_code
        )
        .filter(
            models.Vendor.vendor_code.like(
                "VEN-%"
            )
        )
        .all()
    )

    highest_number = 0

    for row in existing_vendors:

        code = row[0]

        try:

            number = int(
                code.replace(
                    "VEN-",
                    ""
                )
            )

            if number > highest_number:
                highest_number = number

        except (ValueError, TypeError):
            continue

    next_number = max(
        highest_number + 1,
        new_vendor.id,
    )

    new_vendor.vendor_code = (
        f"VEN-{next_number:05d}"
    )

    approval = models.VendorApproval(
        vendor_id=new_vendor.id,
        approved_by=None,
        status="Pending",
        comments=None,
        approved_at=None,
    )

    db.add(approval)

    history = models.VendorStatusHistory(
        vendor_id=new_vendor.id,
        changed_by=current_user.id,
        from_status=None,
        to_status="Pending",
        comments="Vendor registered",
    )

    db.add(history)

    db.commit()
    db.refresh(new_vendor)

    return new_vendor


# ============================================================
# UPDATE VENDOR PROFILE
# ============================================================

@app.put(
    "/vendors/{vendor_id}",
    response_model=VendorResponse,
)
def update_vendor(
    vendor_id: int,
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only update "
                    "your own vendor profile"
                ),
            )

    else:

        check_roles(
            current_user,
            [
                SYSTEM_ADMIN,
                PROCUREMENT_MANAGER,
                SUPPLY_CHAIN_MANAGER,
            ],
        )

    if vendor_data.category not in VENDOR_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid vendor category",
        )

    vendor.company_name = (
        vendor_data.company_name
    )

    vendor.category = (
        vendor_data.category
    )

    vendor.contact_person = (
        vendor_data.contact_person
    )

    vendor.contact_designation = (
        vendor_data.contact_designation
    )

    vendor.contact_department = (
        vendor_data.contact_department
    )

    vendor.email = vendor_data.email
    vendor.phone = vendor_data.phone
    vendor.address = vendor_data.address

    vendor.tax_gst_id = (
        vendor_data.tax_gst_id
    )

    vendor.payment_terms = (
        vendor_data.payment_terms
    )

    vendor.products_services = (
        vendor_data.products_services
    )

    vendor.notes = vendor_data.notes

    db.commit()
    db.refresh(vendor)

    return vendor


# ============================================================
# SYSTEM ADMIN - APPROVE / REJECT VENDOR
# ============================================================

@app.put(
    "/vendors/{vendor_id}/approval",
    response_model=VendorResponse,
)
def approve_or_reject_vendor(
    vendor_id: int,
    approval_data: VendorApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    require_system_admin(
        current_user
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    approval = (
        db.query(models.VendorApproval)
        .filter(
            models.VendorApproval.vendor_id
            == vendor.id
        )
        .order_by(
            models.VendorApproval.id.desc()
        )
        .first()
    )

    if not approval:

        approval = models.VendorApproval(
            vendor_id=vendor.id
        )

        db.add(approval)

    old_status = vendor.status

    approval.approved_by = (
        current_user.id
    )

    approval.status = (
        approval_data.status
    )

    approval.comments = (
        approval_data.comments
    )

    approval.approved_at = (
        datetime.now(timezone.utc)
    )

    if approval_data.status == "Active":

        vendor.status = "Active"

        if vendor.onboarded_on is None:

            vendor.onboarded_on = (
                datetime.now(
                    timezone.utc
                ).date()
            )

    else:

        vendor.status = "Rejected"

    history = models.VendorStatusHistory(
        vendor_id=vendor.id,
        changed_by=current_user.id,
        from_status=old_status,
        to_status=vendor.status,
        comments=approval_data.comments,
    )

    db.add(history)

    db.commit()
    db.refresh(vendor)

    return vendor


# ============================================================
# VENDOR STATUS HISTORY
# ============================================================

@app.get(
    "/vendors/{vendor_id}/status-history"
)
def get_vendor_status_history(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own status history"
                ),
            )

    history = (
        db.query(
            models.VendorStatusHistory
        )
        .filter(
            models.VendorStatusHistory.vendor_id
            == vendor_id
        )
        .order_by(
            models.VendorStatusHistory.changed_at.desc()
        )
        .all()
    )

    return [
        {
            "id": item.id,
            "vendor_id": item.vendor_id,
            "changed_by": item.changed_by,
            "from_status": item.from_status,
            "to_status": item.to_status,
            "comments": item.comments,
            "changed_at": item.changed_at,
        }
        for item in history
    ]


# ============================================================
# VENDOR ISSUES
# ============================================================

@app.get(
    "/vendor-issues/{vendor_id}",
    response_model=List[VendorIssueResponse],
)
def get_vendor_issues(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own issues"
                ),
            )

    return (
        db.query(models.VendorIssue)
        .filter(
            models.VendorIssue.vendor_id
            == vendor_id
        )
        .order_by(
            models.VendorIssue.raised_at.desc()
        )
        .all()
    )


@app.post(
    "/vendor-issues",
    response_model=VendorIssueResponse,
)
def create_vendor_issue(
    issue_data: VendorIssueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    if (
        issue_data.agreed_resolution_hours
        <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Agreed resolution hours "
                "must be greater than 0"
            ),
        )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == issue_data.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if issue_data.purchase_order_id is not None:

        purchase_order = (
            db.query(models.PurchaseOrder)
            .filter(
                models.PurchaseOrder.id
                == issue_data.purchase_order_id
            )
            .first()
        )

        if not purchase_order:

            raise HTTPException(
                status_code=404,
                detail="Purchase order not found",
            )

        if (
            purchase_order.vendor_id
            != vendor.id
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Purchase order does not "
                    "belong to this vendor"
                ),
            )

    new_issue = models.VendorIssue(
        vendor_id=issue_data.vendor_id,
        purchase_order_id=(
            issue_data.purchase_order_id
        ),
        title=issue_data.title,
        description=issue_data.description,
        status="Open",
        agreed_resolution_hours=(
            issue_data.agreed_resolution_hours
        ),
        created_by=current_user.id,
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


@app.put(
    "/vendor-issues/{issue_id}/status",
    response_model=VendorIssueResponse,
)
def update_vendor_issue_status(
    issue_id: int,
    status_data: VendorIssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    issue = (
        db.query(models.VendorIssue)
        .filter(
            models.VendorIssue.id == issue_id
        )
        .first()
    )

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Vendor issue not found",
        )

    issue.status = status_data.status

    if status_data.status in [
        "Resolved",
        "Closed",
    ]:

        if issue.resolved_at is None:

            issue.resolved_at = (
                datetime.now(
                    timezone.utc
                )
            )

    elif status_data.status in [
        "Open",
        "In Progress",
    ]:

        issue.resolved_at = None

    db.commit()
    db.refresh(issue)

    return issue


# ============================================================
# CERTIFICATIONS
# ============================================================

@app.get(
    "/certifications/{vendor_id}",
    response_model=List[CertificationResponse],
)
def get_certifications(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own certifications"
                ),
            )

    return (
        db.query(models.Certification)
        .filter(
            models.Certification.vendor_id
            == vendor_id
        )
        .order_by(
            models.Certification.id.desc()
        )
        .all()
    )


@app.post(
    "/certifications",
    response_model=CertificationResponse,
)
def create_certification(
    certification: CertificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == certification.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    certification_status = (
        certification.status
    )

    if (
        certification.expiry_date is not None
        and certification.expiry_date
        < datetime.now(timezone.utc).date()
    ):

        certification_status = "Expired"

    new_certification = models.Certification(
        vendor_id=certification.vendor_id,
        name=certification.name,
        issue_date=certification.issue_date,
        expiry_date=certification.expiry_date,
        status=certification_status,
        document_url=certification.document_url,
    )

    db.add(new_certification)
    db.commit()
    db.refresh(new_certification)

    return new_certification


# ============================================================
# COMPLIANCE CHECKS
# ============================================================

@app.get(
    "/compliance-checks/{vendor_id}",
    response_model=List[ComplianceCheckResponse],
)
def get_compliance_checks(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own compliance checks"
                ),
            )

    return (
        db.query(models.ComplianceCheck)
        .filter(
            models.ComplianceCheck.vendor_id
            == vendor_id
        )
        .order_by(
            models.ComplianceCheck.id.desc()
        )
        .all()
    )


@app.post(
    "/compliance-checks",
    response_model=ComplianceCheckResponse,
)
def create_compliance_check(
    check_data: ComplianceCheckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == check_data.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    new_check = models.ComplianceCheck(
        vendor_id=check_data.vendor_id,
        requirement=check_data.requirement,
        status=check_data.status,
        comments=check_data.comments,
        checked_by=current_user.id,
    )

    db.add(new_check)
    db.commit()
    db.refresh(new_check)

    return new_check


# ============================================================
# VENDOR DOCUMENTS
# ============================================================

@app.get(
    "/vendor-documents/{vendor_id}",
    response_model=List[VendorDocumentResponse],
)
def get_vendor_documents(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if current_user.role == VENDOR:

        if vendor.user_id != current_user.id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only view "
                    "your own documents"
                ),
            )

    documents = (
        db.query(models.VendorDocument)
        .filter(
            models.VendorDocument.vendor_id
            == vendor_id
        )
        .order_by(
            models.VendorDocument.id.desc()
        )
        .all()
    )

    today = (
        datetime.now(timezone.utc).date()
    )

    changed = False

    for document in documents:

        if (
            document.expiry_date is not None
            and document.expiry_date < today
            and document.status != "Expired"
        ):

            document.status = "Expired"
            changed = True

    if changed:
        db.commit()

    return documents


@app.post(
    "/vendor-documents",
    response_model=VendorDocumentResponse,
)
def create_vendor_document(
    document: VendorDocumentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == document.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    document_status = document.status

    if (
        document.expiry_date is not None
        and document.expiry_date
        < datetime.now(timezone.utc).date()
    ):

        document_status = "Expired"

    new_document = models.VendorDocument(
        vendor_id=document.vendor_id,
        name=document.name,
        document_type=document.document_type,
        document_url=document.document_url,
        expiry_date=document.expiry_date,
        status=document_status,
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return new_document


# ============================================================
# PROCUREMENT MANAGEMENT
# ============================================================

@app.get(
    "/procurements",
    response_model=List[ProcurementResponse],
)
def get_procurements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
        ],
    )

    return (
        db.query(models.Procurement)
        .order_by(
            models.Procurement.id.desc()
        )
        .all()
    )


@app.get(
    "/procurements/{procurement_id}",
    response_model=ProcurementResponse,
)
def get_procurement(
    procurement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
        ],
    )

    procurement = (
        db.query(models.Procurement)
        .filter(
            models.Procurement.id
            == procurement_id
        )
        .first()
    )

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail=(
                "Procurement request not found"
            ),
        )

    return procurement


@app.post("/procurements", response_model=ProcurementResponse)
def create_procurement(
    procurement: ProcurementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    # ========================================================
    # COMPANY
    # ========================================================
    #
    # System Administrator may not have a company_id.
    # Company users use their own company.
    #
    if current_user.role == SYSTEM_ADMIN:
        company_id = current_user.company_id
    else:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=400,
                detail="User is not associated with a company",
            )

        company_id = current_user.company_id

    # ========================================================
    # OPTIONAL VENDOR VALIDATION
    # ========================================================
    #
    # Vendor is NOT required when creating a Procurement.
    # If a vendor_id is supplied, validate it.
    #
    vendor_id = None

    if procurement.vendor_id is not None:
        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id == procurement.vendor_id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found",
            )

        if vendor.status != "Active":
            raise HTTPException(
                status_code=400,
                detail="Selected vendor is not active",
            )

        vendor_id = vendor.id

    # ========================================================
    # PROCUREMENT NUMBER
    # ========================================================

    last_procurement = (
        db.query(models.Procurement)
        .order_by(models.Procurement.id.desc())
        .first()
    )

    next_number = (
        last_procurement.id + 1
        if last_procurement
        else 1
    )

    procurement_number = (
        f"PR-{next_number:05d}"
    )

    # ========================================================
    # CREATE PROCUREMENT
    # ========================================================

    new_procurement = models.Procurement(
        company_id=company_id,
        vendor_id=vendor_id,
        procurement_number=procurement_number,
        title=procurement.title,
        description=procurement.description,
        created_by=current_user.id,
        status="Pending",
        quantity=procurement.quantity,
        unit_price=procurement.unit_price,
        needed_date=procurement.needed_date,
        priority=procurement.priority,
    )

    db.add(new_procurement)
    db.commit()
    db.refresh(new_procurement)

    return new_procurement

# ============================================================
# PROCUREMENT STATUS
# ============================================================

@app.put(
    "/procurements/{procurement_id}/status",
    response_model=ProcurementResponse,
)
def update_procurement_status(
    procurement_id: int,
    status_data: ProcurementStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    if status_data.status not in PROCUREMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid procurement status",
        )

    procurement = (
        db.query(models.Procurement)
        .filter(
            models.Procurement.id
            == procurement_id
        )
        .first()
    )

    if not procurement:
        raise HTTPException(
            status_code=404,
            detail="Procurement request not found",
        )

    ensure_same_company(
        current_user,
        procurement.company_id,
    )

    # ========================================================
    # APPROVED
    # ========================================================
    #
    # Approval does NOT create a Purchase Order.
    # The user clicks "Place Order" after approval.
    # ========================================================

    if status_data.status == "Approved":

        if procurement.status != "Pending":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only Pending procurement requests "
                    "can be approved"
                ),
            )

        procurement.status = "Approved"

    # ========================================================
    # ORDERED
    # ========================================================
    #
    # Ordered is normally set by the Purchase Order creation
    # endpoint after the user clicks "Place Order".
    #
    # Keep this endpoint from creating another PO.
    # ========================================================

    elif status_data.status == "Ordered":

        linked_po = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.procurement_id
                == procurement.id
            )
            .first()
        )

        if not linked_po:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Create the Purchase Order using "
                    "Place Order before changing the "
                    "procurement to Ordered"
                ),
            )

        procurement.status = "Ordered"

    # ========================================================
    # DELIVERED
    # ========================================================

    elif status_data.status == "Delivered":

        procurement.status = "Delivered"

        linked_po = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.procurement_id
                == procurement.id
            )
            .first()
        )

        if linked_po:

            linked_po.status = "Delivered"

            if (
                linked_po.actual_delivery_date
                is None
            ):
                linked_po.actual_delivery_date = (
                    datetime.now(
                        timezone.utc
                    ).date()
                )

    # ========================================================
    # COMPLETED
    # ========================================================

    elif status_data.status == "Completed":

        procurement.status = "Completed"

        linked_po = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.procurement_id
                == procurement.id
            )
            .first()
        )

        if linked_po:
            linked_po.status = "Completed"

    # ========================================================
    # CANCELLED
    # ========================================================

    elif status_data.status == "Cancelled":

        procurement.status = "Cancelled"

        linked_po = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.procurement_id
                == procurement.id
            )
            .first()
        )

        if linked_po:
            linked_po.status = "Cancelled"

    # ========================================================
    # PENDING
    # ========================================================

    elif status_data.status == "Pending":

        procurement.status = "Pending"

    db.commit()

    db.refresh(procurement)

    return procurement

# ============================================================
# REPAIR OLD ORDERED PROCUREMENTS
# ============================================================

@app.post(
    "/procurements/repair-ordered-pos"
)
def repair_ordered_procurement_pos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
        ],
    )

    ordered_procurements = (
        db.query(models.Procurement)
        .filter(
            models.Procurement.status
            == "Ordered"
        )
        .all()
    )

    created_pos = []

    for procurement in ordered_procurements:

        # ----------------------------------------------------
        # CHECK EXISTING PO
        # ----------------------------------------------------

        existing_po = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.procurement_id
                == procurement.id
            )
            .first()
        )

        if existing_po:
            continue

        if not procurement.vendor_id:
            continue

        # ----------------------------------------------------
        # FIND VENDOR
        # ----------------------------------------------------

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id
                == procurement.vendor_id
            )
            .first()
        )

        if not vendor:
            continue

        if vendor.status != "Active":
            continue

        # ----------------------------------------------------
        # PO NUMBER
        # ----------------------------------------------------

        count = (
            db.query(
                models.PurchaseOrder
            )
            .count()
        )

        po_number = (
            f"PO-{count + 1:05d}"
        )

        # ----------------------------------------------------
        # CREATE PO
        # ----------------------------------------------------

        new_po = models.PurchaseOrder(
            company_id=None,

            po_number=po_number,

            vendor_id=(
                procurement.vendor_id
            ),

            procurement_id=(
                procurement.id
            ),

            created_by=current_user.id,

            order_date=(
                datetime.now(
                    timezone.utc
                ).date()
            ),

            delivery_date=(
                procurement.needed_date
            ),

            total_amount=(
                procurement.quantity
                * procurement.unit_price
            ),

            status="Ordered",
        )

        db.add(new_po)

        db.flush()

        # IMPORTANT:
        # Use new_po.id here.
        new_item = models.PurchaseOrderItem(
            purchase_order_id=new_po.id,

            item_name=procurement.title,

            description=procurement.description,

            quantity=procurement.quantity,

            unit_price=procurement.unit_price,

            total_price=(
                procurement.quantity
                * procurement.unit_price
            ),
        )

        db.add(new_item)

        created_pos.append(
            po_number
        )

    db.commit()

    return {
        "message": "Repair completed",
        "purchase_orders_created":
            created_pos,
        "count":
            len(created_pos),
    }


# ============================================================
# PURCHASE ORDERS
# ============================================================

@app.get(
    "/purchase-orders",
    response_model=List[PurchaseOrderResponse],
)
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    # Vendor sees own POs.
    if current_user.role == VENDOR:

        return (
            db.query(
                models.PurchaseOrder
            )
            .join(
                models.Vendor,
                models.PurchaseOrder.vendor_id
                == models.Vendor.id,
            )
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .order_by(
                models.PurchaseOrder.id.desc()
            )
            .all()
        )

    # Internal users see all POs.
    return (
        db.query(
            models.PurchaseOrder
        )
        .order_by(
            models.PurchaseOrder.id.desc()
        )
        .all()
    )


@app.get(
    "/purchase-orders/{purchase_order_id}",
    response_model=PurchaseOrderResponse,
)
def get_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    purchase_order = (
        db.query(
            models.PurchaseOrder
        )
        .filter(
            models.PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id
                == purchase_order.vendor_id
            )
            .first()
        )

        if (
            not vendor
            or vendor.user_id
            != current_user.id
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have access "
                    "to this purchase order"
                ),
            )

    return purchase_order


# ============================================================
# MANUAL PURCHASE ORDER
# ============================================================

@app.post(
    "/purchase-orders",
    response_model=PurchaseOrderResponse,
)
def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # ============================================================
    # PERMISSIONS
    # ============================================================

    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    # ============================================================
    # FIND VENDOR
    # ============================================================

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == purchase_order.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if vendor.status != "Active":
        raise HTTPException(
            status_code=400,
            detail="Only active vendors can be assigned",
        )

    # ============================================================
    # OPTIONAL PROCUREMENT
    # ============================================================

    procurement = None

    if purchase_order.procurement_id is not None:

        procurement = (
            db.query(models.Procurement)
            .filter(
                models.Procurement.id
                == purchase_order.procurement_id
            )
            .first()
        )

        if not procurement:
            raise HTTPException(
                status_code=404,
                detail="Procurement request not found",
            )

        # Only Approved procurement can be converted
        # into a purchase order.
        if procurement.status != "Approved":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Purchase order can only be linked "
                    "to an Approved procurement request"
                ),
            )

        ensure_same_company(
            current_user,
            procurement.company_id,
        )

    # ============================================================
    # COMPANY
    # ============================================================

    if procurement:
        company_id = procurement.company_id
    else:
        company_id = current_user.company_id

    # ============================================================
    # VALIDATE ITEMS
    # ============================================================

    if not purchase_order.items:
        raise HTTPException(
            status_code=400,
            detail="At least one purchase order item is required",
        )

    calculated_total = 0

    for item in purchase_order.items:

        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Item quantity must be greater than zero",
            )

        if item.unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Item unit price cannot be negative",
            )

        calculated_total += (
            item.quantity * item.unit_price
        )

    # ============================================================
    # GENERATE PO NUMBER
    # ============================================================

    last_po = (
        db.query(models.PurchaseOrder)
        .order_by(
            models.PurchaseOrder.id.desc()
        )
        .first()
    )

    next_number = (
        last_po.id + 1
        if last_po
        else 1
    )

    po_number = f"PO-{next_number:05d}"

    # ============================================================
    # CREATE PURCHASE ORDER
    # ============================================================

    new_purchase_order = models.PurchaseOrder(
        company_id=company_id,
        po_number=po_number,
        vendor_id=purchase_order.vendor_id,
        procurement_id=purchase_order.procurement_id,
        created_by=current_user.id,
        order_date=purchase_order.order_date,
        delivery_date=purchase_order.delivery_date,
        payment_terms=(
            purchase_order.payment_terms
            or "Net 15"
        ),
        total_amount=calculated_total,
        status="Ordered",
    )

    db.add(new_purchase_order)

    db.flush()

    # ============================================================
    # CREATE PO ITEMS
    # ============================================================

    for item in purchase_order.items:

        item_total = (
            item.quantity
            * item.unit_price
        )

        new_item = models.PurchaseOrderItem(
            purchase_order_id=new_purchase_order.id,
            item_name=item.item_name,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item_total,
        )

        db.add(new_item)

    # ============================================================
    # UPDATE LINKED PROCUREMENT
    # ============================================================

    if procurement:

        procurement.vendor_id = (
            purchase_order.vendor_id
        )

        procurement.status = "Ordered"

    # ============================================================
    # SAVE
    # ============================================================

    db.commit()

    db.refresh(new_purchase_order)

    return new_purchase_order


# ============================================================
# PURCHASE ORDER STATUS
# ============================================================

@app.put(
    "/purchase-orders/{purchase_order_id}/status",
    response_model=PurchaseOrderResponse,
)
def update_purchase_order_status(
    purchase_order_id: int,
    status_data: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    if status_data.status not in PURCHASE_ORDER_STATUSES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid purchase order status"
            ),
        )

    purchase_order = (
        db.query(
            models.PurchaseOrder
        )
        .filter(
            models.PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    purchase_order.status = (
        status_data.status
    )

    # Record actual delivery date.
    if status_data.status == "Delivered":

        purchase_order.actual_delivery_date = (
            status_data.actual_delivery_date
            or datetime.now(
                timezone.utc
            ).date()
        )

    db.commit()

    db.refresh(purchase_order)

    return purchase_order


# ============================================================
# PURCHASE ORDER ITEMS
# ============================================================

@app.get(
    "/purchase-orders/{purchase_order_id}/items",
    response_model=List[PurchaseOrderItemResponse],
)
def get_purchase_order_items(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    purchase_order = (
        db.query(
            models.PurchaseOrder
        )
        .filter(
            models.PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id
                == purchase_order.vendor_id
            )
            .first()
        )

        if (
            not vendor
            or vendor.user_id
            != current_user.id
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have access "
                    "to this purchase order"
                ),
            )

    return (
        db.query(
            models.PurchaseOrderItem
        )
        .filter(
            models.PurchaseOrderItem.purchase_order_id
            == purchase_order_id
        )
        .all()
    )


def _purchase_order_request_payload(request, db):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == request.assigned_vendor_id)
        .first()
        if request.assigned_vendor_id
        else None
    )
    purchase_order = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.id == request.purchase_order_id)
        .first()
        if request.purchase_order_id
        else None
    )

    return {
        "id": request.id,
        "request_number": request.request_number,
        "created_by": request.created_by,
        "assigned_vendor_id": request.assigned_vendor_id,
        "assigned_vendor_name": vendor.company_name if vendor else None,
        "purchase_order_id": request.purchase_order_id,
        "po_number": purchase_order.po_number if purchase_order else None,
        "order_date": request.order_date,
        "delivery_date": request.delivery_date,
        "payment_terms": request.payment_terms,
        "total_amount": request.total_amount,
        "status": request.status,
        "created_at": request.created_at,
        "items": (
            db.query(models.PurchaseOrderRequestItem)
            .filter(models.PurchaseOrderRequestItem.request_id == request.id)
            .order_by(models.PurchaseOrderRequestItem.id.asc())
            .all()
        ),
    }


@app.post(
    "/purchase-order-requests",
    response_model=PurchaseOrderRequestResponse,
)
def create_purchase_order_request(
    request_data: PurchaseOrderRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_roles(current_user, [SYSTEM_ADMIN, PROCUREMENT_MANAGER])

    if not request_data.items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    calculated_total = 0
    for item in request_data.items:
        if item.quantity <= 0 or item.unit_price < 0 or not item.item_name.strip():
            raise HTTPException(status_code=400, detail="Enter valid item, quantity and price values")
        calculated_total += item.quantity * item.unit_price

    last_request = (
        db.query(models.PurchaseOrderRequest)
        .order_by(models.PurchaseOrderRequest.id.desc())
        .first()
    )
    request_number = f"REQ-{(last_request.id + 1) if last_request else 1:05d}"

    new_request = models.PurchaseOrderRequest(
        request_number=request_number,
        created_by=current_user.id,
        order_date=request_data.order_date,
        delivery_date=request_data.delivery_date,
        payment_terms=request_data.payment_terms or "Net 15",
        total_amount=calculated_total,
        status="Open",
    )
    db.add(new_request)
    db.flush()

    for item in request_data.items:
        db.add(
            models.PurchaseOrderRequestItem(
                request_id=new_request.id,
                item_name=item.item_name.strip(),
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.quantity * item.unit_price,
            )
        )

    db.commit()
    db.refresh(new_request)
    return _purchase_order_request_payload(new_request, db)


@app.get(
    "/purchase-order-requests",
    response_model=List[PurchaseOrderRequestResponse],
)
def get_purchase_order_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_roles(current_user, [SYSTEM_ADMIN, PROCUREMENT_MANAGER])

    query = db.query(models.PurchaseOrderRequest)
    if current_user.role != SYSTEM_ADMIN:
        query = query.filter(
            models.PurchaseOrderRequest.created_by == current_user.id
        )

    requests = query.order_by(models.PurchaseOrderRequest.id.desc()).all()
    return [_purchase_order_request_payload(request, db) for request in requests]


@app.get(
    "/public/purchase-order-requests",
    response_model=List[PurchaseOrderRequestResponse],
)
def get_public_purchase_order_requests(
    db: Session = Depends(get_db),
):
    requests = (
        db.query(models.PurchaseOrderRequest)
        .filter(models.PurchaseOrderRequest.status == "Open")
        .order_by(models.PurchaseOrderRequest.id.desc())
        .all()
    )
    return [_purchase_order_request_payload(request, db) for request in requests]


@app.post(
    "/public/purchase-order-requests/{request_id}/assign",
    response_model=PurchaseOrderResponse,
)
def assign_vendor_to_purchase_order_request(
    request_id: int,
    assignment: PurchaseOrderRequestVendorAssignment,
    db: Session = Depends(get_db),
):
    request = (
        db.query(models.PurchaseOrderRequest)
        .filter(models.PurchaseOrderRequest.id == request_id)
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request order not found")
    if request.status != "Open":
        raise HTTPException(status_code=409, detail="Request order has already been assigned")

    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == assignment.vendor_id)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if vendor.status != "Active":
        raise HTTPException(status_code=400, detail="Only active vendors can be assigned")

    last_order = (
        db.query(models.PurchaseOrder)
        .order_by(models.PurchaseOrder.id.desc())
        .first()
    )
    po_number = f"PO-{(last_order.id + 1) if last_order else 1:05d}"

    purchase_order = models.PurchaseOrder(
        company_id=None,
        po_number=po_number,
        vendor_id=vendor.id,
        procurement_id=None,
        created_by=request.created_by,
        order_date=request.order_date,
        delivery_date=request.delivery_date,
        payment_terms=request.payment_terms,
        total_amount=request.total_amount,
        status="Ordered",
    )
    db.add(purchase_order)
    db.flush()

    request_items = (
        db.query(models.PurchaseOrderRequestItem)
        .filter(models.PurchaseOrderRequestItem.request_id == request.id)
        .order_by(models.PurchaseOrderRequestItem.id.asc())
        .all()
    )
    for item in request_items:
        db.add(
            models.PurchaseOrderItem(
                purchase_order_id=purchase_order.id,
                item_name=item.item_name,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
        )

    request.assigned_vendor_id = vendor.id
    request.purchase_order_id = purchase_order.id
    request.status = "Assigned"

    db.commit()
    db.refresh(purchase_order)
    return purchase_order


# ============================================================
# CONTRACTS
# ============================================================

@app.get(
    "/contracts",
    response_model=List[ContractResponse],
)
def get_contracts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    if current_user.role == SYSTEM_ADMIN:

        return (
            db.query(models.Contract)
            .all()
        )

    if current_user.role == VENDOR:

        return (
            db.query(models.Contract)
            .join(
                models.Vendor,
                models.Contract.vendor_id
                == models.Vendor.id,
            )
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .all()
        )

    return (
        db.query(models.Contract)
        .filter(
            models.Contract.company_id
            == current_user.company_id
        )
        .all()
    )


@app.get(
    "/contracts/{contract_id}",
    response_model=ContractResponse,
)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    contract = (
        db.query(models.Contract)
        .filter(
            models.Contract.id
            == contract_id
        )
        .first()
    )

    if not contract:

        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id
                == contract.vendor_id
            )
            .first()
        )

        if (
            not vendor
            or vendor.user_id
            != current_user.id
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have access "
                    "to this contract"
                ),
            )

    else:

        ensure_same_company(
            current_user,
            contract.company_id,
        )

    return contract


@app.post(
    "/contracts",
    response_model=ContractResponse,
)
def create_contract(
    contract_data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == contract_data.vendor_id
        )
        .first()
    )

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if vendor.status != "Active":

        raise HTTPException(
            status_code=400,
            detail=(
                "Only approved/active vendors "
                "can have contracts"
            ),
        )

    existing_contract = (
        db.query(models.Contract)
        .filter(
            models.Contract.contract_number
            == contract_data.contract_number
        )
        .first()
    )

    if existing_contract:

        raise HTTPException(
            status_code=400,
            detail=(
                "Contract number already exists"
            ),
        )

    new_contract = models.Contract(
        company_id=None,

        vendor_id=(
            contract_data.vendor_id
        ),

        contract_number=(
            contract_data.contract_number
        ),

        title=contract_data.title,

        start_date=(
            contract_data.start_date
        ),

        end_date=(
            contract_data.end_date
        ),

        amount=contract_data.amount,

        document_url=(
            contract_data.document_url
        ),

        status="Active",
    )

    db.add(new_contract)

    db.commit()

    db.refresh(new_contract)

    return new_contract


@app.put(
    "/contracts/{contract_id}",
    response_model=ContractResponse,
)
def update_contract(
    contract_id: int,
    contract_data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
        ],
    )

    contract = (
        db.query(models.Contract)
        .filter(
            models.Contract.id
            == contract_id
        )
        .first()
    )

    if not contract:

        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    ensure_same_company(
        current_user,
        contract.company_id,
    )

    contract.vendor_id = (
        contract_data.vendor_id
    )

    contract.contract_number = (
        contract_data.contract_number
    )

    contract.title = (
        contract_data.title
    )

    contract.start_date = (
        contract_data.start_date
    )

    contract.end_date = (
        contract_data.end_date
    )

    contract.amount = (
        contract_data.amount
    )

    contract.document_url = (
        contract_data.document_url
    )

    db.commit()

    db.refresh(contract)

    return contract


@app.put(
    "/contracts/{contract_id}/status",
    response_model=ContractResponse,
)
def update_contract_status(
    contract_id: int,
    status_data: ContractStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            FINANCE_OFFICER,
        ],
    )

    if status_data.status not in CONTRACT_STATUSES:

        raise HTTPException(
            status_code=400,
            detail="Invalid contract status",
        )

    contract = (
        db.query(models.Contract)
        .filter(
            models.Contract.id
            == contract_id
        )
        .first()
    )

    if not contract:

        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    ensure_same_company(
        current_user,
        contract.company_id,
    )

    contract.status = (
        status_data.status
    )

    db.commit()

    db.refresh(contract)

    return contract


# ============================================================
# COMMUNICATION
# ============================================================

@app.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        ALL_ROLES,
    )

    if current_user.role == SYSTEM_ADMIN:

        users = (
            db.query(models.User)
            .filter(
                models.User.id
                != current_user.id
            )
            .all()
        )

    elif current_user.role == VENDOR:

        messages = (
            db.query(
                models.Communication
            )
            .filter(
                or_(
                    models.Communication.sender_id
                    == current_user.id,

                    models.Communication.receiver_id
                    == current_user.id,
                )
            )
            .all()
        )

        user_ids = set()

        for message in messages:

            user_ids.add(
                message.sender_id
            )

            user_ids.add(
                message.receiver_id
            )

        user_ids.discard(
            current_user.id
        )

        if not user_ids:
            return []

        users = (
            db.query(models.User)
            .filter(
                models.User.id.in_(
                    user_ids
                )
            )
            .all()
        )

    else:

        users = (
            db.query(models.User)
            .filter(
                models.User.company_id
                == current_user.company_id,

                models.User.id
                != current_user.id,
            )
            .all()
        )

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company_id": user.company_id,
        }
        for user in users
    ]


@app.get(
    "/communications",
    response_model=List[CommunicationResponse],
)
def get_communications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    messages = (
        db.query(
            models.Communication
        )
        .filter(
            or_(
                models.Communication.sender_id
                == current_user.id,

                models.Communication.receiver_id
                == current_user.id,
            )
        )
        .order_by(
            models.Communication.created_at.desc()
        )
        .all()
    )

    return messages


@app.post(
    "/communications",
    response_model=CommunicationResponse,
)
def send_communication(
    communication: CommunicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    if (
        communication.receiver_id
        == current_user.id
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot send "
                "a message to yourself"
            ),
        )

    receiver = (
        db.query(models.User)
        .filter(
            models.User.id
            == communication.receiver_id
        )
        .first()
    )

    if not receiver:

        raise HTTPException(
            status_code=404,
            detail="Receiver not found",
        )

    # Internal company users can communicate
    # within company and with vendors.
    if (
        current_user.role != SYSTEM_ADMIN
        and current_user.role != VENDOR
        and receiver.role != VENDOR
    ):

        if (
            receiver.company_id
            != current_user.company_id
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only communicate "
                    "with users in your company"
                ),
            )

    company_id = (
        current_user.company_id
    )

    if current_user.role == VENDOR:

        if receiver.role != VENDOR:

            company_id = (
                receiver.company_id
            )

    elif receiver.role == VENDOR:

        company_id = (
            current_user.company_id
        )

    new_message = models.Communication(
        sender_id=current_user.id,

        receiver_id=(
            communication.receiver_id
        ),

        company_id=company_id,

        subject=communication.subject,

        message=communication.message,

        related_vendor_id=(
            communication.related_vendor_id
        ),

        related_procurement_id=(
            communication.related_procurement_id
        ),

        is_read=False,
    )

    db.add(new_message)

    db.commit()

    db.refresh(new_message)

    return new_message


@app.put(
    "/communications/{communication_id}/read",
    response_model=CommunicationResponse,
)
def update_message_read_status(
    communication_id: int,
    read_data: CommunicationReadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    message = (
        db.query(
            models.Communication
        )
        .filter(
            models.Communication.id
            == communication_id
        )
        .first()
    )

    if not message:

        raise HTTPException(
            status_code=404,
            detail="Message not found",
        )

    if (
        message.receiver_id
        != current_user.id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only update "
                "messages sent to you"
            ),
        )

    message.is_read = (
        read_data.is_read
    )

    db.commit()

    db.refresh(message)

    return message


# ============================================================
# INVOICES
# ============================================================

@app.get(
    "/invoices",
    response_model=List[InvoiceResponse],
)
def get_invoices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR,
        ],
    )

    if current_user.role == SYSTEM_ADMIN:

        return (
            db.query(
                models.Invoice
            )
            .all()
        )

    if current_user.role == VENDOR:

        return (
            db.query(
                models.Invoice
            )
            .join(
                models.Vendor,
                models.Invoice.vendor_id
                == models.Vendor.id,
            )
            .filter(
                models.Vendor.user_id
                == current_user.id
            )
            .all()
        )

    return (
        db.query(
            models.Invoice
        )
        .join(
            models.PurchaseOrder,
            models.Invoice.purchase_order_id
            == models.PurchaseOrder.id,
        )
        .filter(
            models.PurchaseOrder.company_id
            == current_user.company_id
        )
        .all()
    )


@app.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    invoice = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.id
            == invoice_id
        )
        .first()
    )

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    if current_user.role == VENDOR:

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id
                == invoice.vendor_id
            )
            .first()
        )

        if (
            not vendor
            or vendor.user_id
            != current_user.id
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have access "
                    "to this invoice"
                ),
            )

    else:

        purchase_order = (
            db.query(
                models.PurchaseOrder
            )
            .filter(
                models.PurchaseOrder.id
                == invoice.purchase_order_id
            )
            .first()
        )

        if not purchase_order:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Related purchase order "
                    "not found"
                ),
            )

        ensure_same_company(
            current_user,
            purchase_order.company_id,
        )

    return invoice


@app.post(
    "/invoices",
    response_model=InvoiceResponse,
)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            PROCUREMENT_MANAGER,
            FINANCE_OFFICER,
        ],
    )

    purchase_order = (
        db.query(
            models.PurchaseOrder
        )
        .filter(
            models.PurchaseOrder.id
            == invoice_data.purchase_order_id
        )
        .first()
    )

    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    ensure_same_company(
        current_user,
        purchase_order.company_id,
    )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id
            == invoice_data.vendor_id
        )
        .first()
    )

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    if vendor.status != "Active":

        raise HTTPException(
            status_code=400,
            detail="Vendor is not active",
        )

    if (
        purchase_order.vendor_id
        != vendor.id
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Vendor does not belong "
                "to this purchase order"
            ),
        )

    existing_invoice = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.invoice_number
            == invoice_data.invoice_number
        )
        .first()
    )

    if existing_invoice:

        raise HTTPException(
            status_code=400,
            detail="Invoice number already exists",
        )

    new_invoice = models.Invoice(
        invoice_number=(
            invoice_data.invoice_number
        ),

        purchase_order_id=(
            invoice_data.purchase_order_id
        ),

        vendor_id=(
            invoice_data.vendor_id
        ),

        invoice_date=(
            invoice_data.invoice_date
        ),

        due_date=(
            invoice_data.due_date
        ),

        amount=(
            invoice_data.amount
        ),

        document_url=(
            invoice_data.document_url
        ),

        status="Pending",
    )

    db.add(new_invoice)

    db.commit()

    db.refresh(new_invoice)

    return new_invoice


@app.put(
    "/invoices/{invoice_id}/status",
    response_model=InvoiceResponse,
)
def update_invoice_status(
    invoice_id: int,
    status_data: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    check_roles(
        current_user,
        [
            SYSTEM_ADMIN,
            COMPANY_ADMIN,
            FINANCE_OFFICER,
        ],
    )

    if (
        status_data.status
        not in INVOICE_STATUSES
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid invoice status",
        )

    invoice = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.id
            == invoice_id
        )
        .first()
    )

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    purchase_order = (
        db.query(
            models.PurchaseOrder
        )
        .filter(
            models.PurchaseOrder.id
            == invoice.purchase_order_id
        )
        .first()
    )

    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail=(
                "Related purchase order "
                "not found"
            ),
        )

    ensure_same_company(
        current_user,
        purchase_order.company_id,
    )

    invoice.status = (
        status_data.status
    )

    db.commit()

    db.refresh(invoice)

    return invoice