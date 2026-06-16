<?php
/* One-time installer — deletes itself after running */
if (($_GET['key'] ?? '') !== 'bhs-setup-2026') { http_response_code(403); exit('Forbidden'); }

$pdo = new PDO('mysql:host=localhost;dbname=bhekisi1_school;charset=utf8mb4',
               'bhekisi1_schooluser', 'BhsDb@2026!',
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$statements = [
    /* applications table — add ref_code if missing */
    "CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ref_code VARCHAR(20) NOT NULL,
      learner_name VARCHAR(200) NOT NULL,
      dob DATE NOT NULL,
      gender VARCHAR(50), id_number VARCHAR(50), language VARCHAR(100),
      nationality VARCHAR(100), grade VARCHAR(20) NOT NULL, prev_school VARCHAR(200),
      guardian_name VARCHAR(200) NOT NULL, relationship VARCHAR(50), guardian_id VARCHAR(50),
      phone VARCHAR(30), email VARCHAR(200), address TEXT, occupation VARCHAR(100),
      emergency VARCHAR(30), medical TEXT, needs TEXT,
      doc_birth VARCHAR(255), doc_report VARCHAR(255), doc_proof VARCHAR(255),
      status ENUM('Pending','In Review','Approved','Rejected') DEFAULT 'Pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_ref_code (ref_code),
      INDEX idx_status (status), INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    /* admins table */
    "CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(200) NOT NULL,
      role ENUM('admin','principal') DEFAULT 'admin',
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME NULL,
      last_login DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    /* rate_limits table */
    "CREATE TABLE IF NOT EXISTS rate_limits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ip VARCHAR(45) NOT NULL,
      endpoint VARCHAR(100) NOT NULL,
      attempts INT NOT NULL DEFAULT 1,
      window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_ip_endpoint (ip, endpoint),
      INDEX idx_window (window_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    /* audit_log table */
    "CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_user VARCHAR(100) NOT NULL,
      action VARCHAR(50) NOT NULL,
      target_id INT NULL,
      old_value VARCHAR(100) NULL,
      new_value VARCHAR(100) NULL,
      ip VARCHAR(45) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin (admin_user), INDEX idx_target (target_id), INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    /* Default principal account */
    "INSERT IGNORE INTO admins (username, password_hash, full_name, role) VALUES
     ('admin', '\$2y\$10\$5uENlP9zwbzeQ2uYTmNKiePQmDBpImPfZ0SLDA72IC7S3AXZHGOmG', 'Mr S.E. Mbokazi', 'principal')",
];

$results = [];
foreach ($statements as $sql) {
    try { $pdo->exec($sql); $results[] = "OK: " . substr(trim($sql), 0, 60) . "…"; }
    catch (PDOException $e) { $results[] = "ERR: " . $e->getMessage(); }
}

/* Self-destruct */
@unlink(__FILE__);

echo "<pre>Installation complete:\n\n" . implode("\n", $results) . "\n\nThis file has been deleted.</pre>";
