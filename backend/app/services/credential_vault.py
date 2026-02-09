"""Credential vault for secure API key storage with encryption."""

from __future__ import annotations

import os
from cryptography.fernet import Fernet


class CredentialVault:
    """
    Secure credential storage using Fernet symmetric encryption.

    Encrypts API keys before storing in database and decrypts at runtime.
    Encryption key stored in CREDENTIAL_VAULT_KEY environment variable.

    Example:
        vault = CredentialVault()
        encrypted = vault.encrypt_credential("sk-my-secret-key")
        # Store encrypted in database

        # Later, retrieve and decrypt
        decrypted = vault.decrypt_credential(encrypted)
        # Use decrypted for API calls
    """

    def __init__(self):
        """Initialize vault with encryption key from environment."""
        vault_key = os.getenv("CREDENTIAL_VAULT_KEY")

        if not vault_key:
            raise RuntimeError(
                "CREDENTIAL_VAULT_KEY environment variable must be set. "
                "Generate with: python -c 'from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())'"
            )

        self.cipher = Fernet(vault_key.encode())

    def encrypt_credential(self, api_key: str) -> str:
        """
        Encrypt an API key for storage.

        Args:
            api_key: Plain text API key

        Returns:
            Encrypted key as base64 string
        """
        encrypted_bytes = self.cipher.encrypt(api_key.encode())
        return encrypted_bytes.decode()

    def decrypt_credential(self, encrypted_key: str) -> str:
        """
        Decrypt an API key for use.

        Args:
            encrypted_key: Encrypted key from database

        Returns:
            Plain text API key

        Raises:
            InvalidToken: If encrypted_key is invalid or corrupted
        """
        decrypted_bytes = self.cipher.decrypt(encrypted_key.encode())
        return decrypted_bytes.decode()
