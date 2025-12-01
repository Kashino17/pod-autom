"""
OpenAI Service for Product Optimization
Uses GPT-5 for generating optimized titles, descriptions, and tags
"""
import os
from typing import Optional, List
from openai import OpenAI


class OpenAIService:
    """Service for generating product content with ChatGPT"""

    MODEL = "gpt-5"  # Using GPT-5 as requested

    def __init__(self):
        """Initialize OpenAI client."""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("Missing OPENAI_API_KEY environment variable")

        self.client = OpenAI(api_key=api_key)
        print(f"OpenAI Service initialized with model: {self.MODEL}")

    def generate_optimized_title(self, original_title: str, product_type: str = "Dress",
                                  season: str = "Winter") -> Optional[str]:
        """
        Generate an SEO-optimized German product title.
        """
        try:
            prompt = f"""Du bist ein E-Commerce SEO-Experte für Mode in Deutschland.

Erstelle einen optimierten deutschen Produkttitel für dieses Kleidungsstück:
Original-Titel: {original_title}
Produkttyp: {product_type}
Saison: {season}

Anforderungen:
- Auf Deutsch
- SEO-optimiert für deutsche Suchmaschinen
- Maximal 60 Zeichen
- Enthält relevante Keywords
- Professionell und ansprechend
- Kein Markenname

Antworte NUR mit dem neuen Titel, ohne Erklärung."""

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "Du bist ein deutscher E-Commerce SEO-Experte."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error generating title: {e}")
            return None

    def generate_optimized_description(self, original_title: str, original_description: str,
                                        product_type: str = "Dress", season: str = "Winter") -> Optional[str]:
        """
        Generate an SEO-optimized German product description with HTML formatting.
        """
        try:
            prompt = f"""Du bist ein E-Commerce Copywriter für Mode in Deutschland.

Erstelle eine optimierte deutsche Produktbeschreibung:
Produkt: {original_title}
Typ: {product_type}
Saison: {season}
Original-Beschreibung: {original_description[:500] if original_description else 'Keine vorhanden'}

Anforderungen:
- Auf Deutsch
- HTML-formatiert (verwende <p>, <ul>, <li>, <strong>)
- 150-250 Wörter
- SEO-optimiert mit relevanten Keywords
- Emotionaler Verkaufstext
- Enthält: Produktvorteile, Material-Andeutung, Styling-Tipps, Call-to-Action
- Professionell und ansprechend

Antworte NUR mit der HTML-Beschreibung, ohne Erklärung."""

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "Du bist ein deutscher E-Commerce Copywriter."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error generating description: {e}")
            return None

    def generate_tags(self, title: str, description: str, product_type: str = "Dress",
                      season: str = "Winter") -> Optional[List[str]]:
        """
        Generate relevant product tags for Shopify.
        """
        try:
            prompt = f"""Du bist ein E-Commerce SEO-Experte für Mode.

Erstelle relevante Produkt-Tags für:
Titel: {title}
Typ: {product_type}
Saison: {season}
Beschreibung: {description[:300] if description else 'Keine vorhanden'}

Anforderungen:
- 8-12 Tags
- Auf Deutsch
- Lowercase
- Relevant für Suche und Filter
- Mix aus: Kategorie, Stil, Anlass, Farbe (wenn erkennbar), Saison, Zielgruppe

Antworte NUR mit den Tags, komma-getrennt, ohne Erklärung.
Beispiel: damen, kleid, elegant, winter, festlich, abendkleid"""

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "Du bist ein deutscher E-Commerce SEO-Experte."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7
            )

            tags_text = response.choices[0].message.content.strip()
            # Parse comma-separated tags
            tags = [tag.strip().lower() for tag in tags_text.split(',') if tag.strip()]
            return tags

        except Exception as e:
            print(f"Error generating tags: {e}")
            return None
