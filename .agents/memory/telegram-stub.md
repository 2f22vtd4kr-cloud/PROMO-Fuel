---
name: Telegram stub package conflict
description: The `telegram` PyPI stub package shadows python-telegram-bot's telegram module.
---

# Telegram Stub Conflict

Never add `telegram>=0.0.1` (or any version) to `pyproject.toml`. This stub package installs a fake `telegram` module that shadows the real `python-telegram-bot` package, causing missing `__init__.py` errors at bot startup.

**Fix if it appears:** 
```
uv pip uninstall telegram
uv pip install --force-reinstall "python-telegram-bot==22.8"
```

**Why:** The stub package `telegram` on PyPI is unrelated to python-telegram-bot. pnpm/uv dependency resolution may pull it in if listed.

**How to apply:** Only declare `python-telegram-bot==22.8` in pyproject.toml. Never add `telegram` as a separate dependency.
