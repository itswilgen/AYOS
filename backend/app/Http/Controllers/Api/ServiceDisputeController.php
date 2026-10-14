<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProviderWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ServiceDisputeController extends Controller
{
    public function __construct(private ProviderWorkspace $workspace) {}

    public function store(Request $request, int $jobId): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'in:quality,provider_no_show,customer_no_show,payment,damage,conduct,other'],
            'description' => ['required', 'string', 'min:20', 'max:3000'],
            'evidence' => ['nullable', 'array', 'max:4'],
            'evidence.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);
        $userId = (int) $request->user()->id;
        $stored = [];
        try {
            $disputeId = DB::transaction(function () use ($data, $jobId, $userId, &$stored): int {
                $job = DB::table('provider_jobs as j')->join('provider_profiles as p', 'p.id', '=', 'j.provider_profile_id')
                    ->where('j.id', $jobId)->lockForUpdate()->select('j.*', 'p.user_id as provider_user_id')->first();
                abort_unless($job && ((int) $job->customer_id === $userId || (int) $job->provider_user_id === $userId), 404);
                abort_if($job->status === 'cancelled', 409, 'A cancelled job cannot be disputed.');
                abort_if(DB::table('service_disputes')->where('provider_job_id', $jobId)->exists(), 409, 'A dispute already exists for this job.');
                $id = DB::table('service_disputes')->insertGetId([
                    'provider_job_id' => $jobId, 'provider_profile_id' => $job->provider_profile_id,
                    'customer_id' => $job->customer_id, 'opened_by' => $userId, 'reason' => $data['reason'],
                    'description' => trim($data['description']), 'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
                ]);
                foreach ($data['evidence'] ?? [] as $file) {
                    $path = $file->store('service-disputes/'.$id, 'local');
                    $stored[] = $path;
                    DB::table('service_dispute_evidence')->insert([
                        'service_dispute_id' => $id, 'uploaded_by' => $userId, 'path' => $path,
                        'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                $providerName = DB::table('provider_profiles')->where('id', $job->provider_profile_id)->value('display_name');
                $this->workspace->notify((int) $job->provider_profile_id, 'A service dispute was opened', 'AYOS is reviewing a concern about a service job.', '/provider/requests');
                if ((int) $job->customer_id !== $userId) {
                    $this->workspace->notifyCustomer((int) $job->customer_id, 'A service dispute was opened', 'AYOS is reviewing a concern about your service.', '/my-requests');
                }

                return $id;
            });
        } catch (Throwable $exception) {
            foreach ($stored as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json(['id' => $disputeId, 'status' => 'open'], 201);
    }
}
