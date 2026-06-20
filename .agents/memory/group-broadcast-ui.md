---
name: GroupBroadcasts UI extras
description: Non-obvious UI patterns and gotchas for the group broadcasting pages
---

## NextSendCountdown component
- Defined in GroupBroadcasts.tsx as a standalone component above `GroupCampaignCard`
- Uses `useRef<ReturnType<typeof setInterval>>` + `setInterval(1000)` in useEffect for live 1s ticks
- Props: `{ iso: string }` — ISO timestamp string
- Color logic: green when diff≤0 (now), amber when diff≤60s, muted otherwise

## Fragment nesting gotcha
- The logs tab in GroupCampaignCard wraps CSV button + logs.map in a `<>` fragment
- The stats tab also wraps its content in `<>` 
- Both must be properly closed with `</>` — unclosed fragments give a Babel parse error at the ternary `)` line

## CSV export pattern
- Both logs tab and stats tab export CSV via `data:text/csv;charset=utf-8,` data URI
- `document.createElement("a"); a.href = ...; a.download = ...; a.click()` — no DOM append needed
- Logs CSV: `"Группа,Статус,Ошибка,Время"`
- Stats CSV: `"Группа,Отправлено,Ошибок,Всего,Последняя отправка"`

## GroupBroadcastsPage search filter
- Search state `search` added to GroupBroadcastsPage
- `filtered` variable: if search empty → all campaigns; else filters by name + text_template (case-insensitive)
- Search input only renders when `campaigns.length > 3` to avoid clutter
- `filtered` used in render; empty-search shows "Ничего не найдено" message

## GroupBroadcastCreate select-all groups
- Two buttons above the group list: "Выбрать все (N)" → `setGroups(acctGroups.map(g => g.group_id))`; "Снять выделение" → `setGroups([])`
- Wrapped in `<>...</>` fragment above the `<div>` list — both must close

## Workers page extras
- WorkerCard shows `📋 python worker.py {worker.worker_id}` clipboard button when worker is dead
- TaskRow shows `@ {worker_id}` amber badge when task status is "claimed"
- TaskRow shows `⏰ через {countdown}` amber text for pending tasks with scheduled_at > 5s out
- taskTab now has 4 options: all / pending / claimed (В работе) / failed (Ошибки)

## Home.tsx group campaign strip
- Shows amber GlassCard strip with Radio icon and "Групповые рассылки: N активных" when groupCampaigns > 0
- groupCampaigns loaded from `api.getGroupCampaigns().filter(g => g.status === "running").length`

**Why:**
These patterns are not derivable from the code at a glance — the fragment nesting bug in particular caused a Babel parse error at the ternary `)` that was confusing to diagnose.
