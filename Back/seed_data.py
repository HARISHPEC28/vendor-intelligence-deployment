from datetime import date, datetime, timezone, timedelta

from sqlalchemy.orm import Session

from database import engine
import models


def get_or_none(db: Session, query):
    return query.first()


def get_user(db: Session, email: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise RuntimeError(f"Required user not found: {email}")
    return user


def get_vendor(db: Session, code: str):
    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_code == code).first()
    if not vendor:
        raise RuntimeError(f"Required vendor not found: {code}")
    return vendor


def upsert_procurement(db, number, vendor_id, title, description, status, quantity, unit_price, needed_date, created_by):
    p = db.query(models.Procurement).filter(models.Procurement.procurement_number == number).first()
    if not p:
        p = models.Procurement(
            company_id=None,
            vendor_id=vendor_id,
            procurement_number=number,
            title=title,
            description=description,
            created_by=created_by,
            status=status,
            quantity=quantity,
            unit_price=unit_price,
            needed_date=needed_date,
        )
        db.add(p)
        db.flush()
    else:
        p.vendor_id = vendor_id
        p.title = title
        p.description = description
        p.created_by = created_by
        p.status = status
        p.quantity = quantity
        p.unit_price = unit_price
        p.needed_date = needed_date
    return p


def upsert_po(db, number, vendor_id, procurement_id, created_by, order_date, delivery_date, actual_date, total_amount, status, item_name, quantity, unit_price):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == number).first()
    if not po:
        po = models.PurchaseOrder(
            company_id=None,
            po_number=number,
            vendor_id=vendor_id,
            procurement_id=procurement_id,
            created_by=created_by,
            order_date=order_date,
            delivery_date=delivery_date,
            actual_delivery_date=actual_date,
            total_amount=total_amount,
            status=status,
        )
        db.add(po)
        db.flush()
    else:
        po.vendor_id = vendor_id
        po.procurement_id = procurement_id
        po.created_by = created_by
        po.order_date = order_date
        po.delivery_date = delivery_date
        po.actual_delivery_date = actual_date
        po.total_amount = total_amount
        po.status = status

    item = (
        db.query(models.PurchaseOrderItem)
        .filter(models.PurchaseOrderItem.purchase_order_id == po.id)
        .first()
    )
    if not item:
        item = models.PurchaseOrderItem(
            purchase_order_id=po.id,
            item_name=item_name,
            description=f"Seeded item for {number}",
            quantity=quantity,
            unit_price=unit_price,
            total_price=quantity * unit_price,
        )
        db.add(item)
    else:
        item.item_name = item_name
        item.quantity = quantity
        item.unit_price = unit_price
        item.total_price = quantity * unit_price
    return po


def add_performance(db, company_id, vendor_id, quality_score, rating, comments):
    exists = (
        db.query(models.VendorPerformance)
        .filter(
            models.VendorPerformance.vendor_id == vendor_id,
            models.VendorPerformance.comments == comments,
        )
        .first()
    )
    if not exists:
        db.add(
            models.VendorPerformance(
                company_id=company_id,
                vendor_id=vendor_id,
                rating=rating,
                quality_score=quality_score,
                comments=comments,
                evaluated_by=1,
            )
        )


def add_contract(db, vendor_id, number, title, start_date, end_date, amount, status):
    contract = db.query(models.Contract).filter(models.Contract.contract_number == number).first()
    if not contract:
        contract = models.Contract(
            company_id=None,
            vendor_id=vendor_id,
            contract_number=number,
            title=title,
            start_date=start_date,
            end_date=end_date,
            amount=amount,
            document_url=None,
            status=status,
        )
        db.add(contract)
    else:
        contract.vendor_id = vendor_id
        contract.title = title
        contract.start_date = start_date
        contract.end_date = end_date
        contract.amount = amount
        contract.status = status


def add_cert(db, vendor_id, name, issue_date, expiry_date, status):
    cert = (
        db.query(models.Certification)
        .filter(
            models.Certification.vendor_id == vendor_id,
            models.Certification.name == name,
        )
        .first()
    )
    if not cert:
        db.add(
            models.Certification(
                vendor_id=vendor_id,
                name=name,
                issue_date=issue_date,
                expiry_date=expiry_date,
                status=status,
                document_url=None,
            )
        )
    else:
        cert.issue_date = issue_date
        cert.expiry_date = expiry_date
        cert.status = status


