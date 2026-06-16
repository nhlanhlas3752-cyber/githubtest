<?php
header('Content-Type: application/json');
require __DIR__ . '/auth_check.php';   /* session auth + CSRF + security headers */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require __DIR__ . '/db.php';

$id      = (int)($_POST['id']    ?? 0);
$status  = trim($_POST['status'] ?? '');
$allowed = ['Pending', 'In Review', 'Approved', 'Rejected'];

if (!$id || !in_array($status, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request']);
    exit;
}

/* Fetch the current status before updating (needed for audit log) */
$prev = $pdo->prepare("SELECT status FROM applications WHERE id = ?");
$prev->execute([$id]);
$oldStatus = $prev->fetchColumn();

if ($oldStatus === false) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Application not found']);
    exit;
}

/* Update the application status */
$pdo->prepare("UPDATE applications SET status = ? WHERE id = ?")->execute([$status, $id]);

/* Write an immutable audit log entry */
$pdo->prepare(
    "INSERT INTO audit_log (admin_user, action, target_id, old_value, new_value, ip)
     VALUES (?, 'status_change', ?, ?, ?, ?)"
)->execute([
    $_SESSION['bhs_admin_user'] ?? 'unknown',
    $id,
    $oldStatus,
    $status,
    $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
]);

echo json_encode(['success' => true]);
