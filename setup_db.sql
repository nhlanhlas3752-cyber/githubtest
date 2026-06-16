-- ============================================================
--  Bhekisizwe Senior Secondary School — Complete DB Schema
--  Run once in phpMyAdmin: http://localhost/phpmyadmin
--  Database > SQL tab > paste and execute
-- ============================================================

CREATE DATABASE IF NOT EXISTS bhekisizwe_school
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bhekisizwe_school;

-- ── Applications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ref_code      VARCHAR(20)   NOT NULL,
  -- Learner
  learner_name  VARCHAR(200)  NOT NULL,
  dob           DATE          NOT NULL,
  gender        VARCHAR(50),
  id_number     VARCHAR(50),
  language      VARCHAR(100),
  nationality   VARCHAR(100),
  grade         VARCHAR(20)   NOT NULL,
  prev_school   VARCHAR(200),
  -- Guardian
  guardian_name VARCHAR(200)  NOT NULL,
  relationship  VARCHAR(50),
  guardian_id   VARCHAR(50),
  phone         VARCHAR(30),
  email         VARCHAR(200),
  address       TEXT,
  occupation    VARCHAR(100),
  emergency     VARCHAR(30),
  -- Additional
  medical       TEXT,
  needs         TEXT,
  -- Uploaded documents (stored as filenames in /uploads/)
  doc_birth     VARCHAR(255),
  doc_report    VARCHAR(255),
  doc_proof     VARCHAR(255),
  -- Admin
  status        ENUM('Pending','In Review','Approved','Rejected') DEFAULT 'Pending',
  submitted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ref_code (ref_code),
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Admin Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(100)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  full_name       VARCHAR(200)  NOT NULL,
  role            ENUM('admin','principal') DEFAULT 'admin',
  failed_attempts INT           DEFAULT 0,
  locked_until    DATETIME      NULL,
  last_login      DATETIME      NULL,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── IP-based Rate Limiting ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ip           VARCHAR(45)  NOT NULL,
  endpoint     VARCHAR(100) NOT NULL,
  attempts     INT          NOT NULL DEFAULT 1,
  window_start DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ip_endpoint (ip, endpoint),
  INDEX idx_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Immutable Audit Log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  admin_user   VARCHAR(100) NOT NULL,
  action       VARCHAR(50)  NOT NULL,
  target_id    INT          NULL,
  old_value    VARCHAR(100) NULL,
  new_value    VARCHAR(100) NULL,
  ip           VARCHAR(45)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_user),
  INDEX idx_target (target_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Create a dedicated application DB user (RECOMMENDED) ─────────────
-- Replace 'StrongPassword' with a real password, then run these lines:
--
-- CREATE USER IF NOT EXISTS 'bhekisizwe_app'@'localhost' IDENTIFIED BY 'StrongPassword';
-- GRANT SELECT, INSERT, UPDATE ON bhekisizwe_school.applications TO 'bhekisizwe_app'@'localhost';
-- GRANT SELECT, INSERT, UPDATE ON bhekisizwe_school.admins       TO 'bhekisizwe_app'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bhekisizwe_school.rate_limits TO 'bhekisizwe_app'@'localhost';
-- GRANT SELECT, INSERT ON bhekisizwe_school.audit_log            TO 'bhekisizwe_app'@'localhost';
-- FLUSH PRIVILEGES;
--
-- Then update api/db.php: set $user = 'bhekisizwe_app' and $pass = 'StrongPassword'

-- ── Default admin account ─────────────────────────────────────────────
-- Generate a bcrypt hash with PHP before inserting:
--   php -r "echo password_hash('YourPassword', PASSWORD_BCRYPT);"
-- Then run:
--   INSERT INTO admins (username, password_hash, full_name, role)
--   VALUES ('admin', '<paste hash here>', 'Administrator', 'principal');
