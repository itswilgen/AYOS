<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Conversations;
use App\Services\ProviderWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves both sides of a conversation. Routes named `provider.*` act as the provider's workspace,
 * every other route acts as the customer.
 */
class ConversationController extends Controller
{
    public function __construct(private Conversations $conversations, private ProviderWorkspace $workspace) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->conversations->list($request->user()->id, $this->side($request))]);
    }

    /**
     * A customer opens (or reopens) the thread with a provider. New threads need a provider who takes requests.
     */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate(['providerId' => ['required', 'integer', Rule::exists('provider_profiles', 'id')]]);
        $userId = $request->user()->id;
        $provider = DB::table('provider_profiles')->where('id', $data['providerId'])->first();
        abort_if($provider->user_id === $userId, 422, 'You can’t message your own provider profile.');
        $existing = DB::table('conversations')->where('customer_id', $userId)->where('provider_profile_id', $provider->id)->first();
        abort_unless($existing || $this->workspace->canReceive($provider), 409, 'This provider isn’t taking new messages right now.');

        return response()->json(['id' => (string) ($existing ?? $this->conversations->open($userId, $provider->id))->id], $existing ? 200 : 201);
    }

    /**
     * A provider opens the thread with a customer who sent them a request.
     */
    public function startForRequest(Request $request): JsonResponse
    {
        $data = $request->validate(['requestId' => ['required', 'integer']]);
        $profile = $this->workspace->approved($request->user()->id);
        $customerId = DB::table('service_requests')->where('id', $data['requestId'])->where('provider_profile_id', $profile->id)->value('customer_id');
        abort_unless($customerId, 404);

        return response()->json(['id' => (string) $this->conversations->open($customerId, $profile->id)->id]);
    }

    public function messages(Request $request, int $conversationId): JsonResponse
    {
        $after = $request->validate(['after' => ['nullable', 'integer', 'min:0']])['after'] ?? 0;
        $side = $this->side($request);
        $conversation = $this->conversations->forParticipant($conversationId, $request->user()->id, $side);

        return response()->json($this->conversations->thread($conversation, $side, (int) $after));
    }

    public function send(Request $request, int $conversationId): JsonResponse
    {
        $side = $this->side($request);
        $conversation = $this->conversations->forParticipant($conversationId, $request->user()->id, $side);
        $data = $request->validate([
            'body' => ['nullable', 'required_without:image', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
        ], ['body.required_without' => 'Write a message or add a photo.']);
        abort_unless(DB::table('provider_profiles')->where('id', $conversation->provider_profile_id)->value('status') === 'approved', 409,
            'This provider can’t receive messages right now.');
        $id = $this->conversations->send($conversation, $side, $request->user()->id, $data['body'] ?? null, $request->file('image'));

        return response()->json(['id' => (string) $id, ...$this->conversations->thread($conversation, $side, $id - 1)], 201);
    }

    public function read(Request $request, int $conversationId): JsonResponse
    {
        $side = $this->side($request);
        $this->conversations->markRead($this->conversations->forParticipant($conversationId, $request->user()->id, $side), $side);

        return response()->json(['status' => 'read']);
    }

    public function image(Request $request, int $conversationId, int $messageId): StreamedResponse
    {
        $conversation = $this->conversations->forParticipant($conversationId, $request->user()->id, $this->side($request));
        $path = $this->conversations->image($conversation, $messageId);
        abort_unless($path, 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function unread(Request $request): JsonResponse
    {
        return response()->json($this->conversations->unreadCounts($request->user()->id));
    }

    private function side(Request $request): string
    {
        return $request->routeIs('provider.*') ? 'provider' : 'customer';
    }
}
