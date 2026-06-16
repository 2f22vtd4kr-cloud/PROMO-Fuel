# PROMO-Fuel CRM — Full Fix & Backend Prompt for Replit Agent

> Paste this entire prompt into the Replit AI Agent chat window.

---

## Context

This is a Telegram Mini App CRM called **PROMO-Fuel** — used by a marketing/promo agency to run campaigns for gas stations (АЗС) through Telegram. The app lives at `https://promo-fuel--savanajumaira.replit.app/crm-platform/` and is linked to `https://github.com/2f22vtd4kr-cloud/PROMO-Fuel`.

The app has a dark-themed UI with the following navigation sections:
- **ГЛАВНАЯ** (Home) — Active campaigns dashboard
- **РАССЫЛКИ** (Mailings) — Campaign management
- **АНАЛИТИКА** (Analytics) — Stats & reports
- **АУДИТОРИЯ** (Audience) — Contacts/user segments
- **АККАУНТЫ** (Accounts) — Telegram sender accounts (Telethon sessions)
- **ФАЙЛЫ** (Files) — File/data uploads

---

## Problem 1 — All navigation tabs are broken (not clickable / no routing)

The bottom navigation bar shows 6 tabs but none of them navigate anywhere. Clicking РАССЫЛКИ, АНАЛИТИКА, АУДИТОРИЯ, АККАУНТЫ, ФАЙЛЫ does nothing — they appear as dead icons.

**Fix required:**
1. Inspect the current routing setup (React Router / Flutter / Vue Router — wherever it lives).
2. Wire every bottom nav tab to its corresponding route or screen:
   - `ГЛАВНАЯ` → `/` or `/home`
   - `РАССЫЛКИ` → `/mailings`
   - `АНАЛИТИКА` → `/analytics`
   - `АУДИТОРИЯ` → `/audience`
   - `АККАУНТЫ` → `/accounts`
   - `ФАЙЛЫ` → `/files`
3. Add visual active-state highlight on the currently selected tab (the active tab icon should be brighter / white; inactive tabs should be muted gray, as in the current design).
4. Each route must render a proper page component (even a skeleton/placeholder screen is fine as long as routing works end-to-end).

---

## Problem 2 — "+ Создать кампанию" button does nothing

On the home screen, when no campaigns exist, the card shows "Нет активных кампаний" and a blue `+ Создать кампанию` link. Clicking it does nothing.

**Fix required:**
1. Attach an `onClick` / `onTap` handler to `+ Создать кампанию`.
2. It should open a **campaign creation modal or navigate to `/mailings/new`**.
3. The campaign creation form must collect:
   - `name` — campaign name (text input)
   - `message_text` — the message body (multiline textarea, supports emoji)
   - `media_url` — optional image/video attachment (file picker or URL input)
   - `audience_segment_id` — dropdown selector from available audience segments
   - `sender_account_id` — dropdown selecting which Telegram account (from АККАУНТЫ) sends this
   - `scheduled_at` — optional datetime picker for scheduling
   - `send_delay_seconds` — delay between each individual message (default: 15 seconds, to avoid Telegram flood limits)
4. On submit, POST to `/api/campaigns` with the above fields.
5. On success, the new campaign should appear on the home screen dashboard.

---

## Problem 3 — Backend API is missing or incomplete

The frontend is calling API endpoints that either don't exist or return errors. Build or complete the following FastAPI backend (`main.py`):

### Required API endpoints:

```
POST   /api/campaigns              — create campaign
GET    /api/campaigns              — list all campaigns
GET    /api/campaigns/{id}         — campaign detail + stats
PATCH  /api/campaigns/{id}/status  — pause / resume / cancel
DELETE /api/campaigns/{id}         — delete campaign

GET    /api/contacts               — list contacts/audience
POST   /api/contacts/import        — bulk import from CSV/XLSX
GET    /api/segments               — list audience segments
POST   /api/segments               — create segment (filter by tags, phone, city, etc.)

GET    /api/accounts               — list Telegram sender accounts
POST   /api/accounts               — add new sender account (returns QR or phone code flow)
DELETE /api/accounts/{id}          — remove account

GET    /api/analytics/campaigns    — aggregated stats (sent, delivered, failed, open rate)

GET    /api/files                  — list uploaded files
POST   /api/files/upload           — upload CSV/XLSX of contacts
```