def add_compliance(db, vendor_id, requirement, status, comments):
    check = (
        db.query(models.ComplianceCheck)
        .filter(
            models.ComplianceCheck.vendor_id == vendor_id,
            models.ComplianceCheck.requirement == requirement,
        )
        .first()
    )
    if not check:
        db.add(
            models.ComplianceCheck(
                vendor_id=vendor_id,
                requirement=requirement,
                status=status,
                comments=comments,
                checked_by=1,
            )
        )
    else:
        check.status = status
        check.comments = comments
        check.checked_by = 1


def add_document(db, vendor_id, name, document_type, expiry_date, status):
    doc = (
        db.query(models.VendorDocument)
        .filter(
            models.VendorDocument.vendor_id == vendor_id,
            models.VendorDocument.name == name,
        )
        .first()
    )
    if not doc:
        db.add(
            models.VendorDocument(
                vendor_id=vendor_id,
                name=name,
                document_type=document_type,
                document_url=None,
                expiry_date=expiry_date,
                status=status,
            )
        )
    else:
        doc.document_type = document_type
        doc.expiry_date = expiry_date
        doc.status = status


def add_issue(db, vendor_id, title, description, agreed_hours, raised_at, resolved_at=None, status="Open", po_id=None):
    issue = (
        db.query(models.VendorIssue)
        .filter(
            models.VendorIssue.vendor_id == vendor_id,
            models.VendorIssue.title == title,
        )
        .first()
    )
    if not issue:
        issue = models.VendorIssue(
            vendor_id=vendor_id,
            purchase_order_id=po_id,
            title=title,
            description=description,
            status=status,
            agreed_resolution_hours=agreed_hours,
            raised_at=raised_at,
            resolved_at=resolved_at,
            created_by=1,
        )
        db.add(issue)
    else:
        issue.purchase_order_id = po_id
        issue.description = description
        issue.status = status
        issue.agreed_resolution_hours = agreed_hours
        issue.raised_at = raised_at
        issue.resolved_at = resolved_at


def add_message(db, sender_id, receiver_id, vendor_id, subject, message, created_at, related_procurement_id=None):
    exists = (
        db.query(models.Communication)
        .filter(
            models.Communication.sender_id == sender_id,
            models.Communication.receiver_id == receiver_id,
            models.Communication.subject == subject,
            models.Communication.message == message,
        )
        .first()
    )
    if not exists:
        db.add(
            models.Communication(
                sender_id=sender_id,
                receiver_id=receiver_id,
                company_id=None,
                subject=subject,
                message=message,
                related_vendor_id=vendor_id,
                related_procurement_id=related_procurement_id,
                is_read=True,
                created_at=created_at,
            )
        )


def add_invoice(db, po_id, vendor_id, number, invoice_date, due_date, amount, status):
    invoice = db.query(models.Invoice).filter(models.Invoice.invoice_number == number).first()
    if not invoice:
        db.add(
            models.Invoice(
                invoice_number=number,
                purchase_order_id=po_id,
                vendor_id=vendor_id,
                invoice_date=invoice_date,
                due_date=due_date,
                amount=amount,
                status=status,
                document_url=None,
            )
        )
    else:
        invoice.purchase_order_id = po_id
        invoice.vendor_id = vendor_id
        invoice.invoice_date = invoice_date
        invoice.due_date = due_date
        invoice.amount = amount
        invoice.status = status


def add_notification(db, user_id, title, message, kind):
    exists = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.title == title,
            models.Notification.message == message,
        )
        .first()
    )
    if not exists:
        db.add(
            models.Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=kind,
                is_read=False,
            )
        )


