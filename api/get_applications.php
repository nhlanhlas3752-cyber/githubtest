<?php
header('Content-Type: application/json');
require __DIR__ . '/auth_check.php';   /* session auth + CSRF + security headers */
require __DIR__ . '/db.php';

$rows = $pdo->query("SELECT * FROM applications ORDER BY submitted_at DESC")->fetchAll();
echo json_encode(['success' => true, 'data' => $rows]);
