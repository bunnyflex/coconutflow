"""Tests for credential vault service."""

import os
import pytest
from cryptography.fernet import Fernet


@pytest.fixture
def vault_key():
    """Generate test encryption key."""
    return Fernet.generate_key().decode()


@pytest.fixture
def mock_env(vault_key, monkeypatch):
    """Mock CREDENTIAL_VAULT_KEY environment variable."""
    monkeypatch.setenv("CREDENTIAL_VAULT_KEY", vault_key)


def test_encrypt_credential(mock_env):
    """Test encrypting a credential."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()
    encrypted = vault.encrypt_credential("sk-test-key-123")

    assert encrypted != "sk-test-key-123"
    assert len(encrypted) > 0


def test_decrypt_credential(mock_env):
    """Test decrypting a credential."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()
    encrypted = vault.encrypt_credential("sk-test-key-123")
    decrypted = vault.decrypt_credential(encrypted)

    assert decrypted == "sk-test-key-123"


def test_encrypt_decrypt_roundtrip(mock_env):
    """Test encrypt/decrypt roundtrip with various keys."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()

    test_keys = [
        "simple-key",
        "sk-1234567890abcdef",
        "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
        "special-chars-!@#$%^&*()",
    ]

    for original_key in test_keys:
        encrypted = vault.encrypt_credential(original_key)
        decrypted = vault.decrypt_credential(encrypted)
        assert decrypted == original_key


def test_missing_vault_key_raises_error():
    """Test missing CREDENTIAL_VAULT_KEY raises error."""
    from app.services.credential_vault import CredentialVault

    # Clear env var
    if "CREDENTIAL_VAULT_KEY" in os.environ:
        del os.environ["CREDENTIAL_VAULT_KEY"]

    with pytest.raises(RuntimeError, match="CREDENTIAL_VAULT_KEY"):
        CredentialVault()


def test_invalid_encrypted_key_raises_error(mock_env):
    """Test decrypting invalid data raises error."""
    from app.services.credential_vault import CredentialVault
    from cryptography.fernet import InvalidToken

    vault = CredentialVault()

    with pytest.raises(InvalidToken):
        vault.decrypt_credential("invalid-encrypted-data")
