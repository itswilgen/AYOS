<?php

namespace App\Notifications;

use Carbon\CarbonInterface;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Alerts an administrator that their password changed. The admin console skips the current-password check,
 * so this email is how they learn about a change they didn't make. Sent right away rather than queued.
 */
class AdminPasswordChanged extends Notification
{
    public function __construct(
        public CarbonInterface $changedAt,
        public ?string $ipAddress,
        public string $device,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $changedAt = $this->changedAt->copy()->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A');

        return (new MailMessage)
            ->subject('Your AYOS admin password was changed')
            ->line('The password for your AYOS admin account was changed.')
            ->line("When: {$changedAt} (Philippine time)")
            ->line('Device: '.$this->device)
            ->line('IP address: '.($this->ipAddress ?? 'Unknown'))
            ->line("If this wasn't you, reset your password from the sign-in page right away and contact the AYOS operations team.");
    }
}
