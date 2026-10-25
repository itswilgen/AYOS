<?php

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Re-encodes uploaded images before they reach storage. Only the pixels survive,
 * so GPS coordinates, camera details and other metadata from a phone photo are never published or shared.
 * Public by default; pass the `local` disk for private images such as chat photos.
 */
class PublicImageStore
{
    private const QUALITY = 82;

    public function store(UploadedFile $file, string $directory, string $field, int $maxWidth = 1600, int $maxHeight = 2000, string $disk = 'public'): string
    {
        $image = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $image instanceof GdImage) {
            throw ValidationException::withMessages([$field => 'This image could not be read. Try a JPEG, PNG, or WebP file.']);
        }

        $image = $this->scaled($this->upright($image, $file), $maxWidth, $maxHeight);
        ob_start();
        imagewebp($image, null, self::QUALITY);
        $encoded = (string) ob_get_clean();

        $path = trim($directory, '/').'/'.Str::random(40).'.webp';
        Storage::disk($disk)->put($path, $encoded);

        return $path;
    }

    /**
     * Phones store portrait shots sideways and rely on the EXIF orientation tag, which re-encoding drops.
     */
    private function upright(GdImage $image, UploadedFile $file): GdImage
    {
        if ($file->getMimeType() !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }
        $orientation = (int) (@exif_read_data($file->getRealPath())['Orientation'] ?? 1);
        $angle = match ($orientation) {
            3 => 180,
            6 => 270,
            8 => 90,
            default => 0,
        };

        return $angle ? imagerotate($image, $angle, 0) : $image;
    }

    private function scaled(GdImage $image, int $maxWidth, int $maxHeight): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $ratio = min(1, $maxWidth / $width, $maxHeight / $height);
        $targetWidth = max(1, (int) round($width * $ratio));
        $targetHeight = max(1, (int) round($height * $ratio));

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        return $canvas;
    }
}
