<?php

namespace App\Services;

use App\Models\SecurityAudit;
use Illuminate\Http\Request;

class SecurityAuditLogger
{
    /** @param array<string, scalar|null> $metadata */
    public function record(string $event, ?int $userId, Request $request, array $metadata = []): void
    {
        SecurityAudit::create([
            'user_id' => $userId,
            'event_type' => $event,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000),
            'metadata' => $metadata,
        ]);
    }
}
