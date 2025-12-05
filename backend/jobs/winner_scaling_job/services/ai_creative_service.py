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

        # Log the product image URL being used
        if product_image_url:
            print(f"    Using product image as reference: {product_image_url}")
        else:
            print(f"    WARNING: No product image URL provided - generating without reference")

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

                # Call GPT-Image-1 with reference image
                result = await self._call_gpt_image(prompt, product_image_url)

                if result:
                    import uuid
                    filename = f"winner-images/{uuid.uuid4()}.png"

                    # Check if result is base64 or URL
                    if result.startswith('http'):
                        # It's a URL - download and upload
                        storage_url = await self.download_and_upload_to_storage(result, filename)
                    else:
                        # It's base64 - upload directly
                        storage_url = await self.upload_base64_to_storage(result, filename)

                    if storage_url:
                        creatives.append(GeneratedCreative(
                            url=storage_url,
                            creative_type='image',
                            model='gpt-image-1',
                            prompt_used=prompt[:500]  # Truncate for storage
                        ))
                        print(f"    Generated and uploaded image {i+1}/{count} with GPT-Image-1")
                    else:
                        errors.append(f"Failed to upload image {i+1} to storage")
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
        prompt = f"""Create a high-quality, Pinterest-optimized product advertisement image of the following fashion item. The product in the generated image must exactly match the reference image — no changes in color, design, shape, texture, or any other visual attributes.

Product title: {product_title}
Reference image: {product_image_url if product_image_url else 'N/A'}

Requirements:
    •    Format: vertical 2:3 aspect ratio (1000×1500 pixels)
    •    Style: professional e-commerce photography
    •    Lighting: soft and flattering
    •    Composition: clean, minimal, with the product as the central focus
    •    Aesthetic: modern, aspirational, lifestyle-inspired
    •    Colors: vibrant yet natural; high contrast
    •    Background: neutral, elegant, and unobtrusive (do not distract from the product)
    •    No text, logos, watermarks, or graphic overlays of any kind
"""

        return prompt

    def _create_video_prompt(self, product_title: str, product_image_url: Optional[str]) -> str:
        """Create an optimized prompt for Pinterest product videos."""
        prompt = f"""Create an 8-second vertical product showcase video optimized for Pinterest, featuring the exact fashion product shown in the reference image. The product's design, colors, textures, and overall appearance must perfectly match the image — no alterations are allowed.

Specifications:
    •    Aspect ratio: 9:16, resolution 1000x1500px
    •    Use the product image as the absolute visual reference: {product_image_url if product_image_url else 'N/A'}
    •    Elegant, minimal background to enhance focus on the product
    •    Smooth and professional camera movements (e.g., slow pans, subtle zooms, or reveals)
    •    Sophisticated studio lighting to accentuate material, silhouette, and craftsmanship
    •    No text, no music cues — keep it visually clean
    •    Optional: tasteful, subtle transitions or light motion graphics
    •    Final frame should clearly showcase the product from a flattering angle
"""

        return prompt

    async def _call_gpt_image(self, prompt: str, reference_image_url: Optional[str] = None) -> Optional[str]:
        """
        Call GPT-Image-1 API to generate an image with optional reference image.

        Uses images.edit() when reference image is provided (as per OpenAI API docs),
        otherwise uses images.generate() for pure text-to-image.

        Args:
            prompt: The text prompt describing what to generate
            reference_image_url: Optional Shopify product image URL to use as reference

        Returns:
            Base64 encoded image data or None if failed
        """
        try:
            import openai
            from io import BytesIO
            client = openai.OpenAI(api_key=self.openai_api_key)

            # If we have a reference image, use images.edit()
            if reference_image_url:
                try:
                    # Download the reference image
                    img_response = requests.get(reference_image_url, timeout=30)
                    img_response.raise_for_status()

                    # Create a file-like object from the image bytes
                    image_file = BytesIO(img_response.content)
                    image_file.name = "reference.png"  # OpenAI requires a name attribute

                    print(f"    Using reference image with GPT-Image-1 (images.edit)")

                    # Use images.edit with reference image
                    response = client.images.edit(
                        model="gpt-image-1",
                        image=image_file,
                        prompt=prompt,
                        size="1024x1536",  # Portrait format for Pinterest
                        quality="high",
                        n=1
                    )

                except Exception as img_err:
                    print(f"    Warning: Could not use reference image, falling back to generate: {img_err}")
                    # Fall back to generate without reference
                    response = client.images.generate(
                        model="gpt-image-1",
                        prompt=prompt,
                        size="1024x1536",
                        quality="high",
                        n=1
                    )
            else:
                # No reference image - use standard generate
                print(f"    Generating image with GPT-Image-1 (no reference)")
                response = client.images.generate(
                    model="gpt-image-1",
                    prompt=prompt,
                    size="1024x1536",  # Portrait format for Pinterest
                    quality="high",
                    n=1
                )

            if response.data and len(response.data) > 0:
                # GPT-Image-1 returns base64 encoded image
                image_data = response.data[0]
                if hasattr(image_data, 'b64_json') and image_data.b64_json:
                    return image_data.b64_json
                elif hasattr(image_data, 'url') and image_data.url:
                    return image_data.url

            return None

        except Exception as e:
            print(f"GPT-Image-1 API error: {e}")
            raise

    async def _call_veo31(self, prompt: str, reference_image_url: Optional[str] = None) -> Optional[str]:
        """
        Call Google Veo 3.1 API to generate a video using the official GenAI SDK.

        Video generation is asynchronous - we start the operation and poll until complete.
        If a reference image is provided, it will be used as the starting frame.

        Returns:
            URL/path of the generated video or None if failed
        """
        try:
            from google import genai
            from google.genai import types
            import time
            import uuid

            # Initialize the GenAI client with API key
            client = genai.Client(api_key=self.google_api_key)

            print(f"    Starting Veo 3.1 video generation...")

            # Prepare image parameter if reference image is provided
            image_param = None
            if reference_image_url:
                try:
                    # Download the reference image
                    img_response = requests.get(reference_image_url, timeout=30)
                    img_response.raise_for_status()

                    # Create an Image object from the downloaded bytes
                    image_param = types.Image(
                        image_bytes=img_response.content,
                        mime_type=img_response.headers.get('content-type', 'image/jpeg')
                    )
                    print(f"    Using product image as starting frame for video")
                except Exception as img_err:
                    print(f"    Warning: Could not load reference image for video: {img_err}")
                    image_param = None

            # Start video generation (asynchronous operation)
            # Use veo-3.1-generate-preview model
            generate_params = {
                "model": "veo-3.1-generate-preview",
                "prompt": prompt,
                "config": types.GenerateVideosConfig(
                    aspect_ratio="9:16",  # Vertical for Pinterest
                    number_of_videos=1,
                )
            }

            # Add image parameter if we have a reference image
            if image_param:
                generate_params["image"] = image_param

            operation = client.models.generate_videos(**generate_params)

            # Poll until the video is ready (with timeout)
            max_wait_time = 300  # 5 minutes max
            poll_interval = 10  # Check every 10 seconds
            elapsed = 0

            while not operation.done and elapsed < max_wait_time:
                print(f"    Waiting for video generation... ({elapsed}s)")
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
                operation = client.operations.get(operation)

            if not operation.done:
                print(f"    Video generation timed out after {max_wait_time}s")
                return None

            # Check for errors
            if operation.error:
                print(f"    Veo 3.1 error: {operation.error}")
                return None

            # Get the generated video
            if operation.response and operation.response.generated_videos:
                video = operation.response.generated_videos[0]

                # Download the video to a temp file
                video_data = client.files.download(file=video.video)

                # Upload to Supabase Storage
                filename = f"winner-videos/{uuid.uuid4()}.mp4"
                storage_url = await self._upload_video_to_storage(video_data, filename)

                if storage_url:
                    print(f"    Video generated and uploaded: {filename}")
                    return storage_url
                else:
                    print(f"    Failed to upload video to storage")
                    return None
            else:
                print(f"    No video generated in response")
                return None

        except ImportError:
            print(f"    Veo 3.1 error: google-genai package not installed. Run: pip install google-genai")
            return None
        except Exception as e:
            error_msg = str(e)
            if 'quota' in error_msg.lower() or 'rate' in error_msg.lower():
                raise Exception(f"Veo 3.1 rate limit: {error_msg}")
            print(f"Veo 3.1 API error: {e}")
            return None

    async def _upload_video_to_storage(
        self,
        video_data: bytes,
        filename: str,
        storage_bucket: str = "winner-creatives"
    ) -> Optional[str]:
        """
        Upload video bytes directly to Supabase Storage without any resizing.

        The original video from Veo 3.1 (9:16 aspect ratio) is uploaded as-is.
        Pinterest will handle the display appropriately.
        """
        try:
            # Upload to Supabase Storage directly - no resizing
            from supabase import create_client
            supabase = create_client(
                os.environ.get('SUPABASE_URL'),
                os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            )

            print(f"    Uploading original video to storage (no resize)...")

            # Upload file
            result = supabase.storage.from_(storage_bucket).upload(
                filename,
                video_data,
                {"content-type": "video/mp4"}
            )

            # Get public URL
            public_url = supabase.storage.from_(storage_bucket).get_public_url(filename)
            print(f"    Video uploaded successfully: {filename}")
            return public_url

        except Exception as e:
            print(f"Error uploading video to storage: {e}")
            return None

    async def download_and_upload_to_storage(
        self,
        url: str,
        filename: str,
        storage_bucket: str = "winner-creatives",
        resize_to: tuple = (PINTEREST_WIDTH, PINTEREST_HEIGHT)
    ) -> Optional[str]:
        """
        Download a generated creative and upload to Supabase Storage.
        Resizes to Pinterest dimensions (1000x1500).

        This ensures creatives are stored permanently, as AI API URLs may expire.

        Args:
            url: URL of the generated creative
            filename: Desired filename in storage
            storage_bucket: Supabase storage bucket name
            resize_to: Target dimensions (width, height) - default Pinterest 1000x1500

        Returns:
            Public URL of the uploaded file or None if failed
        """
        try:
            from PIL import Image
            from io import BytesIO

            # Download the file
            response = requests.get(url, timeout=60)
            response.raise_for_status()

            image_bytes = response.content

            # Resize image to Pinterest dimensions (1000x1500)
            if resize_to and 'image' in response.headers.get('content-type', ''):
                img = Image.open(BytesIO(image_bytes))
                img_resized = img.resize(resize_to, Image.Resampling.LANCZOS)

                # Save to bytes
                output_buffer = BytesIO()
                img_resized.save(output_buffer, format='PNG', optimize=True)
                image_bytes = output_buffer.getvalue()
                print(f"    Resized downloaded image to {resize_to[0]}x{resize_to[1]}")

            # Upload to Supabase Storage
            from supabase import create_client
            supabase = create_client(
                os.environ.get('SUPABASE_URL'),
                os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            )

            # Upload file
            result = supabase.storage.from_(storage_bucket).upload(
                filename,
                image_bytes,
                {"content-type": "image/png"}
            )

            # Get public URL
            public_url = supabase.storage.from_(storage_bucket).get_public_url(filename)
            return public_url

        except Exception as e:
            print(f"Error uploading creative to storage: {e}")
            return None

    async def upload_base64_to_storage(
        self,
        base64_data: str,
        filename: str,
        storage_bucket: str = "winner-creatives",
        resize_to: tuple = (PINTEREST_WIDTH, PINTEREST_HEIGHT)
    ) -> Optional[str]:
        """
        Upload base64 encoded image directly to Supabase Storage.
        Optionally resizes to Pinterest dimensions (1000x1500).

        Args:
            base64_data: Base64 encoded image data (from GPT-Image-1)
            filename: Desired filename in storage
            storage_bucket: Supabase storage bucket name
            resize_to: Target dimensions (width, height) - default Pinterest 1000x1500

        Returns:
            Public URL of the uploaded file or None if failed
        """
        try:
            from PIL import Image
            from io import BytesIO

            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_data)

            # Resize image to Pinterest dimensions (1000x1500)
            if resize_to:
                img = Image.open(BytesIO(image_bytes))
                img_resized = img.resize(resize_to, Image.Resampling.LANCZOS)

                # Save to bytes
                output_buffer = BytesIO()
                img_resized.save(output_buffer, format='PNG', optimize=True)
                image_bytes = output_buffer.getvalue()
                print(f"    Resized image to {resize_to[0]}x{resize_to[1]}")

            # Upload to Supabase Storage
            from supabase import create_client
            supabase = create_client(
                os.environ.get('SUPABASE_URL'),
                os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            )

            # Upload file
            result = supabase.storage.from_(storage_bucket).upload(
                filename,
                image_bytes,
                {"content-type": "image/png"}
            )

            # Get public URL
            public_url = supabase.storage.from_(storage_bucket).get_public_url(filename)
            print(f"    Uploaded image to storage: {filename}")
            return public_url

        except Exception as e:
            print(f"Error uploading base64 image to storage: {e}")
            return None
