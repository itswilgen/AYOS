<?php

$fee = env('PROVIDER_ACTIVATION_FEE');

return [
    'free_client_limit' => max(1, (int) env('PROVIDER_FREE_CLIENT_LIMIT', 10)),
    'activation_fee' => is_numeric($fee) && (int) $fee > 0 ? (int) $fee : null,
];
