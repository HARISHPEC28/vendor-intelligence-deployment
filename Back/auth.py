from datetime import datetime, timedelta, timezone
import os
import secrets

import bcrypt
from dotenv import load_dotenv
from jose import jwt


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
)

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured in .env")


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    """
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain password against a bcrypt hash.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ============================================================
# JWT ACCESS TOKEN
# ============================================================

def create_access_token(data: dict) -> str:
    """
    Create JWT access token.

    The supplied data will normally contain:
        user_id
        role
        company_id
    """

    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# PASSWORD RESET TOKEN
# ============================================================

def create_reset_token() -> str:
    """
    Create a secure temporary password-reset token.

    For the current development version, the token is stored
    in memory by main.py.
    """
    return secrets.token_urlsafe(32)