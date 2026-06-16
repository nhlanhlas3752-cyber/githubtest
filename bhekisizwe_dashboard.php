<?php
/* ── Match session cookie settings from login ── */
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* ── Security headers on the dashboard ── */
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
/* NOTE: 'unsafe-inline' is temporary — move inline scripts to external JS files to tighten this */
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");

/* ── Not logged in ── */
if (!isset($_SESSION['bhs_admin_user'])) {
    header('Location: admin-login.php');
    exit;
}

/* ── Inactivity timeout: 30 minutes ── */
if (isset($_SESSION['bhs_admin_last_active']) &&
    (time() - $_SESSION['bhs_admin_last_active']) > 1800) {
    session_unset(); session_destroy();
    header('Location: admin-login.php?timeout=1');
    exit;
}

/* ── Absolute timeout: 8 hours ── */
if (isset($_SESSION['bhs_admin_login_time']) &&
    (time() - $_SESSION['bhs_admin_login_time']) > 28800) {
    session_unset(); session_destroy();
    header('Location: admin-login.php?timeout=1');
    exit;
}

$_SESSION['bhs_admin_last_active'] = time();

/* ── Ensure CSRF token exists ── */
if (empty($_SESSION['bhs_csrf_token'])) {
    $_SESSION['bhs_csrf_token'] = bin2hex(random_bytes(32));
}

$adminName  = htmlspecialchars($_SESSION['bhs_admin_name'] ?? 'Admin');
$adminRole  = htmlspecialchars($_SESSION['bhs_admin_role'] ?? 'admin');
$roleLabel  = $adminRole === 'principal' ? 'Principal' : 'Administrator';
$csrfToken  = $_SESSION['bhs_csrf_token'];
?>
<script>
/* Admin session info — injected by PHP, used by dashboard JS */
window._bhsAdmin = {
  name:  <?php echo json_encode($adminName); ?>,
  role:  <?php echo json_encode($adminRole); ?>,
  label: <?php echo json_encode($roleLabel); ?>
};
/* CSRF token — sent with every state-changing API call */
window._csrfToken = <?php echo json_encode($csrfToken); ?>;
</script>
<?php include __DIR__ . '/bhekisizwe_dashboard.html'; ?>
