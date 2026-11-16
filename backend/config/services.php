<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8010/auth/google/callback'),
    ],
    // get captcha secret key from .env
    'recaptcha' => [
        'secret' => env('RECAPTCHA_SECRET_KEY'),
    ],

    // PayMongo (Philippine payment gateway) for the provider activation fee: hosted checkout + signed webhooks.
    // Test keys start with sk_test_; the webhook secret comes from the webhook you create in the PayMongo dashboard.
    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
        'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com/v1'),
        // Must be methods enabled on your PayMongo account (Settings > Payment Methods).
        'payment_methods' => array_values(array_filter(array_map('trim', explode(',', (string) env('PAYMONGO_PAYMENT_METHODS', 'gcash,paymaya,card'))))),
        'signature_tolerance_seconds' => (int) env('PAYMONGO_SIGNATURE_TOLERANCE', 600),
    ],

];
