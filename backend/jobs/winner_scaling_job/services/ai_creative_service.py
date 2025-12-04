"""
AI Creative Service for Winner Scaling Job
Generates images with GPT-Image (DALL-E 3) and videos with Google Veo 3.1
"""
import os
import asyncio
import base64
import requests
from typing import List, Optional, Tuple
from dataclasses import dataclass

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import GeneratedCreative


# Pinterest Pin dimensions: 1000x1500 (2:3 aspect ratio)
PINTEREST_WIDTH = 1000
PINTEREST_HEIGHT = 1500
PINTEREST_ASPECT_RATIO = "2:3"


@dataclass
class CreativeGenerationResult:
    """Result of creative generation."""
    success: bool
    creatives: List[GeneratedCreative]
    error_message: Optional[str] = None
    api_limit_reached: bool = False


class AICreativeService:
    """Service for generating AI creatives."""

    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        self.google_api_key = os.environ.get('GOOGLE_API_KEY')  # For Veo 3.1

        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not set - image generation will be disabled")
        if not self.google_api_key:
            print("Warning: GOOGLE_API_KEY not set - video generation will be disabled")

    async def generate_images(
        self,
        product_title: str,
        product_image_url: Optional[str],
        count: int = 4
    ) -> CreativeGenerationResult:
        """
        Generate Pinterest-optimized images using GPT-Image (DALL-E 3).

        Args:
            product_title: Title of the product
            product_image_url: Shopify product image URL to use as reference
            count: Number of images to generate

        Returns:
            CreativeGenerationResult with generated images
        """
        if not self.openai_api_key:
            return CreativeGenerationResult(
                success=False,
                creatives=[],
                error_message="OpenAI API key not configured"
            )

        creatives = []
        errors = []

        # Generate prompt based on product
        base_prompt = self._create_image_prompt(product_title, product_image_url)

        for i in range(count):
            try:
                # Vary the prompt slightly for each image
                prompt = f"{base_prompt} Variation {i+1}: "
                if i == 0:
                    prompt += "Clean, minimalist style with soft lighting."
                elif i == 1:
                    prompt += "Lifestyle setting showing the product in use."
                elif i == 2:
                    prompt += "Close-up detail shot highlighting quality."
                else:
                    prompt += "Elegant product photography with subtle shadows."

                dalle_url = await self._call_dalle3(prompt)

                if dalle_url:
                    # Upload to Supabase Storage (Pinterest blocks OpenAI URLs)
                    import uuid
                    filename = f"winner-images/{uuid.uuid4()}.png"
                    storage_url = await self.download_and_upload_to_storage(dalle_url, filename)

                    if storage_url:
                        creatives.append(GeneratedCreative(
                            url=storage_url,
                            creative_type='image',
                            model='dalle-3',
                            prompt_used=prompt[:500]  # Truncate for storage
                        ))
                        print(f"    Generated and uploaded image {i+1}/{count}")
                    else:
                        # Fallback to original URL if upload fails
                        creatives.append(GeneratedCreative(
                            url=dalle_url,
                            creative_type='image',
                            model='dalle-3',
                            prompt_used=prompt[:500]
                        ))
                        print(f"    Generated image {i+1}/{count} (upload failed, using original URL)")
                else:
                    errors.append(f"Failed to generate image {i+1}")

            except Exception as e:
                error_msg = str(e)
                if 'rate_limit' in error_msg.lower() or '429' in error_msg:
                    return CreativeGenerationResult(
                        success=len(creatives) > 0,
                        creatives=creatives,
                        error_message="Rate limit reached",
                        api_limit_reached=True
                    )
                errors.append(f"Image {i+1}: {error_msg}")

            # Small delay between API calls
            await asyncio.sleep(1)

        return CreativeGenerationResult(
            success=len(creatives) > 0,
            creatives=creatives,
            error_message="; ".join(errors) if errors else None
        )

    async def generate_videos(
        self,
        product_title: str,
        product_image_url: Optional[str],
        count: int = 2
    ) -> CreativeGenerationResult:
        """
        Generate Pinterest-optimized videos using Google Veo 3.1.

        Args:
            product_title: Title of the product
            product_image_url: Shopify product image URL to use as reference
            count: Number of videos to generate

        Returns:
            CreativeGenerationResult with generated videos
        """
        if not self.google_api_key:
            return CreativeGenerationResult(
                success=False,
                creatives=[],
                error_message="Google API key not configured for Veo 3.1"
            )

        creatives = []
        errors = []

        # Generate video prompts
        base_prompt = self._create_video_prompt(product_title, product_image_url)

        for i in range(count):
            try:
                # Vary the video style
                prompt = f"{base_prompt} "
                if i == 0:
                    prompt += "Slow camera movement revealing the product with elegant transitions."
                else:
                    prompt += "Dynamic showcase with product rotating and lifestyle scenes."

                result = await self._call_veo31(prompt, product_image_url)

                if result:
                    creatives.append(GeneratedCreative(
                        url=result,
                        creative_type='video',
                        model='veo-3.1',
                        prompt_used=prompt[:500]
                    ))
                    print(f"    Generated video {i+1}/{count}")
                else:
                    errors.append(f"Failed to generate video {i+1}")

            except Exception as e:
                error_msg = str(e)
                if 'quota' in error_msg.lower() or 'rate' in error_msg.lower():
                    return CreativeGenerationResult(
                        success=len(creatives) > 0,
                        creatives=creatives,
                        error_message="API quota/rate limit reached",
                        api_limit_reached=True
                    )
                errors.append(f"Video {i+1}: {error_msg}")

            # Longer delay for video generation
            await asyncio.sleep(5)

        return CreativeGenerationResult(
            success=len(creatives) > 0,
            creatives=creatives,
            error_message="; ".join(errors) if errors else None
        )

    def _create_image_prompt(self, product_title: str, product_image_url: Optional[str]) -> str:
        """Create an optimized prompt for Pinterest product images."""
        prompt = f"""Create a high-quality Pinterest-optimized product advertisement image.

Product: {product_title}

Requirements:
- Pinterest format: vertical 2:3 aspect ratio (1000x1500px)
- Professional e-commerce photography style
- Clean, uncluttered composition
- Soft, flattering lighting
- Modern, aspirational aesthetic
- No text overlays
- Product should be the clear focal point
- Subtle background that doesn't distract
- High contrast and vibrant but natural colors
"""

        if product_image_url:
            prompt += f"\nReference the style and product from: {product_image_url}"

        return prompt

    def _create_video_prompt(self, product_title: str, product_image_url: Optional[str]) -> str:
        """Create an optimized prompt for Pinterest product videos."""
        prompt = f"""Create a 6-10 second Pinterest-optimized product showcase video.

Product: {product_title}

Requirements:
- Vertical 9:16 aspect ratio for Pinterest
- Professional product reveal with smooth camera movement
- Clean, minimal background
- Elegant lighting that highlights product details
- No text overlays or music description needed
- Subtle motion graphics or transitions
- End with clear product shot
"""

        if product_image_url:
            prompt += f"\nUse this product image as the main reference: {product_image_url}"

        return prompt

    async def _call_dalle3(self, prompt: str) -> Optional[str]:
        """
        Call DALL-E 3 API to generate an image.

        Returns:
            URL of the generated image or None if failed
        """
        try:
            import openai
            client = openai.OpenAI(api_key=self.openai_api_key)

            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1792",  # Closest to Pinterest 2:3 ratio
                quality="hd",
                n=1
            )

            if response.data and len(response.data) > 0:
                return response.data[0].url

            return None

        except Exception as e:
            print(f"DALL-E 3 API error: {e}")
            raise

    async def _call_veo31(self, prompt: str, reference_image_url: Optional[str] = None) -> Optional[str]:
        """
        Call Google Veo 3.1 API to generate a video.

        Note: This is a placeholder implementation as Veo 3.1 API details
        may vary. Update when actual API is available.

        Returns:
            URL of the generated video or None if failed
        """
        try:
            # Veo 3.1 API endpoint (placeholder - update with actual endpoint)
            endpoint = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo"

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.google_api_key}"
            }

            payload = {
                "prompt": prompt,
                "aspectRatio": "9:16",  # Vertical for Pinterest
                "durationSeconds": 8,
                "quality": "high"
            }

            # If we have a reference image, include it
            if reference_image_url:
                payload["referenceImage"] = reference_image_url

            # Note: Actual Veo 3.1 API may use different request format
            # This is a placeholder that should be updated when API is finalized

            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=120  # Video generation takes longer
            )

            if response.status_code == 200:
                data = response.json()
                # Extract video URL from response (format may vary)
                return data.get('videoUrl') or data.get('video', {}).get('url')

            elif response.status_code == 429:
                raise Exception("Rate limit exceeded for Veo 3.1")

            else:
                print(f"Veo 3.1 API error: {response.status_code} - {response.text}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"Veo 3.1 request error: {e}")
            raise

    async def download_and_upload_to_storage(
        self,
        url: str,
        filename: str,
        storage_bucket: str = "winner-creatives"
    ) -> Optional[str]:
        """
        Download a generated creative and upload to Supabase Storage.

        This ensures creatives are stored permanently, as AI API URLs may expire.

        Args:
            url: URL of the generated creative
            filename: Desired filename in storage
            storage_bucket: Supabase storage bucket name

        Returns:
            Public URL of the uploaded file or None if failed
        """
        try:
            # Download the file
            response = requests.get(url, timeout=60)
            response.raise_for_status()

            # Upload to Supabase Storage
            from supabase import create_client
            supabase = create_client(
                os.environ.get('SUPABASE_URL'),
                os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            )

            # Upload file
            result = supabase.storage.from_(storage_bucket).upload(
                filename,
                response.content,
                {"content-type": response.headers.get('content-type', 'application/octet-stream')}
            )

            # Get public URL
            public_url = supabase.storage.from_(storage_bucket).get_public_url(filename)
            return public_url

        except Exception as e:
            print(f"Error uploading creative to storage: {e}")
            return None
