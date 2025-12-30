# n8n Migration Status

This document tracks the migration of Goaliphant bot commands from Lambda to n8n workflows.

## Overview

| Status        | Count |
| ------------- | ----- |
| ✅ Complete    | 16    |
| 🚧 In Progress | 0     |
| ⏳ Not Started | 5     |

---

## Goal Commands

| Command             | API Endpoint                   | Status | Complexity | Notes                                                                            |
| ------------------- | ------------------------------ | ------ | ---------- | -------------------------------------------------------------------------------- |
| `/add {text}`       | POST /goals                    | ✅      | Easy       | Supports multi-line for multiple goals                                           |
| `/list`             | GET /goals                     | ✅      | Easy       | Basic formatting only - doesn't show due dates, scheduled, recurring markers yet |
| `/complete {n}`     | POST /goals/{index}/complete   | ✅      | Easy       | Single index only - Lambda supports multiple (`/complete 1 2 3`)                 |
| `/uncomplete {n}`   | DELETE /goals/{index}/complete | ✅      | Easy       |                                                                                  |
| `/delete {n}`       | DELETE /goals/{index}          | ✅      | Easy       | Single index only                                                                |
| `/edit {n} {text}`  | PUT /goals/{index}             | ✅      | Easy       | Uses `argsText` from Extract Command                                             |
| `/swap {n1} {n2}`   | PUT /goals/swap                | ✅      | Medium     | Uses `argsAsIndex` + `argsAsSecondIndex`                                         |
| `/move {from} {to}` | PUT /goals/{index}/position    | ✅      | Medium     | Uses `argsAsIndex` + `argsAsSecondIndex`                                         |
| `/note {n} {text}`  | POST /goals/{index}/notes      | ✅      | Medium     | Uses `argsAsIndex` + `argsText`                                                  |
| `/details {n}`      | GET /goals (filtered)          | ✅      | Medium     | Shows goal with metadata (due date, scheduled, recurring) + notes                |

---

## Scheduling Commands

| Command                    | API Endpoint                  | Status | Complexity | Notes                                                                      |
| -------------------------- | ----------------------------- | ------ | ---------- | -------------------------------------------------------------------------- |
| `/schedule {n} {MM DD}`    | POST /goals/{index}/schedule  | ✅      | Medium     | Uses `argsAsDate` (MM DD → YYYY-MM-DD)                                     |
| `/due {n} {MM DD}`         | PUT /goals/{index}/due-date   | ✅      | Medium     | Uses `argsAsDate` (MM DD → YYYY-MM-DD)                                     |
| `/recurring {n} {pattern}` | POST /goals/{index}/recurring | ✅      | Hard       | Uses `argsAsCron` - maps daily/weekdays/weekends or raw cron               |

---

## Rewards & Wallet Commands

| Command       | API Endpoint                    | Status | Complexity | Notes                                 |
| ------------- | ------------------------------- | ------ | ---------- | ------------------------------------- |
| `/wallet`     | GET /users/{chatId}/tickets     | ✅      | Easy       |                                       |
| `/rewards`    | GET /rewards                    | ⏳      | Medium     | Need to format reward list with costs |
| `/redeem {n}` | POST /rewards/{rewardId}/redeem | ⏳      | Medium     | Need to look up reward ID from index  |

---

## Partner Commands

| Command    | API Endpoint                      | Status | Complexity | Notes                                                                 |
| ---------- | --------------------------------- | ------ | ---------- | --------------------------------------------------------------------- |
| `/honey`   | GET /goals/partner OR POST /goals | ⏳      | Hard       | Dual behavior: no args = list partner goals, with args = add honey-do |
| `/partner` | GET/POST /users/{chatId}/partner  | ⏳      | Hard       | Complex flow: show status, link/unlink partner                        |

---

## Utility Commands

| Command  | API Endpoint    | Status | Complexity | Notes                   |
| -------- | --------------- | ------ | ---------- | ----------------------- |
| `/help`  | (none - static) | ✅      | Easy       | Static text response    |
| `/start` | POST /users     | ⏳      | Easy       | Auto-register new users |

---

## System Workflows (Scheduled)

| Workflow       | API Endpoint                             | Status | Complexity | Notes                                       |
| -------------- | ---------------------------------------- | ------ | ---------- | ------------------------------------------- |
| Daily Rollover | POST /system/rollover                    | ⏳      | Medium     | Scheduled trigger, no user interaction      |
| Daily Reminder | GET /system/notifications/reminder-users | ⏳      | Medium     | Scheduled trigger, sends reminders to users |

---

## Implementation Notes

### Extract Command Output
The `Extract Command` node provides these fields for use in downstream nodes:

| Field               | Description                        | Example                             |
| ------------------- | ---------------------------------- | ----------------------------------- |
| `command`           | The command without `/`            | `"edit"`                            |
| `args`              | Everything after command           | `"1 New goal text"`                 |
| `argsAsIndex`       | First arg as 0-based index         | `0`                                 |
| `argsAsSecondIndex` | Second arg as 0-based index        | `2` (for `/swap 1 3`)               |
| `argsText`          | Text after first arg               | `"New goal text"`                   |
| `argsAsDate`        | MM DD parsed to YYYY-MM-DD         | `"2025-01-15"` (for `/due 1 01 15`) |
| `argsAsCron`        | Pattern mapped to cron expression  | `"0 9 * * 1-5"` (for `weekdays`)    |
| `chatId`            | User's Telegram chat ID            | `"1397659260"`                      |
| `name`              | User's first name                  | `"Brendan"`                         |
| `baseUrl`           | API base URL                       | `"https://...lambda-url.../api/v1"` |

### Complexity Guide

| Level      | Description                                             |
| ---------- | ------------------------------------------------------- |
| **Easy**   | Simple HTTP call + response formatting                  |
| **Medium** | Requires arg parsing, date handling, or list formatting |
| **Hard**   | Conditional logic, multiple API calls, or complex state |

### Known Limitations vs Lambda Bot

1. **Multi-index commands**: Lambda supports `/complete 1 2 3`, n8n currently only handles single index
2. **List formatting**: Lambda shows due dates, scheduled markers (🗓️), recurring markers (🔄) - n8n shows basic list only
3. **AI integration**: Lambda has OpenAI chat integration - not migrated to n8n
4. **Error handling**: Lambda has comprehensive error messages - n8n returns raw API errors
 
---

## Next Priority

Recommended order for remaining commands:

1. `/rewards` and `/redeem` - Complete the reward flow
2. `/honey` and `/partner` - More complex partner features
3. Enhanced `/list` formatting - Add due date/scheduled/recurring indicators
4. `/start` - User registration (easy)
