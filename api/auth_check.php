<?php
/**
 * Shared admin authentication guard for all protected API endpoints.
 * Include at the very top of any endpoint that requires admin login.
 */

/* Apply security headers to every protected API response */
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
/* Remove CORS wildcard — API is same-origin only */
header_remove('Access-Control-Allow-Origin');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/* ── Session timeout checks ── */
if (!isset($_SESSION['bhs_admin_user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in.']);
    exit;
}

/* Inactivity timeout — 30 minutes */
if (isset($_SESSION['bhs_admin_last_active']) &&
    (time() - $_SESSION['bhs_admin_last_active']) > 1800) {
    session_unset(); session_destroy();
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Session expired. Please log in again.']);
    exit;
}

/* Absolute timeout — 8 hours */
if (isset($_SESSION['bhs_admin_login_time']) &&
    (time() - $_SESSION['bhs_admin_login_time']) > 28800) {
    session_unset(); session_destroy();
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Session expired. Please log in again.']);
    exit;
}

$_SESSION['bhs_admin_last_active'] = time();

/* ── CSRF check on state-changing methods ── */
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE', 'PATCH'])) {
    $token     = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessToken = $_SESSION['bhs_csrf_token']   ?? '';
    if (!$sessToken || !hash_equals($sessToken, $token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Invalid request token. Please reload the page.']);
        exit;
    }
}
