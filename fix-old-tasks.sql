-- =====================================================
-- SQL Script to Mark Old Pending Tasks as Notified
-- Run this ONCE after deploying the notification fix
-- =====================================================

-- Step 1: Check current status
SELECT 
    '=== BEFORE FIX ===' as status,
    COUNT(*) as total_pending_tasks,
    SUM(CASE WHEN notifications_sent = 0 OR notifications_sent IS NULL THEN 1 ELSE 0 END) as unnotified_tasks,
    SUM(CASE WHEN notifications_sent = 1 THEN 1 ELSE 0 END) as notified_tasks
FROM tasks
WHERE status = 'pending' AND assign_date IS NOT NULL;

-- Step 2: Preview tasks that will be updated
SELECT 
    id,
    title,
    status,
    assign_date,
    notifications_sent,
    notification_sent_at,
    created_at
FROM tasks
WHERE status = 'pending' 
    AND assign_date IS NOT NULL
    AND (notifications_sent = 0 OR notifications_sent IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Update all old pending tasks to mark as notified
-- This prevents duplicate emails from being sent
UPDATE tasks
SET 
    notifications_sent = 1,
    notification_sent_at = NOW()
WHERE status = 'pending' 
    AND assign_date IS NOT NULL
    AND (notifications_sent = 0 OR notifications_sent IS NULL);

-- Step 4: Verify the fix
SELECT 
    '=== AFTER FIX ===' as status,
    COUNT(*) as total_pending_tasks,
    SUM(CASE WHEN notifications_sent = 0 OR notifications_sent IS NULL THEN 1 ELSE 0 END) as unnotified_tasks,
    SUM(CASE WHEN notifications_sent = 1 THEN 1 ELSE 0 END) as notified_tasks
FROM tasks
WHERE status = 'pending' AND assign_date IS NOT NULL;

-- Step 5: Show summary of updated tasks
SELECT 
    DATE(created_at) as task_date,
    COUNT(*) as tasks_marked_notified
FROM tasks
WHERE status = 'pending' 
    AND assign_date IS NOT NULL
    AND notifications_sent = 1
    AND notification_sent_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
GROUP BY DATE(created_at)
ORDER BY task_date DESC;

-- ✅ Done! Old tasks are now marked as notified and won't send duplicate emails.

