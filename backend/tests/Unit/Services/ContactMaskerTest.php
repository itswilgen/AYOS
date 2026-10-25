<?php

namespace Tests\Unit\Services;

use App\Services\ContactMasker;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ContactMaskerTest extends TestCase
{
    /**
     * @return array<string, array{string, string}>
     */
    public static function contactDetails(): array
    {
        $hidden = ContactMasker::PLACEHOLDER;

        return [
            'mobile with spaces' => ['Text 0917 123 4567 please', "Text {$hidden} please"],
            'mobile with country code' => ['Call +63 917-123-4567', "Call {$hidden}"],
            'mobile without spacing' => ['09171234567', $hidden],
            'landline with area code' => ['Office (035) 422 1234', "Office {$hidden}"],
            'local landline' => ['Shop line 422-1234', "Shop line {$hidden}"],
            'email' => ['maria.santos@gmail.com', $hidden],
            'spelled out email' => ['maria at gmail dot com', $hidden],
            'messenger link' => ['Chat on m.me/maria.santos', "Chat on {$hidden}"],
            'whatsapp link' => ['https://wa.me/639171234567', $hidden],
        ];
    }

    #[DataProvider('contactDetails')]
    public function test_hides_contact_details(string $text, string $expected): void
    {
        $this->assertSame([$expected, true], (new ContactMasker)->mask($text));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function everydayText(): array
    {
        return [
            'date' => ['Can you come on 2026-10-25 at 10:30?'],
            'price' => ['Is ₱1,500 or 2500 pesos okay?'],
            'request number' => ['About request #128 for 2 units'],
            'aircon model' => ['It is a 1.5 HP split-type unit'],
        ];
    }

    #[DataProvider('everydayText')]
    public function test_leaves_everyday_numbers_alone(string $text): void
    {
        $this->assertSame([$text, false], (new ContactMasker)->mask($text));
    }
}