def main():
    db = Session(bind=engine)

    try:
        # ====================================================
        # DEMO COMPANY FOR LEGACY DB CONSTRAINT
        # ====================================================
        # vendor_performance.company_id is still NOT NULL in the
        # existing PostgreSQL database, so performance snapshots
        # use this shared demo organization.
        demo_company = (
            db.query(models.Company)
            .filter(models.Company.email == "demo.procurement@vendorintelligence.local")
            .first()
        )

        if not demo_company:
            demo_company = models.Company(
                name="Vendor Intelligence Demo Organization",
                registration_number="VI-DEMO-2026",
                email="demo.procurement@vendorintelligence.local",
                phone="+91 90000 12345",
                address="Chennai, Tamil Nadu, India",
                status="Active",
            )
            db.add(demo_company)
            db.flush()

        demo_company_id = demo_company.id

        # ====================================================
        # EXISTING USERS - LOOK UP ONLY, NEVER CREATE USERS
        # ====================================================
        harish = get_user(db, "HarishAdmin@gmail.com")
        procurement_manager = get_user(db, "priya.menon@gmail.com")
        supply_manager = get_user(db, "arvind.sharma@gmail.com")
        finance = get_user(db, "sneha.iyer@gmail.com")
        auditor = get_user(db, "karthik.rao@gmail.com")

        vendors = {
            "VEN-00006": get_vendor(db, "VEN-00006"),
            "VEN-00007": get_vendor(db, "VEN-00007"),
            "VEN-00008": get_vendor(db, "VEN-00008"),
            "VEN-00009": get_vendor(db, "VEN-00009"),
            "VEN-00010": get_vendor(db, "VEN-00010"),
            "VEN-00011": get_vendor(db, "VEN-00011"),
        }

        today = date.today()
        now = datetime.now(timezone.utc)

        # ====================================================
        # MAKE EXISTING FIRST PROCUREMENT REALISTIC
        # ====================================================
        p1 = upsert_procurement(
            db,
            "PR-00001",
            vendors["VEN-00006"].id,
            "Business Laptops",
            "Laptops for procurement and operations teams",
            "Completed",
            20,
            48000,
            date(2026, 9, 15),
            harish.id,
        )

        po1 = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == "PO-00001").first()
        if po1:
            po1.vendor_id = vendors["VEN-00006"].id
            po1.procurement_id = p1.id
            po1.created_by = harish.id
            po1.order_date = date(2026, 9, 2)
            po1.delivery_date = date(2026, 9, 15)
            po1.actual_delivery_date = date(2026, 9, 14)
            po1.total_amount = 960000
            po1.status = "Completed"
            db.flush()
            item1 = db.query(models.PurchaseOrderItem).filter(models.PurchaseOrderItem.purchase_order_id == po1.id).first()
            if not item1:
                db.add(models.PurchaseOrderItem(
                    purchase_order_id=po1.id,
                    item_name="Business Laptops",
                    description="20 business laptops",
                    quantity=20,
                    unit_price=48000,
                    total_price=960000,
                ))
            else:
                item1.item_name = "Business Laptops"
                item1.quantity = 20
                item1.unit_price = 48000
                item1.total_price = 960000
        else:
            po1 = upsert_po(
                db, "PO-00001", vendors["VEN-00006"].id, p1.id, harish.id,
                date(2026, 9, 2), date(2026, 9, 15), date(2026, 9, 14),
                960000, "Completed", "Business Laptops", 20, 48000,
            )

        # ====================================================
        # PROCUREMENT REQUESTS
        # ====================================================
        procurement_specs = [
            ("PR-00002", "VEN-00007", "Server Racks", "Equipment racks for new server room", "Approved", 8, 12500, date(2026, 10, 20)),
            ("PR-00003", "VEN-00008", "Industrial Sensors", "Temperature and vibration sensors", "Ordered", 40, 3200, date(2026, 10, 5)),
            ("PR-00004", "VEN-00009", "Transport Services", "Monthly logistics transport requirement", "Delivered", 12, 15000, date(2026, 9, 10)),
            ("PR-00005", "VEN-00010", "Technical Support Retainer", "Annual technical support service", "Pending", 6, 25000, date(2026, 11, 1)),
            ("PR-00006", "VEN-00011", "HVAC Maintenance", "Preventive maintenance for facilities", "Cancelled", 4, 18000, date(2026, 8, 25)),
            ("PR-00007", "VEN-00006", "Networking Switches", "Managed network switches", "Completed", 15, 22000, date(2026, 9, 1)),
            ("PR-00008", "VEN-00008", "Conveyor Spare Parts", "Replacement conveyor components", "Completed", 30, 4500, date(2026, 8, 20)),
            ("PR-00009", "VEN-00009", "Fleet Tracking Service", "Fleet GPS tracking subscriptions", "Completed", 10, 9000, date(2026, 9, 5)),
            ("PR-00010", "VEN-00006", "Security Software Renewal", "Endpoint security license renewal", "Completed", 20, 15000, date(2026, 8, 30)),
            ("PR-00011", "VEN-00010", "Cloud Support Package", "Managed cloud monitoring support", "Approved", 12, 11000, date(2026, 10, 12)),
            ("PR-00012", "VEN-00007", "Industrial UPS Units", "UPS units for critical equipment", "Pending", 5, 56000, date(2026, 11, 15)),
        ]

        pmap = {"PR-00001": p1}
        for n, code, title, desc, status, qty, price, needed in procurement_specs:
            pmap[n] = upsert_procurement(
                db, n, vendors[code].id, title, desc, status, qty, price, needed, procurement_manager.id
            )

        # ====================================================
        # PURCHASE ORDERS
        # ====================================================
        po_specs = [
            ("PO-00002", "VEN-00006", "PR-00007", date(2026, 8, 20), date(2026, 9, 1), date(2026, 9, 4), 330000, "Completed", "Networking Switches", 15, 22000),
            ("PO-00003", "VEN-00006", "PR-00010", date(2026, 8, 15), date(2026, 8, 30), date(2026, 8, 29), 300000, "Completed", "Security Software Renewal", 20, 15000),
            ("PO-00004", "VEN-00007", "PR-00003", date(2026, 9, 18), date(2026, 10, 5), None, 128000, "Ordered", "Industrial Sensors", 40, 3200),
            ("PO-00005", "VEN-00007", "PR-00002", date(2026, 9, 15), date(2026, 10, 20), None, 100000, "Pending", "Server Racks", 8, 12500),
            ("PO-00006", "VEN-00008", "PR-00008", date(2026, 8, 10), date(2026, 8, 20), date(2026, 8, 28), 135000, "Completed", "Conveyor Spare Parts", 30, 4500),
            ("PO-00007", "VEN-00009", "PR-00009", date(2026, 8, 20), date(2026, 9, 5), date(2026, 9, 5), 90000, "Completed", "Fleet Tracking Service", 10, 9000),
            ("PO-00008", "VEN-00009", "PR-00004", date(2026, 8, 25), date(2026, 9, 10), date(2026, 9, 8), 180000, "Delivered", "Transport Services", 12, 15000),
            ("PO-00009", "VEN-00010", "PR-00011", date(2026, 9, 20), date(2026, 10, 12), None, 132000, "Pending", "Cloud Support Package", 12, 11000),
            ("PO-00010", "VEN-00011", "PR-00006", date(2026, 8, 1), date(2026, 8, 25), None, 72000, "Cancelled", "HVAC Maintenance", 4, 18000),
        ]

        pomap = {"PO-00001": po1}
        for n, code, pr, od, exp, actual, amount, status, item, qty, price in po_specs:
            pomap[n] = upsert_po(
                db, n, vendors[code].id, pmap[pr].id, supply_manager.id,
                od, exp, actual, amount, status, item, qty, price,
            )

        # ====================================================
        # PERFORMANCE / QUALITY
        # ====================================================
        quality_data = [
            ("VEN-00006", 88, 4.4, "Consistent product quality and strong fulfillment history"),
            ("VEN-00007", 74, 3.7, "Good equipment quality with occasional packaging defects"),
            ("VEN-00008", 82, 4.1, "Reliable industrial components with minor variance"),
            ("VEN-00009", 91, 4.6, "High service quality and dependable logistics operations"),
            ("VEN-00010", 68, 3.4, "Service quality is acceptable but response consistency varies"),
            ("VEN-00011", 58, 2.9, "Several maintenance jobs required rework"),
        ]
        for code, quality, rating, comments in quality_data:
            add_performance(db, demo_company_id, vendors[code].id, quality, rating, comments)

        # ====================================================
        # CONTRACTS
        # ====================================================
        add_contract(db, vendors["VEN-00006"].id, "CNT-2026-001", "IT Hardware Supply Agreement", date(2026, 1, 1), date(2027, 1, 31), 2500000, "Active")
        add_contract(db, vendors["VEN-00007"].id, "CNT-2026-002", "Equipment Supply Agreement", date(2026, 2, 1), date(2026, 10, 15), 1800000, "Renewal Pending")
        add_contract(db, vendors["VEN-00008"].id, "CNT-2026-003", "Industrial Materials Agreement", date(2026, 1, 15), date(2027, 3, 31), 3200000, "Active")
        add_contract(db, vendors["VEN-00009"].id, "CNT-2026-004", "Logistics Services Agreement", date(2026, 3, 1), date(2027, 2, 28), 2100000, "Active")
        add_contract(db, vendors["VEN-00010"].id, "CNT-2026-005", "Managed Support Agreement", date(2025, 7, 1), date(2026, 8, 31), 900000, "Expired")
        add_contract(db, vendors["VEN-00011"].id, "CNT-2026-006", "Facility Maintenance Agreement", date(2026, 1, 1), date(2026, 7, 31), 650000, "Expired")

        # ====================================================
        # CERTIFICATIONS
        # ====================================================
        add_cert(db, vendors["VEN-00006"].id, "ISO 9001", date(2025, 1, 1), date(2027, 1, 1), "Valid")
        add_cert(db, vendors["VEN-00006"].id, "ISO 27001", date(2025, 6, 1), date(2026, 12, 1), "Valid")
        add_cert(db, vendors["VEN-00007"].id, "ISO 9001", date(2025, 4, 1), date(2026, 10, 1), "Valid")
        add_cert(db, vendors["VEN-00007"].id, "Safety Compliance Certificate", date(2025, 2, 1), date(2026, 8, 1), "Expired")
        add_cert(db, vendors["VEN-00008"].id, "ISO 9001", date(2025, 1, 15), date(2027, 2, 15), "Valid")
        add_cert(db, vendors["VEN-00009"].id, "Fleet Safety Certificate", date(2026, 1, 1), date(2027, 1, 1), "Valid")
        add_cert(db, vendors["VEN-00010"].id, "ISO 20000", date(2025, 1, 1), date(2026, 7, 1), "Expired")
        add_cert(db, vendors["VEN-00011"].id, "Facility Safety Certificate", date(2025, 1, 1), date(2026, 6, 1), "Expired")

        # ====================================================
        # COMPLIANCE CHECKS
        # ====================================================
        compliance_sets = {
            "VEN-00006": [
                ("GST and Tax Documentation", "Passed", "Current documentation verified"),
                ("Vendor Onboarding Compliance", "Passed", "All required onboarding checks passed"),
                ("Information Security Compliance", "Passed", "Security requirements satisfied"),
            ],
            "VEN-00007": [
                ("GST and Tax Documentation", "Passed", "Current documentation verified"),
                ("Equipment Safety Compliance", "Failed", "Safety certificate needs renewal"),
                ("Vendor Onboarding Compliance", "Passed", "Core onboarding checks passed"),
            ],
            "VEN-00008": [
                ("GST and Tax Documentation", "Passed", "Verified"),
                ("Material Quality Compliance", "Passed", "Quality requirements satisfied"),
                ("Environmental Compliance", "Passed", "Environmental declaration valid"),
            ],
            "VEN-00009": [
                ("GST and Tax Documentation", "Passed", "Verified"),
                ("Transport Safety Compliance", "Passed", "Safety documentation verified"),
            ],
            "VEN-00010": [
                ("GST and Tax Documentation", "Passed", "Verified"),
                ("Service Compliance Review", "Failed", "Contract and certification require review"),
            ],
            "VEN-00011": [
                ("GST and Tax Documentation", "Passed", "Verified"),
                ("Facility Safety Compliance", "Failed", "Expired safety certification"),
                ("Maintenance Compliance Review", "Failed", "Recent maintenance issues require corrective action"),
            ],
        }
        for code, checks in compliance_sets.items():
            for req, status, comments in checks:
                add_compliance(db, vendors[code].id, req, status, comments)

        # ====================================================
        # DOCUMENTS
        # ====================================================
        add_document(db, vendors["VEN-00006"].id, "GST Registration Certificate", "Tax Document", date(2027, 3, 31), "Active")
        add_document(db, vendors["VEN-00006"].id, "Insurance Certificate", "Insurance", date(2027, 1, 31), "Active")
        add_document(db, vendors["VEN-00007"].id, "Equipment Safety Certificate", "Compliance", date(2026, 8, 1), "Expired")
        add_document(db, vendors["VEN-00008"].id, "GST Registration Certificate", "Tax Document", date(2027, 2, 28), "Active")
        add_document(db, vendors["VEN-00009"].id, "Fleet Insurance Certificate", "Insurance", date(2027, 1, 1), "Active")
        add_document(db, vendors["VEN-00010"].id, "Service Compliance Certificate", "Compliance", date(2026, 7, 1), "Expired")
        add_document(db, vendors["VEN-00011"].id, "Facility Safety Certificate", "Compliance", date(2026, 6, 1), "Expired")

        # ====================================================
        # ISSUES / RESOLUTION
        # ====================================================
        base = now - timedelta(days=40)
        add_issue(db, vendors["VEN-00006"].id, "Laptop shipment documentation mismatch", "Invoice references needed correction.", 48, base, base + timedelta(hours=12), "Resolved", po1.id)
        add_issue(db, vendors["VEN-00006"].id, "Minor laptop packaging issue", "Two boxes arrived with damaged outer packaging.", 24, base + timedelta(days=8), base + timedelta(days=8, hours=30), "Resolved", pomap["PO-00002"].id)

        add_issue(db, vendors["VEN-00007"].id, "Rack packaging damage", "Three server racks had packaging damage.", 48, base + timedelta(days=2), base + timedelta(days=4), "Resolved", pomap["PO-00005"].id)
        add_issue(db, vendors["VEN-00007"].id, "Safety certificate renewal", "Updated equipment safety certificate pending.", 72, base + timedelta(days=12), None, "Open", pomap["PO-00004"].id)

        add_issue(db, vendors["VEN-00008"].id, "Conveyor part tolerance issue", "Several replacement parts required adjustment.", 72, base + timedelta(days=4), base + timedelta(days=5), "Resolved", pomap["PO-00006"].id)
        add_issue(db, vendors["VEN-00008"].id, "Sensor configuration clarification", "Configuration details clarified with engineering.", 48, base + timedelta(days=15), base + timedelta(days=16), "Resolved", pomap["PO-00004"].id)

        add_issue(db, vendors["VEN-00009"].id, "Transport scheduling delay", "Delivery slot changed by one day.", 24, base + timedelta(days=5), base + timedelta(days=5, hours=10), "Resolved", pomap["PO-00008"].id)
        add_issue(db, vendors["VEN-00009"].id, "Fleet report formatting issue", "Monthly tracking report needed correction.", 48, base + timedelta(days=20), base + timedelta(days=23), "Resolved", pomap["PO-00007"].id)

        add_issue(db, vendors["VEN-00010"].id, "Support response delay", "Service ticket response exceeded expected time.", 24, base + timedelta(days=3), base + timedelta(days=5), "Resolved", pomap["PO-00009"].id)
        add_issue(db, vendors["VEN-00010"].id, "Cloud monitoring alert gap", "Monitoring alert rules need correction.", 24, base + timedelta(days=25), None, "In Progress", pomap["PO-00009"].id)

        add_issue(db, vendors["VEN-00011"].id, "Maintenance rework required", "HVAC maintenance required a second visit.", 48, base + timedelta(days=6), base + timedelta(days=9), "Resolved", pomap["PO-00010"].id)
        add_issue(db, vendors["VEN-00011"].id, "Safety certificate expired", "Updated facility safety certificate has not been submitted.", 72, base + timedelta(days=18), None, "Open", pomap["PO-00010"].id)

        # ====================================================
        # COMMUNICATIONS
        # ====================================================
        vendor_user = {code: vendors[code].user_id for code in vendors}
        internal_sender = procurement_manager.id

        # Ananya: 2h and 6h responses
        t = now - timedelta(days=16)
        add_message(db, internal_sender, vendor_user["VEN-00006"], vendors["VEN-00006"].id, "Delivery confirmation", "Please confirm delivery schedule for the laptop order.", t, p1.id)
        add_message(db, vendor_user["VEN-00006"], internal_sender, vendors["VEN-00006"].id, "Delivery confirmation", "Confirmed. Delivery is scheduled as planned.", t + timedelta(hours=2), p1.id)
        t2 = now - timedelta(days=12)
        add_message(db, internal_sender, vendor_user["VEN-00006"], vendors["VEN-00006"].id, "Packaging follow-up", "Please update us on the packaging issue.", t2, pmap["PR-00007"].id)
        add_message(db, vendor_user["VEN-00006"], internal_sender, vendors["VEN-00006"].id, "Packaging follow-up", "Replacement packaging has been dispatched.", t2 + timedelta(hours=6), pmap["PR-00007"].id)

        # Vikram: 10h response
        t = now - timedelta(days=14)
        add_message(db, internal_sender, vendor_user["VEN-00007"], vendors["VEN-00007"].id, "Server rack order", "Please confirm the expected dispatch date.", t, pmap["PR-00002"].id)
        add_message(db, vendor_user["VEN-00007"], internal_sender, vendors["VEN-00007"].id, "Server rack order", "Dispatch will happen according to the schedule.", t + timedelta(hours=10), pmap["PR-00002"].id)

        # Meera: 30h response
        t = now - timedelta(days=13)
        add_message(db, internal_sender, vendor_user["VEN-00008"], vendors["VEN-00008"].id, "Sensor specifications", "Please confirm the sensor specifications.", t, pmap["PR-00003"].id)
        add_message(db, vendor_user["VEN-00008"], internal_sender, vendors["VEN-00008"].id, "Sensor specifications", "Specifications confirmed after engineering review.", t + timedelta(hours=30), pmap["PR-00003"].id)

        # Rohit: 3h response
        t = now - timedelta(days=11)
        add_message(db, internal_sender, vendor_user["VEN-00009"], vendors["VEN-00009"].id, "Transport schedule", "Please confirm tomorrow's transport schedule.", t, pmap["PR-00004"].id)
        add_message(db, vendor_user["VEN-00009"], internal_sender, vendors["VEN-00009"].id, "Transport schedule", "Confirmed. Vehicle details are attached in our records.", t + timedelta(hours=3), pmap["PR-00004"].id)

        # Divya: no reply to one message => communication score remains 0
        t = now - timedelta(days=9)
        add_message(db, internal_sender, vendor_user["VEN-00010"], vendors["VEN-00010"].id, "Support ticket follow-up", "Please provide an update on the monitoring issue.", t, pmap["PR-00011"].id)

        # Sanjay: 20h response
        t = now - timedelta(days=8)
        add_message(db, internal_sender, vendor_user["VEN-00011"], vendors["VEN-00011"].id, "Maintenance report", "Please send the updated maintenance report.", t, pmap["PR-00006"].id)
        add_message(db, vendor_user["VEN-00011"], internal_sender, vendors["VEN-00011"].id, "Maintenance report", "The updated report is being prepared.", t + timedelta(hours=20), pmap["PR-00006"].id)

        # ====================================================
        # INVOICES
        # ====================================================
        add_invoice(db, po1.id, vendors["VEN-00006"].id, "INV-2026-001", date(2026, 9, 14), date(2026, 10, 14), 960000, "Paid")
        add_invoice(db, pomap["PO-00002"].id, vendors["VEN-00006"].id, "INV-2026-002", date(2026, 9, 5), date(2026, 10, 5), 330000, "Approved")
        add_invoice(db, pomap["PO-00006"].id, vendors["VEN-00008"].id, "INV-2026-003", date(2026, 8, 29), date(2026, 9, 28), 135000, "Overdue")
        add_invoice(db, pomap["PO-00007"].id, vendors["VEN-00009"].id, "INV-2026-004", date(2026, 9, 6), date(2026, 10, 6), 90000, "Paid")

        # ====================================================
        # NOTIFICATIONS
        # ====================================================
        add_notification(db, harish.id, "Vendor approval reminder", "OMEGA Technologies is still pending approval.", "Vendor Approval")
        add_notification(db, procurement_manager.id, "Delivery update", "PO-00008 was delivered earlier than expected.", "Delivery")
        add_notification(db, finance.id, "Invoice overdue", "Invoice INV-2026-003 is overdue.", "Invoice")
        add_notification(db, supply_manager.id, "Compliance alert", "Sanjay Gupta has an expired safety certificate.", "Compliance")
        add_notification(db, auditor.id, "Contract expiry alert", "A vendor contract requires renewal review.", "Contract")

        db.commit()
        print("SEED COMPLETED SUCCESSFULLY")
        print("Existing users/vendors were reused; no users were created.")
        print("Procurement, PO, performance, reliability, contract, compliance, communication, issue, invoice, document and notification data were populated.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
