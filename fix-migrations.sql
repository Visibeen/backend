-- Fix migration status for columns that already exist
-- Run this SQL script to mark migrations as completed

-- Mark the problematic migrations as completed
INSERT INTO SequelizeMeta (name) VALUES ('20241016-add-task-created-by-type.js')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20241016-add-task-visibility.js')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20241016-update-tasks-assign-date-time.js')
ON DUPLICATE KEY UPDATE name = name;

-- Now you can run: npx sequelize-cli db:migrate
-- This will skip the already-completed migrations and run the new performance indexes migration
