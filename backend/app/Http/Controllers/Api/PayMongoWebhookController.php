<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivationPayments;
use App\Services\PayMongo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PayMongo calls this when a hosted checkout is paid. Nothing is trusted until the `Paymongo-Signature`
 * header matches the raw body; then a paid checkout confirms the provider's activation payment (once).
 * Other event types are acknowledged and ignored so PayMongo does not keep retrying them.
 */
class PayMongoWebhookController extends Controller
{
    public function __invoke(Request $request, PayMongo $payMongo, ActivationPayments $payments): JsonResponse
    {
        $raw = $request->getContent();
        $event = json_decode($raw, true);
        $livemode = (bool) data_get($event, 'data.attributes.livemode', false);
        if (! is_array($event) || ! $payMongo->validSignature($raw, $request->header('Paymongo-Signature'), $livemode)) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        if (data_get($event, 'data.attributes.type') === 'checkout_session.payment.paid') {
            $session = (array) data_get($event, 'data.attributes.data', []);
            $payments->confirmFromSession($session, $request);
        }

        return response()->json(['received' => true]);
    }
}
