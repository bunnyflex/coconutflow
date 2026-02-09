"""Tests for retry handler with exponential backoff."""

import asyncio
import pytest


@pytest.mark.asyncio
async def test_retry_succeeds_first_attempt():
    """Test successful function on first attempt."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def successful_function():
        nonlocal call_count
        call_count += 1
        return "success"

    result = await successful_function()

    assert result == "success"
    assert call_count == 1


@pytest.mark.asyncio
async def test_retry_succeeds_after_failures():
    """Test retry succeeds after transient failures."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def flaky_function():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError("Transient failure")
        return "success"

    result = await flaky_function()

    assert result == "success"
    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_fails_after_max_attempts():
    """Test retry raises error after max attempts."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def always_fails():
        nonlocal call_count
        call_count += 1
        raise ValueError("Permanent failure")

    with pytest.raises(ValueError, match="Permanent failure"):
        await always_fails()

    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_exponential_backoff():
    """Test exponential backoff timing."""
    from app.utils.retry import retry_with_backoff
    import time

    attempt_times = []

    @retry_with_backoff(max_attempts=3, base_delay=0.1, max_delay=1.0)
    async def timing_test():
        attempt_times.append(time.time())
        if len(attempt_times) < 3:
            raise ConnectionError("Retry")
        return "success"

    await timing_test()

    # Verify exponential backoff: ~0.1s, ~0.2s delays
    assert len(attempt_times) == 3
    delay_1 = attempt_times[1] - attempt_times[0]
    delay_2 = attempt_times[2] - attempt_times[1]

    assert 0.08 < delay_1 < 0.15  # ~0.1s delay
    assert 0.15 < delay_2 < 0.25  # ~0.2s delay
