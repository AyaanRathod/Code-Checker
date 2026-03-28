from cryptography.fernet import Fernet
import os
import base64
from app.core.config import get_settings

settings = get_settings()

class EncryptionService:
    def __init__(self):
        # In a real application, retrieve this securely. For now we use the SECRET_KEY to derive a valid 32-url-safe-base64 key.
        # Fernet requires a 32-byte url-safe base64-encoded key.
        # We'll just hash the secret key to get 32 bytes.
        import hashlib
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        self.fernet = Fernet(base64.urlsafe_b64encode(key))

    def encrypt(self, data: str) -> str:
        """Encrypts a string and returns a base64 encoded string."""
        if not data:
            return None
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypts a base64 encoded string and returns the original string."""
        if not encrypted_data:
            return None
        return self.fernet.decrypt(encrypted_data.encode()).decode()

encryption_service = EncryptionService()
