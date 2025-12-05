-- Winner Scaling - Split Video/Image Settings
-- Created: 2024-12-05
-- Description: Add separate enable flags and campaign limits for video/image generation

-- Add video_enabled and image_enabled flags
ALTER TABLE winner_scaling_settings
ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS image_enabled BOOLEAN DEFAULT true;

-- Add separate max campaigns per winner for video and image
ALTER TABLE winner_scaling_settings
ADD COLUMN IF NOT EXISTS max_campaigns_per_winner_video INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_campaigns_per_winner_image INTEGER DEFAULT 4;

-- Migrate existing data: split old max_campaigns_per_winner between video and image
UPDATE winner_scaling_settings
SET
  max_campaigns_per_winner_video = GREATEST(1, max_campaigns_per_winner / 2),
  max_campaigns_per_winner_image = max_campaigns_per_winner - GREATEST(1, max_campaigns_per_winner / 2)
WHERE max_campaigns_per_winner_video IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN winner_scaling_settings.video_enabled IS 'Enable/disable video generation with Veo 3.1';
COMMENT ON COLUMN winner_scaling_settings.image_enabled IS 'Enable/disable image generation with GPT-Image';
COMMENT ON COLUMN winner_scaling_settings.max_campaigns_per_winner_video IS 'Maximum video campaigns per winner product';
COMMENT ON COLUMN winner_scaling_settings.max_campaigns_per_winner_image IS 'Maximum image campaigns per winner product';

-- Add custom prompt fields for AI generation
ALTER TABLE winner_scaling_settings
ADD COLUMN IF NOT EXISTS video_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Set default prompts
UPDATE winner_scaling_settings
SET video_prompt = 'Create an 8-second vertical fashion product showcase video optimized for Pinterest, in full 2:3 aspect ratio (1000x1500px), with no black bars or letterboxing.

Use the provided product image strictly as a visual reference for design accuracy — the product''s shape, color, material, and details must exactly match the reference image. Do not use the image dimensions or background as framing; instead, generate a fully native vertical video composition.

Video Requirements:
    •    1000x1500px resolution, true 2:3 vertical layout
    •    Clean, minimal background to enhance product visibility
    •    Sophisticated, elegant lighting to highlight product details
    •    Cinematic camera movement: smooth pans, gentle zoom-ins or reveals
    •    No text overlays, music, or captions
    •    Optionally include subtle transitions or motion graphics
    •    Final frame must clearly display the product, well-lit and centered

Critical constraint: The product must appear identical to the image — no changes in color, texture, cut, or design.'
WHERE video_prompt IS NULL;

UPDATE winner_scaling_settings
SET image_prompt = 'Create a high-quality, Pinterest-optimized product advertisement image of the following fashion item. The product in the generated image must exactly match the reference image — no changes in color, design, shape, texture, or any other visual attributes.

Requirements:
    •    Format: vertical 2:3 aspect ratio (1000×1500 pixels)
    •    Style: professional e-commerce photography
    •    Lighting: soft and flattering
    •    Composition: clean, minimal, with the product as the central focus
    •    Aesthetic: modern, aspirational, lifestyle-inspired
    •    Colors: vibrant yet natural; high contrast
    •    Background: neutral, elegant, and unobtrusive (do not distract from the product)
    •    No text, logos, watermarks, or graphic overlays of any kind'
WHERE image_prompt IS NULL;

COMMENT ON COLUMN winner_scaling_settings.video_prompt IS 'Custom prompt for Veo 3.1 video generation';
COMMENT ON COLUMN winner_scaling_settings.image_prompt IS 'Custom prompt for GPT-Image generation';
