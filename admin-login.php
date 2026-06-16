<?php
/* ── Harden session cookie before session_start ── */
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* Already logged in → go straight to dashboard */
if (isset($_SESSION['bhs_admin_user'])) {
    header('Location: bhekisizwe_dashboard.php');
    exit;
}

/* ── Security headers ── */
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

$error   = '';
$timeout = isset($_GET['timeout']);

/* Dummy hash — used when username does not exist to prevent timing attacks */
const DUMMY_HASH = '$2y$10$abcdefghijklmnopqrstuuVGZzHlKBCn5h8VlFJNivGK2e4O0mfOy';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    require __DIR__ . '/api/db.php';
    require __DIR__ . '/api/rate_limit.php';

    /* IP-based rate limit: max 15 login attempts per 15 minutes */
    enforceRateLimit($pdo, 'login', 15, 900);

    $chk = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
    $chk->execute([$username]);
    $admin = $chk->fetch();

    /* Always run a hash comparison to prevent timing attacks */
    $hashToVerify = $admin ? $admin['password_hash'] : DUMMY_HASH;
    $passwordOk   = password_verify($password, $hashToVerify);

    if ($admin && $admin['locked_until'] && new DateTime() < new DateTime($admin['locked_until'])) {
        $mins  = max(1, (int) ceil((strtotime($admin['locked_until']) - time()) / 60));
        $error = "Account locked. Try again in {$mins} minute(s).";

    } elseif ($admin && $passwordOk) {
        /* ── Successful login ── */
        $pdo->prepare(
            "UPDATE admins SET failed_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=?"
        )->execute([$admin['id']]);

        session_regenerate_id(true);
        $_SESSION['bhs_admin_user']        = $admin['username'];
        $_SESSION['bhs_admin_name']        = $admin['full_name'];
        $_SESSION['bhs_admin_role']        = $admin['role'];
        $_SESSION['bhs_admin_login_time']  = time();
        $_SESSION['bhs_admin_last_active'] = time();
        $_SESSION['bhs_admin_ip']          = $clientIp;
        $_SESSION['bhs_csrf_token']        = bin2hex(random_bytes(32));

        header('Location: bhekisizwe_dashboard.php');
        exit;

    } else {
        if ($admin) {
            $attempts = $admin['failed_attempts'] + 1;
            $lock     = $attempts >= 5 ? date('Y-m-d H:i:s', time() + 900) : null;
            $pdo->prepare(
                "UPDATE admins SET failed_attempts=?, locked_until=? WHERE id=?"
            )->execute([$attempts, $lock, $admin['id']]);
            $remaining = max(0, 5 - $attempts);
            if ($lock) {
                $error = 'Too many failed attempts. Account locked for 15 minutes.';
            } else {
                $error = 'Invalid username or password.' . ($remaining > 0 ? " {$remaining} attempt(s) remaining." : '');
            }
        } else {
            $error = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login | Bhekisizwe Senior Secondary School</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" integrity="sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw==" crossorigin="anonymous" referrerpolicy="no-referrer">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Open Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.62)),
        url('pic5.jpeg') center / cover no-repeat fixed;
    }
    .login-card {
      width: 420px;
      max-width: calc(100vw - 32px);
      background: rgba(15,15,15,0.82);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 18px;
      padding: 44px 40px 36px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 24px 80px rgba(0,0,0,0.55);
      animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes cardIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    .login-header { text-align: center; margin-bottom: 32px; }
    .login-badge { width: 72px; height: 72px; object-fit: contain; display: block; margin: 0 auto 16px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6)); }
    .login-school { font-size: 16px; font-weight: 800; color: #ffffff; line-height: 1.3; margin-bottom: 4px; }
    .login-sub { font-size: 11px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #9E9E9E; }
    .login-divider { width: 48px; height: 2px; background: #616161; border-radius: 2px; margin: 14px auto 0; }
    .alert { border-radius: 8px; padding: 11px 14px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 9px; margin-bottom: 20px; }
    .alert-error   { background: rgba(224,80,80,0.15);  border: 1px solid rgba(224,80,80,0.35);  color: #f08080; }
    .alert-warning { background: rgba(232,160,32,0.15); border: 1px solid rgba(232,160,32,0.35); color: #e8b050; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 11.5px; font-weight: 700; color: #9E9E9E; letter-spacing: 0.5px; margin-bottom: 7px; text-transform: uppercase; }
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #555; font-size: 13px; pointer-events: none; }
    .field input { width: 100%; padding: 12px 14px 12px 40px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; color: #fff; font-family: 'Open Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s, background 0.2s; }
    .field input:focus { border-color: #616161; background: rgba(255,255,255,0.09); }
    .field input::placeholder { color: #555; }
    .pw-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #555; font-size: 13px; cursor: pointer; padding: 4px; transition: color 0.2s; }
    .pw-toggle:hover { color: #aaa; }
    .field input[type=password] { padding-right: 40px; }
    .login-btn { width: 100%; padding: 13px; background: #616161; color: #fff; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 700; border: none; border-radius: 9px; cursor: pointer; transition: background 0.2s, transform 0.15s; display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 8px; }
    .login-btn:hover { background: #1A1A1A; }
    .login-btn:active { transform: scale(0.98); }
    .login-notice { text-align: center; font-size: 11px; color: #555; margin-top: 24px; line-height: 1.6; }
  </style>
</head>
<body>
<div class="login-card">
  <div class="login-header">
    <img src="Badge .jpeg" alt="Bhekisizwe Badge" class="login-badge" onerror="this.style.display='none'">
    <div class="login-school">Bhekisizwe Senior Secondary School</div>
    <div class="login-sub">Admin Portal</div>
    <div class="login-divider"></div>
  </div>

  <?php if ($timeout): ?>
  <div class="alert alert-warning"><i class="fas fa-clock"></i> Session expired. Please sign in again.</div>
  <?php endif; ?>
  <?php if ($error): ?>
  <div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>

  <form method="POST" autocomplete="off">
    <div class="field">
      <label>Username</label>
      <div class="field-wrap">
        <i class="fas fa-user field-icon"></i>
        <input type="text" name="username" placeholder="Enter your username"
               value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>"
               autocomplete="username" required autofocus>
      </div>
    </div>
    <div class="field">
      <label>Password</label>
      <div class="field-wrap">
        <i class="fas fa-lock field-icon"></i>
        <input type="password" name="password" id="pwField" placeholder="Enter your password"
               autocomplete="current-password" required>
        <button type="button" class="pw-toggle" onclick="togglePw()" title="Show/hide password">
          <i class="fas fa-eye" id="pwIcon"></i>
        </button>
      </div>
    </div>
    <button type="submit" class="login-btn"><i class="fas fa-sign-in-alt"></i> Sign In to Dashboard</button>
  </form>

  <div class="login-notice">
    <i class="fas fa-shield-alt"></i>
    Access restricted to authorised school personnel only.<br>
    Unauthorised access attempts are logged.
  </div>
</div>
<script>
function togglePw() {
  const f = document.getElementById('pwField');
  const i = document.getElementById('pwIcon');
  if (f.type === 'password') { f.type = 'text'; i.className = 'fas fa-eye-slash'; }
  else { f.type = 'password'; i.className = 'fas fa-eye'; }
}
</script>
</body>
</html>
