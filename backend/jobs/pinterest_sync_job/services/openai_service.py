"""
OpenAI GPT-5.1 Service for Pinterest Sync Job
Generates optimized Pinterest pin descriptions using GPT-5.1
"""
import os
import requests
from typing import Optional


class OpenAIService:
    """OpenAI GPT-5.1 Service for generating Pinterest pin descriptions."""

    BASE_URL = "https://api.openai.com/v1"
    MODEL = "gpt-5.1"  # Latest GPT-5.1 model

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not set, GPT-5.1 features disabled")

    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def generate_pin_description(self, product_title: str, product_description: str,
                                  product_tags: list = None, max_length: int = 500) -> Optional[str]:
        """
        Generate an optimized Pinterest pin description using GPT-5.1.

        Args:
            product_title: The product title
            product_description: Original product description (may contain HTML)
            product_tags: List of product tags
            max_length: Maximum description length (Pinterest max is 500)

        Returns:
            Optimized description or None if generation fails
        """
        if not self.api_key:
            return None

        # Clean HTML from description
        import re
        clean_description = re.sub(r'<[^>]+>', '', product_description or '')
        clean_description = clean_description.strip()[:1000]  # Limit input

        tags_str = ", ".join(product_tags[:10]) if product_tags else ""

        prompt = f"""Du bist ein Pinterest Marketing Experte. Erstelle eine verkaufsfördernde Pin-Beschreibung auf Deutsch.

Produkt: {product_title}
Originalbeschreibung: {clean_description}
Tags: {tags_str}

Anforderungen:
- Maximal {max_length} Zeichen
- Ansprechend und verkaufsfördernd
- Relevante Keywords für Pinterest SEO
- Emojis sparsam einsetzen (max 2-3)
- Call-to-Action am Ende
- Keine Hashtags (Pinterest nutzt keine Hashtags)

Antworte NUR mit der fertigen Beschreibung, ohne Erklärungen."""

        try:
            response = requests.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": self.MODEL,
                    "messages": [
                        {"role": "system", "content": "Du bist ein Pinterest Marketing Experte für E-Commerce."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.7
                },
                timeout=30
            )

            if response.ok:
                data = response.json()
                description = data['choices'][0]['message']['content'].strip()
                # Ensure max length
                if len(description) > max_length:
                    description = description[:max_length-3] + "..."
                return description
            else:
                print(f"GPT-5.1 API error: {response.status_code} - {response.text[:200]}")
                return None

        except Exception as e:
            print(f"GPT-5.1 generation error: {e}")
            return None

    def generate_pin_title(self, product_title: str, max_length: int = 100) -> Optional[str]:
        """
        Generate an optimized Pinterest pin title using GPT-5.1.

        Args:
            product_title: Original product title
            max_length: Maximum title length (Pinterest max is 100)

        Returns:
            Optimized title or None if generation fails
        """
        if not self.api_key:
            return None

        prompt = f"""Optimiere diesen Produkttitel für Pinterest auf Deutsch.

Original: {product_title}

Anforderungen:
- Maximal {max_length} Zeichen
- Ansprechend und klickstark
- Wichtige Keywords am Anfang
- Keine Sonderzeichen außer Bindestriche

Antworte NUR mit dem optimierten Titel."""

        try:
            response = requests.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": self.MODEL,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 50,
                    "temperature": 0.5
                },
                timeout=15
            )

            if response.ok:
                data = response.json()
                title = data['choices'][0]['message']['content'].strip()
                # Remove quotes if present
                title = title.strip('"\'')
                if len(title) > max_length:
                    title = title[:max_length-3] + "..."
                return title
            else:
                return None

        except Exception as e:
            print(f"GPT-5.1 title generation error: {e}")
            return None
