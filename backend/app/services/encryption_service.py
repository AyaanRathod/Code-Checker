import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _derive_fernet_key(secret: str) -> bytes:
    """Derive a stable Fernet key from a shared secret."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _parse_legacy_keys(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

class EncryptionService:
    def __init__(self):
        # Prefer a dedicated encryption secret.
        # In strict mode, fail startup if ENCRYPTION_KEY is missing.
        if settings.ENCRYPTION_KEY:
            encryption_secret = settings.ENCRYPTION_KEY
        elif settings.ENCRYPTION_KEY_REQUIRED:
            raise RuntimeError("ENCRYPTION_KEY is required but not configured")
        else:
            encryption_secret = settings.SECRET_KEY
            logger.warning("ENCRYPTION_KEY is not set; falling back to SECRET_KEY for field encryption")

        legacy_secrets = _parse_legacy_keys(settings.ENCRYPTION_LEGACY_KEYS)
        # Backward compatibility: older rows may have been encrypted with SECRET_KEY.
        if settings.ENCRYPTION_KEY and settings.SECRET_KEY and settings.SECRET_KEY != encryption_secret:
            if settings.SECRET_KEY not in legacy_secrets:
                legacy_secrets.append(settings.SECRET_KEY)

        self.primary_secret = encryption_secret
        self.primary_fernet = Fernet(_derive_fernet_key(encryption_secret))
        self.legacy_fernets = [Fernet(_derive_fernet_key(secret)) for secret in legacy_secrets]

    def encrypt(self, data: str) -> str:
        """Encrypts a string and returns a base64 encoded string."""
        if not data:
            return None
        return self.primary_fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypts a base64 encoded string and returns the original string."""
        if not encrypted_data:
            return None

        for fernet in [self.primary_fernet, *self.legacy_fernets]:
            try:
                return fernet.decrypt(encrypted_data.encode()).decode()
            except InvalidToken:
                continue

        raise InvalidToken("Unable to decrypt value with configured encryption keys")

encryption_service = EncryptionService()
