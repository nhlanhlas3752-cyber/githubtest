const {chromium} = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost/BhekisizweHighSchool/security-checklist.html');
  await p.waitForLoadState('networkidle');

  const projectId = await p.evaluate(() => {
    const proj = createProject('Bhekisizwe School System', 'Claude AI — Full Codebase Review');
    const id = proj.id;

    const items = [
      // S1 Authentication
      ['s1-1','pass','bcrypt via password_hash(PASSWORD_DEFAULT) in admin-login.php'],
      ['s1-2','fail','No server-side minimum password length enforcement'],
      ['s1-3','na','No password reset feature implemented'],
      ['s1-4','na','No password reset feature implemented'],
      ['s1-5','risk','admin@20! is only 8 characters — below recommended 12+ for admin accounts'],
      ['s1-6','fail','Error messages distinguish unknown username vs wrong password — reveals account existence'],
      ['s1-7','pass','5 failed attempts triggers 15-minute DB-tracked lockout (admins.locked_until)'],
      ['s1-8','fail','No re-authentication required before sensitive actions (approve, reject, delete)'],
      ['s1-9','fail','No MFA/2FA on any account'],
      ['s1-10','na','FIDO2/Passkeys not applicable at this scale'],
      ['s1-11','pass','No passwords logged anywhere in codebase'],
      ['s1-12','na','No API keys in use'],
      ['s1-13','pass','Credentials are school-controlled, not public data'],
      ['s1-14','fail','Missing accounts return early without dummy hash — timing attack reveals account existence'],
      // S2 Session
      ['s2-1','pass','session_regenerate_id(true) called immediately after successful login'],
      ['s2-2','pass','30-minute inactivity timeout implemented in bhekisizwe_dashboard.php'],
      ['s2-3','fail','No absolute session timeout — session persists indefinitely if user stays active'],
      ['s2-4','risk','PHP default session cookies — HttpOnly/Secure/SameSite not explicitly set via ini_set()'],
      ['s2-5','pass','session_unset() + session_destroy() both called on logout'],
      ['s2-6','pass','Session stores only: username, full_name, role, last_active'],
      ['s2-7','pass','No session IDs found in URLs'],
      // S3 SQL Injection
      ['s3-1','pass','All queries use PDO prepared statements with parameter binding throughout api/'],
      ['s3-2','na','PDO used directly — all parameterised, no ORM needed'],
      ['s3-3','risk','PDO::ATTR_EMULATE_PREPARES not explicitly set to false in db.php'],
      ['s3-4','na','No dynamic ORDER BY or LIMIT from user input'],
      ['s3-5','risk','Root MySQL user with blank password in db.php — violates least privilege'],
      ['s3-6','pass','DB errors return generic JSON — no stack traces exposed'],
      ['s3-7','risk','Single db.php credential set — no dev/staging/prod separation'],
      // S4 XSS
      ['s4-1','pass','htmlspecialchars() in PHP; _esc()/_escA() helpers in dashboard JS throughout'],
      ['s4-2','risk','PHP session values echoed into script tags via addslashes() only — not JSON-encoded'],
      ['s4-3','fail','No Content-Security-Policy header on any response'],
      ['s4-4','fail','No CSP configured'],
      ['s4-5','fail','No X-Content-Type-Options: nosniff header'],
      ['s4-6','na','No rich text or HTML editor in use'],
      ['s4-7','risk','uploads/ folder is inside web root — uploaded files directly accessible by URL'],
      ['s4-8','fail','No CSP report-uri configured'],
      ['s4-9','fail','No CSP base-uri directive'],
      // S5 CSRF
      ['s5-1','fail','No CSRF tokens in any form including admissions and all dashboard forms'],
      ['s5-2','fail','API endpoints (update_status.php, submit_application.php) have no CSRF validation'],
      ['s5-3','fail','No CSRF token implementation anywhere in the project'],
      ['s5-4','risk','Session cookies SameSite attribute not explicitly configured'],
      ['s5-5','fail','No Origin or Referer header validation on any API endpoint'],
      // S6 File Uploads
      ['s6-1','pass','File type whitelist: pdf, jpg, jpeg, png only in submit_application.php'],
      ['s6-2','fail','Extension check only — no server-side MIME inspection via PHP finfo'],
      ['s6-3','fail','Files stored in uploads/ directory inside web root — directly accessible via URL'],
      ['s6-4','pass','Filenames replaced with uniqid(field, true) — original filename discarded'],
      ['s6-5','pass','5 MB server-side size limit enforced in saveUpload()'],
      ['s6-6','risk','No .htaccess in uploads/ to block PHP execution — malicious file could execute'],
      ['s6-7','fail','No image reprocessing or metadata stripping on uploaded images'],
      ['s6-8','na','Malware scanning not applicable for school at this scale'],
      // S7 Access Control
      ['s7-1','risk','No tenant isolation check — single-school system, acceptable currently'],
      ['s7-2','pass','Session check in bhekisizwe_dashboard.php gates all dashboard access'],
      ['s7-3','pass','Strict equality (===) used in comparisons'],
      ['s7-4','pass','Session validated on every PHP page load'],
      ['s7-5','fail','CRITICAL: get_applications.php and update_status.php have NO authentication — publicly accessible'],
      ['s7-6','risk','No formal IDOR penetration testing performed'],
      ['s7-7','risk','No formal vertical privilege escalation testing performed'],
      ['s7-8','fail','No role-based granularity — Principal and Admin have identical permissions'],
      ['s7-9','pass','Default deny: unauthenticated users redirected to login page'],
      // S8 Sensitive Data
      ['s8-1','fail','No HTTPS — running on plain HTTP; credentials and PII sent unencrypted'],
      ['s8-2','na','Local development only'],
      ['s8-3','na','Local development only'],
      ['s8-4','na','Local development only'],
      ['s8-5','fail','No HSTS header — required once HTTPS is enabled on production'],
      ['s8-6','pass','No passwords or tokens found in any log output'],
      ['s8-7','risk','PHP display_errors and error_reporting not explicitly configured for production'],
      ['s8-8','fail','CRITICAL: get_applications.php returns ALL applicant PII (SA IDs, phone, medical) with zero authentication'],
      ['s8-9','na','No .env files — credentials in db.php (which itself needs protection)'],
      ['s8-10','risk','No .htaccess protecting api/ — db.php and API files potentially browsable'],
      ['s8-11','fail','No autocomplete=off on SA ID number, guardian ID, or medical fields'],
      ['s8-12','risk','SA ID numbers, guardian IDs and medical data stored as plain text — no encryption at rest'],
      ['s8-13','pass','random_int() (CSPRNG) used for reference code generation'],
      ['s8-14','pass','Only PHP built-in cryptographic functions used — no custom crypto'],
      // S9 Security Headers
      ['s9-1','fail','No Content-Security-Policy header'],
      ['s9-2','fail','No X-Frame-Options header — dashboard vulnerable to clickjacking'],
      ['s9-3','fail','No frame-ancestors in CSP'],
      ['s9-4','fail','No X-Content-Type-Options: nosniff'],
      ['s9-5','fail','No Referrer-Policy header'],
      ['s9-6','fail','No HSTS header'],
      ['s9-7','fail','No Permissions-Policy header'],
      ['s9-8','fail','Apache Server and PHP X-Powered-By headers expose version information'],
      ['s9-9','fail','No Cross-Origin-Opener-Policy header'],
      ['s9-10','fail','No Cross-Origin-Resource-Policy header'],
      // S10 Input Validation
      ['s10-1','pass','clean() + htmlspecialchars() + PDO on all inputs'],
      ['s10-2','fail','No server-side maximum length limits on text fields'],
      ['s10-3','pass','Application ID explicitly cast to int in update_status.php'],
      ['s10-4','fail','Email addresses not validated with filter_var() in submit_application.php'],
      ['s10-5','fail','SA ID numbers and phone numbers not validated for format or length server-side'],
      ['s10-6','na','No user-supplied file paths'],
      ['s10-7','pass','No shell/exec/system calls in codebase'],
      ['s10-8','na','No XML parsing'],
      ['s10-9','pass','No PHP unserialize() on untrusted data'],
      ['s10-10','risk','Login Location redirect target not validated — potential open redirect'],
      // S11 Error Handling
      ['s11-1','pass','Generic DB error message only — no stack traces or query details'],
      ['s11-2','risk','PHP display_errors not explicitly set OFF for production in code'],
      ['s11-3','pass','API errors return generic JSON messages only'],
      ['s11-4','risk','Default Apache 404 may reveal server information'],
      ['s11-5','pass','API error responses contain only generic status and error string'],
      ['s11-6','fail','Apache Server and PHP X-Powered-By version headers not hidden'],
      ['s11-7','risk','Directory listing likely enabled by default in XAMPP for uploads/ and api/'],
      // S12 Rate Limiting
      ['s12-1','fail','No per-IP rate limiting on login — only per-account lockout'],
      ['s12-2','pass','Per-account lockout after 5 attempts for 15 minutes tracked in database'],
      ['s12-3','na','No password reset endpoint'],
      ['s12-4','na','No OTP endpoint'],
      ['s12-5','fail','No rate limiting on public APIs — submit_application.php can be flooded'],
      ['s12-6','fail','No CAPTCHA or proof-of-work on public admissions form'],
      ['s12-7','fail','No monitoring or alerting for suspicious login patterns'],
      // S13 Dependencies
      ['s13-1','risk','CDN libraries not pinned to specific patch versions'],
      ['s13-2','na','No npm/composer package management'],
      ['s13-3','na','No package lock files'],
      ['s13-4','pass','Using reputable CDNs: cdnjs, unpkg, Google Fonts'],
      ['s13-5','fail','No SRI hashes on any CDN-loaded scripts or stylesheets'],
      ['s13-6','risk','AOS.js v2.3.1 (2019, unmaintained) — check for known CVEs'],
      ['s13-7','na','No CI/CD pipeline'],
      ['s13-8','na','No CI/CD pipeline'],
      ['s13-9','na','No CI/CD pipeline'],
      // S14 Infrastructure
      ['s14-1','fail','Root MySQL user with BLANK password hardcoded in api/db.php'],
      ['s14-2','risk','api/ directory may be directly browsable — no .htaccess confirmed'],
      ['s14-3','risk','No deployment checklist — migration scripts not confirmed removed'],
      ['s14-4','fail','Root MySQL with no password — identical across all environments'],
      ['s14-5','risk','No database backup strategy documented'],
      ['s14-6','na','Local development'],
      ['s14-7','na','Local development'],
      ['s14-8','na','Local development'],
      ['s14-9','na','Local development'],
      ['s14-10','risk','No deployment excludes list — dev/test files may reach production'],
      ['s14-11','na','No cloud storage'],
      ['s14-12','risk','HTTP TRACE method likely enabled by default in XAMPP Apache'],
      // S15 Logging
      ['s15-1','pass','Failed attempts tracked in admins table; last_login updated on success'],
      ['s15-2','fail','No logging of admin actions: approve/reject applications, student record changes'],
      ['s15-3','fail','IP address not logged with login attempts — only username and count'],
      ['s15-4','na','No log files written — only DB records'],
      ['s15-5','na','No log files to rotate'],
      ['s15-6','fail','No automated alerting for suspicious activity'],
      ['s15-7','fail','Status changes and admin actions not in an immutable audit trail'],
      // S16 API Security
      ['s16-1','fail','CRITICAL: get_applications.php and update_status.php accessible with NO authentication'],
      ['s16-2','na','Session cookies used — no API token authentication'],
      ['s16-3','fail','No Cache-Control: no-store on sensitive API responses containing PII'],
      ['s16-4','na','No GraphQL'],
      ['s16-5','na','No webhooks'],
      ['s16-6','fail','No rate limiting on any API endpoint'],
      ['s16-7','pass','Explicit INSERT field list prevents mass assignment in all write endpoints'],
      ['s16-8','fail','Access-Control-Allow-Origin: * on ALL API endpoints — no CORS restriction'],
      // S17 CMS
      ['s17-1','na','Not using a CMS'],['s17-2','na','n/a'],['s17-3','na','n/a'],
      ['s17-4','na','n/a'],['s17-5','na','n/a'],['s17-6','na','n/a'],
      ['s17-7','na','n/a'],['s17-8','na','n/a'],
      // S18 Pre-Launch
      ['s18-1','fail','No automated security scanner run (OWASP ZAP or Burp Suite)'],
      ['s18-2','fail','Security headers not tested — all missing (see Section 9)'],
      ['s18-3','fail','No SSL/TLS — application runs on plain HTTP'],
      ['s18-4','fail','Pre-launch sensitive file exposure check not completed'],
      ['s18-5','risk','Dev comments and localStorage boundary notes remain in production code'],
      ['s18-6','risk','localStorage used as admin data store — not suitable for production'],
      ['s18-7','fail','No custom 403 or 500 error pages'],
      ['s18-8','pass','Login page correctly blocks unauthenticated dashboard access'],
      ['s18-9','risk','IDOR testing not formally documented or completed'],
      ['s18-10','na','No .env file used'],
      ['s18-11','risk','Git history not scanned for accidentally committed credentials'],
      ['s18-12','fail','No penetration test scheduled or completed'],
      // S19 CORS
      ['s19-1','fail','Access-Control-Allow-Origin: * on all API endpoints'],
      ['s19-2','pass','Static wildcard * — Origin header not dynamically reflected'],
      ['s19-3','pass','Access-Control-Allow-Credentials header not set'],
      ['s19-4','fail','Wildcard * instead of specific allowed origin domains'],
      ['s19-5','pass','Null origin not explicitly whitelisted'],
      ['s19-6','risk','OPTIONS preflight returns 200 — full header audit not completed'],
      ['s19-7','fail','CORS not tested with a hostile origin (evil.com)'],
      // S20 SSRF
      ['s20-1','na','No server-side URL fetching'],['s20-2','na','n/a'],
      ['s20-3','na','n/a'],['s20-4','na','n/a'],['s20-5','na','n/a'],
      ['s20-6','na','n/a'],['s20-7','na','n/a'],
      // S21 Business Logic
      ['s21-1','pass','Multi-step form enforces step order; server validates required fields'],
      ['s21-2','risk','No server-side validation of extreme or negative values in CSV uploads'],
      ['s21-3','pass','Explicit INSERT field list in all DB writes prevents mass assignment'],
      ['s21-4','risk','ref_code loop retry on collision — DB UNIQUE constraint mitigates but loop could spin'],
      ['s21-5','na','No financial calculations'],
      ['s21-6','pass','ref_code INSERT atomic with UNIQUE DB constraint'],
      ['s21-7','risk','Role privilege escalation (principal vs admin same access) not formally tested'],
      ['s21-8','fail','Abuse cases not formally documented for any feature'],
      // S22 Privacy / POPIA
      ['s22-1','fail','No cookie consent banner — Google Fonts and CDN scripts load without user consent'],
      ['s22-2','fail','No cookie consent mechanism of any kind'],
      ['s22-3','pass','Only data strictly required for school admission is collected'],
      ['s22-4','fail','No self-service data export for applicants (POPIA right of access)'],
      ['s22-5','fail','No self-service deletion for applicants (POPIA right to erasure)'],
      ['s22-6','fail','No documented data retention policy'],
      ['s22-7','fail','No data breach notification procedure documented'],
      ['s22-8','risk','Google Fonts CDN processes user IP addresses — no DPA confirmed'],
      ['s22-9','fail','No real privacy policy — footer links are placeholder (#) only'],
      ['s22-10','risk','Google Fonts = international data transfer — POPIA Section 72 compliance not confirmed'],
      // S23 JWT
      ['s23-1','na','PHP sessions used — no JWTs'],['s23-2','na','n/a'],
      ['s23-3','na','n/a'],['s23-4','na','n/a'],['s23-5','na','n/a'],
      ['s23-6','na','n/a'],['s23-7','na','n/a'],['s23-8','na','n/a'],
      // S24 Design
      ['s24-1','fail','No threat model document produced'],
      ['s24-2','fail','Abuse cases not documented for any feature'],
      ['s24-3','risk','Trust boundary between public site and admin API not formally defined — same HTTP origin'],
      ['s24-4','risk','Root MySQL user with blank password violates least-privilege at architecture level'],
      ['s24-5','fail','No formal security design review conducted before implementation'],
      ['s24-6','risk','Single session check as sole access control — no defence in depth'],
      ['s24-7','pass','Fail-closed defaults: unauthenticated requests redirected to login'],
      ['s24-8','risk','All 2800+ lines of admin functionality in a single HTML file — no module separation'],
    ];

    items.forEach(([key, status, note]) => {
      proj.results[key] = status;
      if (note) proj.notes[key] = note;
    });

    proj.updatedAt = new Date().toISOString();
    saveApp();
    return proj.id;
  });

  await p.evaluate((id) => { showAudit(id); }, projectId);
  await p.waitForTimeout(1000);
  await p.screenshot({ path: '../ss_audit_checklist.png', fullPage: false });

  await p.evaluate(() => { openReport(); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: '../ss_audit_report.png', fullPage: false });

  console.log('Audit complete. Project ID:', projectId);
  await b.close();
})();
