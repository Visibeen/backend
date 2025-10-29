# Task Scheduling System

## Overview
The task scheduling system ensures that tasks are only visible to clients and notifications are only sent when the scheduled date and time arrive.

## How It Works

### 1. **Task Creation with Scheduling**
When an admin creates a task with a future date/time:
- The task is created in the database immediately
- **Notifications are NOT sent immediately** if the task is scheduled for the future
- A log message indicates: `⏰ Task scheduled for [date] [time] - notifications will be sent at scheduled time`

### 2. **Task Visibility to Clients**
Clients can only see tasks that meet one of these conditions:
- Task has **no scheduled date** (shows immediately)
- Task's **scheduled date/time has arrived** or passed

**Affected Endpoints:**
- `GET /api/customer/task/my-tasks` - Client's all tasks
- `GET /api/customer/task/profile-tasks` - Tasks for specific profile

**Admin View:**
- Admins can see ALL tasks (including future scheduled ones) via:
  - `GET /api/admin/tasks/get-tasks`
  - `GET /api/admin/tasks/client/:clientId`

### 3. **Scheduled Notification System**

#### Automatic Scheduler (Recommended)
A **cron job** runs every **10 minutes** to:
1. Find all pending tasks with scheduled dates
2. Check if their scheduled time has arrived
3. Send WhatsApp and email notifications
4. Mark notifications as sent

**Cron Schedule:** `*/10 * * * *` (every 10 minutes)

**How to Change Frequency:**
Edit `backend/utils/taskScheduler.js` and change the cron pattern:
- Every 5 minutes: `*/5 * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every hour: `0 * * * *`

#### Manual Trigger (For Testing/Debugging)
You can manually trigger the notification processor:
```bash
POST /api/admin/tasks/process-scheduled-notifications
Authorization: Bearer [admin_token]
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 scheduled tasks",
  "data": {
    "processedCount": 3,
    "notificationsSent": 6
  }
}
```

## Examples

### Example 1: Task Scheduled for Tomorrow
**Admin creates task:**
- Assign Date: `2025-10-29`
- Assign Time: `14:00`

**What happens:**
1. ✅ Task created in database
2. ❌ No notifications sent yet
3. ❌ Client cannot see the task yet
4. ⏰ Log: "Task scheduled for 2025-10-29 14:00"

**On 2025-10-29 at 14:00 (when cron runs):**
1. ✅ Notifications sent (WhatsApp + Email)
2. ✅ Client can now see the task
3. ✅ Task appears in client's task list

### Example 2: Task Scheduled for Today (Past Time)
**Admin creates task:**
- Assign Date: `2025-10-28`
- Assign Time: `10:00`
- Current Time: `15:00` (5 hours later)

**What happens:**
1. ✅ Task created in database
2. ✅ Notifications sent **immediately** (scheduled time already passed)
3. ✅ Client can see the task **immediately**

### Example 3: Task with No Schedule
**Admin creates task:**
- Assign Date: `(empty)`
- Assign Time: `(empty)`

**What happens:**
1. ✅ Task created in database
2. ✅ Notifications sent **immediately**
3. ✅ Client can see the task **immediately**

## Technical Details

### Helper Function
```javascript
isTaskScheduledForNowOrPast(assignDate, assignTime)
```
- Returns `true` if task should be visible/sent now
- Returns `false` if task is scheduled for future
- Handles missing dates/times gracefully

### Database Fields Used
- `assign_date` - Date in YYYY-MM-DD format
- `assign_time` - Time in HH:MM format (24-hour)
- `updated_at` - Used to prevent duplicate notifications

### Notification Logic
To prevent duplicate notifications:
1. Check if task was created < 5 minutes ago
2. Check if `created_at` == `updated_at` (not yet processed)
3. Skip if both conditions are true (notifications already sent at creation)

## Monitoring

### Server Logs
Look for these log messages:

**Task Creation:**
```
⏰ Task 123 scheduled for 2025-10-29 14:00 - notifications will be sent at scheduled time
```

**Scheduler Running:**
```
⏰ [TASK SCHEDULER] Running scheduled task notification check...
```

**Notifications Sent:**
```
📱 Scheduled WhatsApp notification sent for task 123
✉️ Scheduled email notification sent for task 123
```

**Scheduler Complete:**
```
✅ [TASK SCHEDULER] Notification check complete: 3 tasks processed, 6 notifications sent
```

## Troubleshooting

### Issue: Notifications not being sent
**Check:**
1. Is the server running? (Scheduler only runs when server is up)
2. Check server logs for scheduler messages
3. Verify task has `assign_date` set
4. Manually trigger: `POST /api/admin/tasks/process-scheduled-notifications`

### Issue: Tasks showing up early
**Check:**
1. Verify server timezone matches your timezone
2. Check `assign_date` and `assign_time` format in database
3. Review server logs for any errors in `isTaskScheduledForNowOrPast`

### Issue: Duplicate notifications
**Possible causes:**
1. Scheduler running multiple times (check for duplicate processes)
2. Task being updated frequently (resets `updated_at`)

**Solution:**
- Add a dedicated `notifications_sent_at` field to task model (future enhancement)

## Future Enhancements

1. **Add `notifications_sent_at` field** to track when notifications were sent more reliably
2. **Timezone support** - Store and use client's timezone for scheduling
3. **Notification retry logic** - Retry failed notifications
4. **Scheduled notification queue** - Use job queue system (Bull, Bee-Queue) for better reliability
5. **Notification preferences** - Let clients choose notification methods