Use **FastAPI** with **SQLAlchemy** and **SQLite** (or PostgreSQL if already configured). All models must be persisted across Replit restarts.

---

## Problem 4 — DB Users → Telegram Identifier Resolution (CRITICAL)

The core CRM function is: you have a database of clients (from gas station loyalty programs or manual imports) with fields like `phone_number`, `full_name`, `city`, and you need to resolve them to Telegram `user_id` so you can send them messages with Telethon.

**Implement the following resolution pipeline:**

### Step 1 — Import contacts
Accept CSV/XLSX uploads with these columns (flexible, detect column names):
```
phone, name, city, tag, notes, telegram_username, telegram_user_id
```
Store in a `contacts` table.

### Step 2 — Phone → Telegram user_id resolution

This is the key mechanism. For each contact with a `phone_number` but no `telegram_user_id`:

```python
# campaign_resolver.py

from telethon.tl.functions.contacts import ImportContactsRequest
from telethon.tl.types import InputPhoneContact
import asyncio

async def resolve_phone_to_telegram(client, phone: str, contact_name: str) -> dict:
    """
    Resolves a phone number to a Telegram user_id.
    Requires the Telethon client to be connected.
    Returns {'user_id': int, 'username': str, 'first_name': str} or None.
    """
    try:
        # Temporarily import contact to Telegram's contact list
        contact = InputPhoneContact(
            client_id=0,
            phone=phone,
            first_name=contact_name,
            last_name=""
        )
        result = await client(ImportContactsRequest([contact]))
        
        if result.users:
            user = result.users[0]
            return {
                "telegram_user_id": user.id,
                "telegram_username": getattr(user, 'username', None),
                "first_name": user.first_name,
                "last_name": getattr(user, 'last_name', ''),
                "is_bot": user.bot,
                "phone_resolved": True
            }
        else:
            return {"phone_resolved": False, "reason": "not_on_telegram"}
    except Exception as e:
        return {"phone_resolved": False, "reason": str(e)}
    finally:
        # Always clean up — delete the temporarily imported contact
        try:
            from telethon.tl.functions.contacts import DeleteContactsRequest
            if result.users:
                await client(DeleteContactsRequest(id=[result.users[0]]))
        except:
            pass
```

### Step 3 — Username → Telegram user_id resolution

```python
async def resolve_username_to_telegram(client, username: str) -> dict:
    """Resolves @username to Telegram user_id."""
    try:
        entity = await client.get_entity(username)
        return {
            "telegram_user_id": entity.id,
            "telegram_username": username,
            "first_name": getattr(entity, 'first_name', ''),
            "phone_resolved": True
        }
    except Exception as e:
        return {"phone_resolved": False, "reason": str(e)}
```

### Step 4 — Batch resolution endpoint

```
POST /api/contacts/resolve
```
Body: `{ "segment_id": int }` or `{ "contact_ids": [1, 2, 3] }`

This endpoint:
1. Picks up all contacts in the segment/list that have a `phone_number` but no `telegram_user_id`
2. Iterates through them using the active Telethon client
3. Stores resolved `telegram_user_id` back into the `contacts` table
4. Returns a summary: `{ total: 100, resolved: 72, failed: 28 }`

Add a progress endpoint: `GET /api/contacts/resolve/status` that returns current resolution progress.

### Step 5 — Update Contact model

The `contacts` table must have these fields:
```sql
id                  INTEGER PRIMARY KEY
phone               TEXT
full_name           TEXT
city                TEXT
tags                TEXT  -- comma-separated
notes               TEXT
telegram_user_id    BIGINT  -- resolved Telegram ID (NULL until resolved)
telegram_username   TEXT
resolution_status   TEXT  -- 'pending', 'resolved', 'not_on_telegram', 'error'
resolution_error    TEXT
resolved_at         DATETIME
imported_at         DATETIME
```

---

## Problem 5 — Telethon backend (campaign_sender.py)

Create or fix `campaign_sender.py` with a complete, production-ready sending engine:

```python
# campaign_sender.py

import asyncio
import logging
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError, UserIsBlockedError, InputUserDeactivatedError,
    PeerFloodError, RPCError
)
from datetime import datetime
from db import get_db, Campaign, CampaignLog, Contact, TelegramAccount

logger = logging.getLogger(__name__)

async def send_campaign(campaign_id: int):
    """
    Main campaign sending loop.
    - Loads campaign settings, target audience, and sender account
    - Sends message to each resolved recipient with delay
    - Logs every send result (success/failure) to campaign_logs table
    - Handles FloodWaitError gracefully (pauses and resumes)
    - Updates campaign.status as: 'running' → 'completed' / 'paused' / 'failed'
    """
    db = next(get_db())
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        logger.error(f"Campaign {campaign_id} not found")
        return

    # Load the Telegram account/session for this campaign
    account = db.query(TelegramAccount).filter(
        TelegramAccount.id == campaign.sender_account_id
    ).first()

    client = TelegramClient(
        f"sessions/{account.session_name}",
        api_id=account.api_id,
        api_hash=account.api_hash
    )

    await client.start(phone=account.phone_number)
    
    # Get the resolved recipients for this campaign's segment
    contacts = db.query(Contact).filter(
        Contact.segment_id == campaign.audience_segment_id,
        Contact.telegram_user_id.isnot(None),
        Contact.resolution_status == 'resolved'
    ).all()
    
    campaign.status = 'running'
    campaign.started_at = datetime.utcnow()
    campaign.total_recipients = len(contacts)
    db.commit()

    sent_count = 0
    failed_count = 0

    for contact in contacts:
        # Check if campaign was paused or cancelled
        db.refresh(campaign)
        if campaign.status in ('paused', 'cancelled'):
            logger.info(f"Campaign {campaign_id} {campaign.status}, stopping.")
            break

        try:
            # Send text message (optionally with media)
            if campaign.media_url:
                await client.send_file(
                    contact.telegram_user_id,
                    campaign.media_url,
                    caption=campaign.message_text
                )
            else:
                await client.send_message(
                    contact.telegram_user_id,
                    campaign.message_text
                )

            # Log success
            log = CampaignLog(
                campaign_id=campaign_id,
                contact_id=contact.id,
                telegram_user_id=contact.telegram_user_id,
                status='sent',
                sent_at=datetime.utcnow()
            )
            db.add(log)
            sent_count += 1

        except FloodWaitError as e:
            logger.warning(f"FloodWait {e.seconds}s — sleeping...")
            await asyncio.sleep(e.seconds + 5)
            # Retry this contact
            continue

        except (UserIsBlockedError, InputUserDeactivatedError) as e:
            log = CampaignLog(
                campaign_id=campaign_id,
                contact_id=contact.id,
                telegram_user_id=contact.telegram_user_id,
                status='failed',
                error=str(type(e).__name__),
                sent_at=datetime.utcnow()
            )
            db.add(log)
            failed_count += 1

        except PeerFloodError:
            logger.error("PeerFloodError — account may be limited. Pausing campaign.")
            campaign.status = 'paused'
            campaign.pause_reason = 'peer_flood_limit'
            db.commit()
            break

        except RPCError as e:
            logger.error(f"RPCError for contact {contact.id}: {e}")
            failed_count += 1

        # Update stats after each send
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        db.commit()

        # Delay between messages (default: 15 seconds to avoid flood)
        await asyncio.sleep(campaign.send_delay_seconds or 15)

    # Mark completed
    if campaign.status == 'running':
        campaign.status = 'completed'
        campaign.completed_at = datetime.utcnow()

    db.commit()
    await client.disconnect()
    logger.info(f"Campaign {campaign_id} done: {sent_count} sent, {failed_count} failed")
```

---

## Problem 6 — Telegram Account (АККАУНТЫ) management

The АККАУНТЫ screen needs to be functional. Users add Telegram accounts that are used as senders.

**Account addition flow:**
1. User enters: phone number, API_ID, API_HASH (obtained from my.telegram.org)
2. Backend starts a Telethon auth flow:
   - `POST /api/accounts/start-auth` → sends verification code to the phone
   - `POST /api/accounts/confirm-auth` with `{ phone_code: "12345" }` → completes login
   - `POST /api/accounts/confirm-2fa` with `{ password: "..." }` → if 2FA is enabled
3. On success, the session is saved as `sessions/{phone}.session` file
4. Account is stored in `telegram_accounts` table with `{ phone, api_id, api_hash, session_name, status: 'active', added_at }`

