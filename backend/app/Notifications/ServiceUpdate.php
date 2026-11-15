<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One email about a service request or job: a subject, a few short lines, and a button back to the right page in AYOS.
 * Built by App\Services\ServiceEmails, which decides who gets which update. Sent right away (Docker has no queue worker yet).
 */
class ServiceUpdate extends Notification
{
    /**
     * @param  list<string>  $lines
     */
    public function __construct(
        public string $subject,
        public array $lines,
        public string $actionText,
        public string $path,
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
        $firstName = trim(explode(' ', trim((string) ($notifiable->name ?? '')))[0] ?? '');
        $message = (new MailMessage)
            ->subject($this->subject)
            ->greeting($firstName !== '' ? "Hi {$firstName}," : 'Hi,');

        foreach ($this->lines as $line) {
            $message->line($line);
        }

        return $message
            ->action($this->actionText, rtrim((string) config('app.frontend_url'), '/').$this->path)
            ->line('You get this email because you have an AYOS account. You can also follow every update in the app.');
    }
}
