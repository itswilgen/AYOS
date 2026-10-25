<?php

namespace App\Services;

/**
 * Hides phone numbers, emails and chat-app links from messages sent before a booking is accepted,
 * so first contact and the work itself stay inside AYOS requests.
 */
class ContactMasker
{
    public const PLACEHOLDER = '[hidden until booking]';

    private const PATTERNS = [
        // Emails, including "name at gmail dot com" spellings.
        '/[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Z]{2,}/i',
        // Messenger, WhatsApp, Telegram, Viber and Facebook profile links.
        '/\b(?:https?:\/\/)?(?:www\.)?(?:m\.me|wa\.me|t\.me|viber\.click|(?:m\.)?facebook\.com|fb\.com)\/\S+/i',
        // PH mobiles: 09XX…, +63 9XX…, 63 9XX…, with any spacing or punctuation between digits.
        '/(?:\+?\s*63|\b0)[\s.\-()]*9(?:[\s.\-()]*\d){9}\b/',
        // Landlines with an area code, e.g. (02) 8123 4567 or 035-422-1234.
        '/\(?\b0\d{1,3}\)?[\s.\-]*\d{3,4}[\s.\-]*\d{4}\b/',
        // Local 7-digit landlines, e.g. 422-1234, and any long unbroken digit run.
        '/\b\d{3}[\s.\-]\d{4}\b|\b\d{10,}\b/',
    ];

    /** @return array{0: string, 1: bool} the cleaned text and whether anything was hidden */
    public function mask(string $text): array
    {
        $masked = preg_replace(self::PATTERNS, self::PLACEHOLDER, $text) ?? $text;

        return [$masked, $masked !== $text];
    }
}
