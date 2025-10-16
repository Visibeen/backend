-- Add is_visible_to_client column to tasks table
USE visibeen_gmb;

ALTER TABLE tasks 
ADD COLUMN is_visible_to_client BOOLEAN NOT NULL DEFAULT TRUE 
COMMENT 'Whether task is visible to client on TaskManagement page';

-- Verify column was added
DESCRIBE tasks;