**Telegram accounts table:**
```sql
id              INTEGER PRIMARY KEY
phone           TEXT UNIQUE
api_id          INTEGER
api_hash        TEXT
session_name    TEXT
display_name    TEXT
status          TEXT  -- 'active', 'banned', 'limited', 'disconnected'
added_at        DATETIME
last_used_at    DATETIME
```

---

## Problem 7 — Analytics page (АНАЛИТИКА)

Build the analytics page with real data from `campaign_logs`:

Display:
- Total campaigns run
- Total messages sent / failed
- Per-campaign breakdown table: Name | Sent | Failed | Success Rate | Date
- A simple bar chart of sends per day (last 30 days)

Endpoint: `GET /api/analytics/summary`

---

## Problem 8 — File upload (ФАЙЛЫ)

The FILES screen must allow:
1. Drag-and-drop or file picker for `.csv` or `.xlsx` uploads
2. `POST /api/files/upload` — parses the file, detects columns, previews first 5 rows, asks user to map columns to contact fields
3. `POST /api/contacts/import` — commits the mapped import into the `contacts` table

---

## Database models summary (db.py / models.py)

Ensure all these SQLAlchemy models exist and are properly migrated:

```python
class Contact(Base):
    __tablename__ = 'contacts'
    id, phone, full_name, city, tags, notes
    telegram_user_id, telegram_username
    resolution_status, resolution_error, resolved_at
    segment_id, imported_at

class Segment(Base):
    __tablename__ = 'segments'
    id, name, filter_tags, filter_city, created_at

class Campaign(Base):
    __tablename__ = 'campaigns'
    id, name, message_text, media_url
    audience_segment_id, sender_account_id
    status  # draft, running, paused, completed, cancelled, failed
    scheduled_at, send_delay_seconds
    total_recipients, sent_count, failed_count
    started_at, completed_at, pause_reason, created_at

class CampaignLog(Base):
    __tablename__ = 'campaign_logs'
    id, campaign_id, contact_id, telegram_user_id
    status  # sent, failed, skipped
    error, sent_at

class TelegramAccount(Base):
    __tablename__ = 'telegram_accounts'
    id, phone, api_id, api_hash, session_name
    display_name, status, added_at, last_used_at
```

Run `Base.metadata.create_all(engine)` on startup to auto-create missing tables.

---

## Environment variables (.env / Replit Secrets)

Add these Replit Secrets if not already set:

```
DATABASE_URL=sqlite:///./promofuel.db
SESSION_DIR=./sessions
SECRET_KEY=<random 32-char string>
```

For Telethon, each account stores its own `api_id` and `api_hash` in the DB (entered by the user), so no global Telegram credentials are needed.

---

## Frontend requirements

1. After all the above backend is working, ensure the frontend correctly:
   - Calls `GET /api/campaigns` on the home screen and renders campaign cards
   - Each campaign card shows: name, status badge (colour-coded), sent/total progress bar, creation date
   - Campaign cards have action buttons: ▶ Resume / ⏸ Pause / 🗑 Delete
   - The home screen has a `+ Создать кампанию` FAB button (not just a text link) that opens the campaign creation flow

2. The bottom nav must use proper router links — switching tabs must not reload the page (SPA routing).

3. All Russian language labels must be maintained throughout.

---

## Priority order

Fix in this order:
1. Bottom navigation routing (makes everything else testable)
2. "+ Создать кампанию" button → campaign creation form
3. Database models + FastAPI endpoints
4. Telethon account management (АККАУНТЫ screen)
5. Contact import + phone resolution pipeline
6. campaign_sender.py sending engine
7. Analytics page
8. Files upload page

---

## Notes

- The app must work inside Telegram as a Mini App (`Telegram.WebApp` SDK should be initialized on load).
- Use `Telegram.WebApp.ready()` on mount and `Telegram.WebApp.expand()` to fill the screen.
- Do NOT use `window.localStorage` inside Telegram Mini Apps — use the backend API for all state persistence.
- Session files must persist across Replit restarts — store in a dedicated `sessions/` directory and add it to `.gitignore`.
- All API errors must return JSON `{ "error": "human-readable message" }` with appropriate HTTP status codes.
- Add CORS headers to allow the frontend origin to call the backend.
