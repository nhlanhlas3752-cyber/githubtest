<?php
/**
 * IP-based rate limiting using the database.
 *
 * Usage:  enforceRateLimit($pdo, 'login', 15, 900);
 *         Allows max 15 attempts per 900-second (15-min) window per IP.
 *         Sends a 429 JSON response and exits if the limit is exceeded.
 *
 * Requires the rate_limits table (see setup_db.sql).
 */
function enforceRateLimit(PDO $pdo, string $endpoint, int $maxAttempts, int $windowSeconds): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    /* Read current record for this IP + endpoint */
    $stmt = $pdo->prepare(
        "SELECT attempts, UNIX_TIMESTAMP(window_start) AS ws
         FROM rate_limits
         WHERE ip = ? AND endpoint = ?"
    );
    $stmt->execute([$ip, $endpoint]);
    $row  = $stmt->fetch();
    $now  = time();

    if (!$row || ($now - (int)$row['ws']) >= $windowSeconds) {
        /* No record or window has expired — start a fresh window */
        $pdo->prepare(
            "INSERT INTO rate_limits (ip, endpoint, attempts, window_start)
             VALUES (?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE attempts = 1, window_start = NOW()"
        )->execute([$ip, $endpoint]);
        return; /* First attempt in window — always allow */
    }

    if ((int)$row['attempts'] >= $maxAttempts) {
        $retryAfter = $windowSeconds - ($now - (int)$row['ws']);
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: ' . max(1, $retryAfter));
        echo json_encode([
            'success' => false,
            'error'   => 'Too many requests. Please wait before trying again.',
        ]);
        exit;
    }

    /* Increment the counter within the current window */
    $pdo->prepare(
        "UPDATE rate_limits SET attempts = attempts + 1 WHERE ip = ? AND endpoint = ?"
    )->execute([$ip, $endpoint]);
}
