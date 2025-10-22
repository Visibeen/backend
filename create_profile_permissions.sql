USE e2egroup;

CREATE TABLE IF NOT EXISTS profile_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL COMMENT 'User email who has permission',
  profile_id VARCHAR(255) NOT NULL COMMENT 'GMB location ID / profile ID',
  added_by INT NULL COMMENT 'Admin user ID who granted this permission',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_profile_id (profile_id),
  UNIQUE KEY unique_email_profile (email, profile_id),
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
SHOW TABLES LIKE 'profile_permissions';
DESCRIBE profile_permissions;
