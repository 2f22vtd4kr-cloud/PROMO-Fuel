"""Structured logging utility for PROMO-Fuel workers.

Provides a LoggerAdapter that automatically injects worker_id, account_id,
and task_id into every log record. The underlying format keeps human-readable
output but adds structured context after the message.

Usage:
    from utils.logging import get_logger
    log = get_logger("broadcaster", worker_id="worker-1", account_id=42)
    log.info("Connected", extra={"task_id": 17})
    # → 12:34:56 [broadcaster] INFO Connected [worker=worker-1 acct=42 task=17]
"""
import logging
import os
from typing import Any


class _ContextFormatter(logging.Formatter):
    """Appends structured context fields from LogRecord extras."""

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        parts = []
        for field in ("worker_id", "account_id", "task_id"):
            val = getattr(record, field, None)
            if val is not None:
                short = field.replace("worker_id", "worker").replace("account_id", "acct").replace("task_id", "task")
                parts.append(f"{short}={val}")
        return f"{base} [{' '.join(parts)}]" if parts else base


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with structured formatter."""
    handler = logging.StreamHandler()
    handler.setFormatter(_ContextFormatter(
        fmt="%(asctime)s [%(name)s] %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    ))
    root = logging.getLogger()
    if not root.handlers:
        root.addHandler(handler)
    root.setLevel(level)


class WorkerLogger(logging.LoggerAdapter):
    """LoggerAdapter that merges permanent context with per-call extras."""

    def process(self, msg: str, kwargs: dict) -> tuple[str, dict]:
        extra = dict(self.extra)
        if "extra" in kwargs:
            extra.update(kwargs["extra"])
        kwargs["extra"] = extra
        return msg, kwargs

    def bind(self, **fields: Any) -> "WorkerLogger":
        """Return a new adapter with additional permanent fields."""
        merged = {**self.extra, **fields}
        return WorkerLogger(self.logger, merged)


def get_logger(
    name: str,
    worker_id: str | None = None,
    account_id: int | None = None,
    task_id: int | None = None,
) -> WorkerLogger:
    """Return a WorkerLogger with the given permanent context fields."""
    ctx: dict[str, Any] = {}
    if worker_id  is not None: ctx["worker_id"]  = worker_id
    if account_id is not None: ctx["account_id"] = account_id
    if task_id    is not None: ctx["task_id"]    = task_id
    return WorkerLogger(logging.getLogger(name), ctx)
