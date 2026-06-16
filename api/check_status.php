<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
/* Public lookup — same-origin only, no wildcard CORS */
header_remove('Access-Control-Allow-Origin');

$ref = strtoupper(trim($_GET['ref'] ?? ''));

/* Strict format validation — only accept BHSyy-XXXXXX */
if (!$ref || !preg_match('/^BHS\d{2}-[A-Z0-9]{6}$/', $ref)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid reference code format']);
    exit;
}

require __DIR__ . '/db.php';
require __DIR__ . '/rate_limit.php';

/* IP-based rate limit: max 30 lookups per 15 minutes */
enforceRateLimit($pdo, 'check_status', 30, 900);

/* Return only the fields a parent needs — no SA IDs, no document paths, no PII */
$stmt = $pdo->prepare(
    "SELECT ref_code, learner_name, grade, status, submitted_at
     FROM applications WHERE ref_code = ?"
);
$stmt->execute([$ref]);
$row = $stmt->fetch();

if (!$row) {
    echo json_encode(['success' => false, 'error' => 'Not found']);
    exit;
}

echo json_encode(['success' => true, 'data' => $row]);
