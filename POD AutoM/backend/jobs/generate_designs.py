"""
POD AutoM - Design Generation Cron Job
Generates product designs with 5 layers of randomness for maximum variety.

Layers:
1. Dynamic Slogan Generation (GPT generates unique slogans)
2. Composition Variants (layout, background, text position, perspective)
3. Color Palette Rotation (9+ palettes)
4. Style Mixes (combined styles for unique aesthetics)
5. Context Seeds (scene/situation that enriches the prompt)

Result: 15,000+ unique combinations per niche

Run: python -m jobs.generate_designs
Schedule: Every 30 minutes via Render Cron (checks user schedules)
Manual: POST /api/designs/generate-now (with count parameter)
"""
import os
import sys
import json
import random
import asyncio
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional, Dict, Any, List
import base64
import httpx
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client

# =====================================================
# CONFIGURATION
# =====================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1.5")
OPENAI_IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "high")
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-5.1-mini")

MAX_DESIGNS_PER_RUN = int(os.getenv("MAX_DESIGNS_PER_RUN", "20"))


# =====================================================
# LAYER 1: DYNAMIC SLOGAN GENERATION
# =====================================================

SLOGAN_STYLES = {
    "en": [
        "powerful and short (max 5 words)",
        "witty with wordplay",
        "aggressive and bold",
        "calm and philosophical",
        "funny and self-ironic",
        "poetic and deep",
        "street/urban slang",
        "classic motivational",
    ],
    "de": [
        "kraftvoll und kurz (max 5 Wörter)",
        "witzig mit Wortspiel",
        "aggressiv und mutig",
        "ruhig und philosophisch",
        "lustig und selbstironisch",
        "poetisch und tiefgründig",
        "Straßen-/Urban-Slang",
        "klassisch motivierend",
    ],
}

async def generate_unique_slogan(niche: str, language: str) -> str:
    """Layer 1: GPT generates a brand-new unique slogan every time."""
    if not OPENAI_API_KEY:
        return _fallback_slogan(language)

    lang_name = "German" if language == "de" else "English"
    slogan_style = random.choice(SLOGAN_STYLES.get(language, SLOGAN_STYLES["en"]))
    
    # Add randomness seed so GPT doesn't repeat
    random_seed = random.randint(1000, 9999)
    random_adjective = random.choice([
        "unique", "never-heard-before", "creative", "surprising",
        "unconventional", "fresh", "original", "striking"
    ])

    prompt = (
        f"Generate exactly ONE {random_adjective} slogan for a {niche} themed "
        f"print-on-demand product. Language: {lang_name}. "
        f"Style: {slogan_style}. "
        f"Maximum 6 words. No quotes. No explanation. Just the slogan. "
        f"Seed: {random_seed}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_TEXT_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 30,
                    "temperature": 1.2,  # High temperature = more creative
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                slogan = data["choices"][0]["message"]["content"].strip().strip('"\'')
                logger.info(f"Generated slogan: {slogan}")
                return slogan
        except Exception as e:
            logger.warning(f"Slogan generation failed: {e}")

    return _fallback_slogan(language)


def _fallback_slogan(language: str) -> str:
    """Fallback slogans if GPT call fails."""
    fallbacks = {
        "en": [
            "No excuses, just results", "Rise and grind", "Built different",
            "Dream big, work hard", "Stronger than yesterday", "Never give up",
            "Make it happen", "Stay hungry stay humble", "Embrace the struggle",
            "Your only limit is you", "Outwork everyone", "Be legendary",
        ],
        "de": [
            "Keine Ausreden, nur Ergebnisse", "Steh auf und kämpfe",
            "Träume groß, arbeite hart", "Stärker als gestern",
            "Niemals aufgeben", "Mach es möglich", "Bleib hungrig",
            "Dein einziges Limit bist du", "Sei legendär",
            "Jeder Tag zählt", "Kein Schmerz, kein Gewinn",
        ],
    }
    return random.choice(fallbacks.get(language, fallbacks["en"]))


# =====================================================
# LAYER 2: COMPOSITION VARIANTS
# =====================================================

LAYOUTS = [
    "centered composition with the main subject in the middle",
    "asymmetric layout with the subject off-center to the left",
    "split composition, half image half typography",
    "full-bleed design that fills the entire canvas",
    "framed design with a decorative border",
    "diagonal composition with dynamic angles",
    "stacked vertical layout with text above imagery",
    "overlapping layers with depth effect",
]

BACKGROUNDS = [
    "smooth gradient background",
    "solid color background",
    "textured grunge background",
    "abstract geometric shapes in the background",
    "subtle pattern background",
    "blurred photo-realistic environment",
    "halftone dot pattern background",
    "brush stroke watercolor background",
    "dark moody atmosphere with dramatic lighting",
    "clean white/light background with shadows",
]

TEXT_POSITIONS = [
    "text prominently at the top",
    "text at the bottom as a tagline",
    "text centered and large",
    "text placed diagonally across the design",
    "text curved along an arc",
    "text integrated into the design elements",
    "text as a watermark-style overlay",
    "text in a banner or ribbon",
]

PERSPECTIVES = [
    "close-up detailed view",
    "wide establishing shot",
    "bird's eye view from above",
    "isometric 3D-style perspective",
    "flat 2D illustration style",
    "dramatic low-angle hero shot",
    "side profile view",
    "abstract/deconstructed view",
]


def get_random_composition() -> Dict[str, str]:
    """Layer 2: Random composition for the design."""
    return {
        "layout": random.choice(LAYOUTS),
        "background": random.choice(BACKGROUNDS),
        "text_position": random.choice(TEXT_POSITIONS),
        "perspective": random.choice(PERSPECTIVES),
    }


# =====================================================
# LAYER 3: COLOR PALETTE ROTATION
# =====================================================

COLOR_PALETTES = [
    {"name": "dark_neon", "desc": "dark black background with vibrant neon accents (electric blue, hot pink, lime green)"},
    {"name": "earth_tones", "desc": "warm earthy colors (terracotta, olive green, burnt sienna, sand)"},
    {"name": "pastel_soft", "desc": "soft pastel tones (baby pink, lavender, mint, peach)"},
    {"name": "monochrome", "desc": "monochromatic design using shades of a single color"},
    {"name": "high_contrast", "desc": "high contrast black and white with one bold accent color"},
    {"name": "sunset_warm", "desc": "warm sunset colors (orange, coral, gold, deep red)"},
    {"name": "ocean_cool", "desc": "cool ocean tones (deep blue, teal, aquamarine, white)"},
    {"name": "cyberpunk", "desc": "cyberpunk aesthetic (purple, magenta, cyan, dark backgrounds)"},
    {"name": "minimal_bw", "desc": "minimal black and white with clean lines"},
    {"name": "retro_70s", "desc": "retro 70s palette (mustard yellow, burnt orange, brown, cream)"},
    {"name": "forest_green", "desc": "forest-inspired greens (emerald, sage, moss, dark green, gold accents)"},
    {"name": "royal_luxury", "desc": "luxury royal colors (deep purple, gold, black, burgundy)"},
]

def get_random_palette() -> Dict[str, str]:
    """Layer 3: Random color palette."""
    return random.choice(COLOR_PALETTES)


# =====================================================
# LAYER 4: STYLE MIXES
# =====================================================

STYLE_BASES = [
    "minimalist", "bold", "vintage", "modern", "grunge",
    "retro", "futuristic", "elegant", "raw", "playful",
]

STYLE_MODIFIERS = [
    "Japanese-inspired", "street art influenced", "Swiss design",
    "hand-drawn feel", "digital glitch", "collage-style",
    "comic book", "art deco", "brutalist", "organic/natural",
    "geometric", "typographic-focused", "photorealistic",
    "watercolor", "sticker/badge style", "tattoo-inspired",
]

def get_random_style_mix() -> str:
    """Layer 4: Combine two styles for unique aesthetic."""
    base = random.choice(STYLE_BASES)
    modifier = random.choice(STYLE_MODIFIERS)
    return f"{base} mixed with {modifier}"


# =====================================================
# LAYER 5: CONTEXT SEEDS
# =====================================================

NICHE_CONTEXTS = {
    "fitness": [
        "early morning sunrise workout", "dark rainy gym session",
        "mountain trail running at dawn", "underground garage gym",
        "outdoor park calisthenics", "after winning a competition",
        "meditation after intense training", "boxing ring corner",
        "swimming pool at sunrise", "heavy deadlift moment",
        "yoga on a cliff overlooking the ocean", "sprint finish line",
        "recovery day stretching", "pre-workout focus moment",
    ],
    "motivation": [
        "standing on top of a mountain", "walking through a storm",
        "sunrise after a long night", "chess game at a crucial moment",
        "rocket launch", "seed growing into a tree",
        "crossing the finish line", "lone wolf in the wilderness",
        "building something from scratch", "navigating through fog",
        "phoenix rising from ashes", "diamond forming under pressure",
    ],
    "gaming": [
        "late night gaming setup glowing", "esports tournament stage",
        "retro arcade room", "VR headset immersion",
        "controller in dramatic lighting", "pixel art world",
        "streaming setup with chat overlay", "LAN party scene",
        "boss fight epic moment", "game over screen reimagined",
    ],
    "pets": [
        "puppy in autumn leaves", "cat on a windowsill at sunset",
        "dog and owner on the beach", "kitten playing with yarn",
        "pets in matching outfits", "golden retriever in the snow",
        "cat in a cardboard box kingdom", "dog with sunglasses at pool",
    ],
    "nature": [
        "northern lights over a lake", "cherry blossoms in wind",
        "thunderstorm over mountains", "underwater coral reef",
        "autumn forest path", "desert sand dunes at golden hour",
        "volcanic landscape", "frozen waterfall in winter",
    ],
    "food": [
        "street food market at night", "coffee art latte",
        "farm to table fresh", "sushi being prepared",
        "pizza coming out of wood oven", "tropical fruit explosion",
    ],
    "music": [
        "vinyl record spinning", "concert crowd from stage view",
        "headphones in rain", "guitar strings close-up",
        "DJ booth at festival", "music notes floating in air",
    ],
    "travel": [
        "passport and map flat lay", "airplane window view",
        "backpacker at mountain summit", "exotic street market",
        "camping under the stars", "road trip on empty highway",
    ],
}

# Fallback contexts for unknown niches
DEFAULT_CONTEXTS = [
    "dramatic cinematic scene", "abstract conceptual representation",
    "everyday life moment", "epic wide-angle landscape",
    "intimate close-up detail", "surreal dreamlike scenario",
    "urban street photography style", "studio product shot style",
    "editorial magazine style", "social media-optimized composition",
]

def get_random_context(niche_name: str) -> str:
    """Layer 5: Random scene/context for the niche."""
    niche_key = niche_name.lower().strip()
    contexts = NICHE_CONTEXTS.get(niche_key, DEFAULT_CONTEXTS)
    return random.choice(contexts)


# =====================================================
# NICHE-SPECIFIC SUBJECT ELEMENTS
# =====================================================

NICHE_SUBJECTS = {
    "fitness": [
        "muscular athlete", "dumbbells and weights", "boxing gloves",
        "running shoes", "gym equipment silhouette", "strong fist",
        "yoga pose", "jump rope", "protein shaker", "barbell",
        "kettlebell", "resistance bands", "battle ropes",
    ],
    "motivation": [
        "lion", "eagle", "mountain peak", "compass",
        "clock/hourglass", "chess piece (king)", "arrow hitting target",
        "flame/fire", "crown", "wolf", "rising sun",
    ],
    "gaming": [
        "game controller", "keyboard and mouse", "headset",
        "pixel art character", "joystick", "gaming chair",
        "VR headset", "arcade machine", "game cartridge",
    ],
    "pets": [
        "dog paw print", "cat silhouette", "bone",
        "fish bowl", "pet collar", "paw heart",
    ],
    "nature": [
        "tree of life", "mountain range", "ocean wave",
        "sun and moon", "leaf", "flower", "snowflake",
    ],
}

def get_random_subject(niche_name: str) -> str:
    """Get random subject/element for the niche."""
    niche_key = niche_name.lower().strip()
    subjects = NICHE_SUBJECTS.get(niche_key, ["abstract design element"])
    return random.choice(subjects)


# =====================================================
# MEGA PROMPT BUILDER (All 5 Layers)
# =====================================================

async def build_mega_prompt(
    niche_name: str,
    language: str,
    user_template: Optional[str] = None,
    user_variables: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Build a highly randomized prompt using all 5 layers.
    Returns: {prompt, slogan, layers_used}
    """
    # Layer 1: Dynamic slogan
    slogan = await generate_unique_slogan(niche_name, language)

    # Layer 2: Composition
    composition = get_random_composition()

    # Layer 3: Color palette
    palette = get_random_palette()

    # Layer 4: Style mix
    style_mix = get_random_style_mix()

    # Layer 5: Context seed
    context = get_random_context(niche_name)

    # Bonus: Random subject element
    subject = get_random_subject(niche_name)

    # Language instruction
    if language == "de":
        lang_instruction = 'Any text on the image MUST be in German. The slogan is: "' + slogan + '"'
    else:
        lang_instruction = 'Any text on the image MUST be in English. The slogan is: "' + slogan + '"'

    # Build the final prompt
    if user_template:
        # User has a custom template - enrich it with our layers
        # Substitute any user variables first
        final_template = user_template
        variables_used = {}
        if user_variables:
            for var_name, var_options in user_variables.items():
                placeholder = f"{{{var_name}}}"
                if placeholder in final_template and isinstance(var_options, list) and var_options:
                    chosen = random.choice(var_options)
                    final_template = final_template.replace(placeholder, chosen)
                    variables_used[var_name] = chosen

        prompt = (
            f"{final_template}. "
            f"Visual style: {style_mix}. "
            f"Scene/context: {context}. "
            f"Color palette: {palette['desc']}. "
            f"Composition: {composition['layout']}, {composition['background']}, "
            f"{composition['text_position']}. "
            f"{lang_instruction}. "
            f"High quality, professional print-on-demand design at 1024x1024."
        )
    else:
        # No user template - build from scratch
        prompt = (
            f"Create a {niche_name}-themed design for a print-on-demand product. "
            f"Main subject: {subject}. "
            f"Scene: {context}. "
            f"Visual style: {style_mix}. "
            f"Color palette: {palette['desc']}. "
            f"Composition: {composition['layout']}, with {composition['background']}, "
            f"{composition['text_position']}, {composition['perspective']}. "
            f"{lang_instruction}. "
            f"High quality, professional design suitable for t-shirts, mugs, posters. "
            f"Clean, printable, visually striking."
        )
        variables_used = {}

    layers_used = {
        "slogan": slogan,
        "slogan_style": None,
        "layout": composition["layout"][:40],
        "background": composition["background"][:40],
        "text_position": composition["text_position"][:40],
        "perspective": composition["perspective"][:30],
        "palette": palette["name"],
        "style_mix": style_mix,
        "context": context,
        "subject": subject,
        "user_variables": variables_used,
    }

    return {
        "prompt": prompt,
        "slogan": slogan,
        "layers_used": layers_used,
    }


# =====================================================
# OPENAI IMAGE GENERATION
# =====================================================

async def generate_image(prompt: str) -> Dict[str, Any]:
    """Generate image using OpenAI GPT Image API."""
    if not OPENAI_API_KEY:
        return {"success": False, "error": "OPENAI_API_KEY not set"}

    logger.info(f"Generating image [{OPENAI_IMAGE_MODEL}/{OPENAI_IMAGE_QUALITY}]")
    logger.info(f"Prompt ({len(prompt)} chars): {prompt[:150]}...")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_IMAGE_MODEL,
                    "prompt": prompt,
                    "n": 1,
                    "size": "1024x1024",
                    "quality": OPENAI_IMAGE_QUALITY,
                    "output_format": "png",
                },
            )

            if resp.status_code != 200:
                err = resp.json().get("error", {}).get("message", resp.text[:200])
                logger.error(f"OpenAI error: {err}")
                return {"success": False, "error": err}

            b64 = resp.json()["data"][0]["b64_json"]
            logger.info("Image generated OK")
            return {"success": True, "image_data": b64}

        except httpx.TimeoutException:
            return {"success": False, "error": "Timeout (120s)"}
        except Exception as e:
            logger.error(f"Exception: {e}")
            return {"success": False, "error": str(e)}


# =====================================================
# SUPABASE HELPERS
# =====================================================

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase not configured")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def upload_image(supabase: Client, b64: str, user_id: str, design_id: str) -> Dict[str, str]:
    """Upload base64 image to Supabase Storage."""
    try:
        img_bytes = base64.b64decode(b64)
        path = f"designs/{user_id}/{design_id}.png"

        supabase.storage.from_("designs").upload(
            path=path, file=img_bytes,
            file_options={"content-type": "image/png"},
        )

        url = supabase.storage.from_("designs").get_public_url(path)
        logger.info(f"Uploaded: {path}")
        return {"image_path": path, "image_url": url, "thumbnail_url": url}

    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise


async def get_daily_count(supabase: Client, user_id: str) -> int:
    today = date.today().isoformat()
    res = supabase.table("pod_autom_generation_stats").select(
        "designs_generated"
    ).eq("user_id", user_id).eq("date", today).execute()
    return res.data[0]["designs_generated"] if res.data else 0


async def bump_stats(supabase: Client, user_id: str, ok: bool):
    today = date.today().isoformat()
    existing = supabase.table("pod_autom_generation_stats").select("*").eq(
        "user_id", user_id
    ).eq("date", today).execute()

    if existing.data:
        cur = existing.data[0]
        supabase.table("pod_autom_generation_stats").update({
            "designs_generated": cur["designs_generated"] + (1 if ok else 0),
            "designs_failed": cur["designs_failed"] + (0 if ok else 1),
            "api_calls": cur["api_calls"] + 1,
        }).eq("id", cur["id"]).execute()
    else:
        supabase.table("pod_autom_generation_stats").insert({
            "user_id": user_id, "date": today,
            "designs_generated": 1 if ok else 0,
            "designs_failed": 0 if ok else 1,
            "api_calls": 1,
        }).execute()


# =====================================================
# CORE GENERATION LOGIC
# =====================================================

async def generate_one(supabase: Client, niche: Dict) -> bool:
    """Generate a single design for a niche with 5-layer randomness."""
    user_id = niche["user_id"]
    niche_id = niche["id"]
    niche_name = niche["name"]
    language = niche.get("language", "en")

    logger.info(f"Generating for user={user_id[:8]}... niche={niche_name} lang={language}")

    # Get user's prompt template (if any)
    tpl_res = supabase.table("pod_autom_prompt_templates").select("*").eq(
        "niche_id", niche_id
    ).eq("is_active", True).execute()

    template_text = None
    template_id = None
    user_vars = None

    if tpl_res.data:
        tpl = random.choice(tpl_res.data)
        template_text = tpl["prompt_template"]
        template_id = tpl["id"]
        user_vars = tpl.get("variables", {})

    # Build mega prompt with all 5 layers
    mega = await build_mega_prompt(
        niche_name=niche_name,
        language=language,
        user_template=template_text,
        user_variables=user_vars,
    )

    # Insert pending design record
    record = {
        "user_id": user_id,
        "niche_id": niche_id,
        "template_id": template_id,
        "prompt_used": template_text or f"[auto] {niche_name}",
        "final_prompt": mega["prompt"],
        "slogan_text": mega["slogan"],
        "language": language,
        "status": "generating",
        "generation_model": OPENAI_IMAGE_MODEL,
        "generation_quality": OPENAI_IMAGE_QUALITY,
        "variables_used": mega["layers_used"],
    }

    ins = supabase.table("pod_autom_designs").insert(record).execute()
    design_id = ins.data[0]["id"]

    try:
        # Generate image
        result = await generate_image(mega["prompt"])

        if not result["success"]:
            supabase.table("pod_autom_designs").update({
                "status": "failed", "error_message": result["error"],
            }).eq("id", design_id).execute()
            await bump_stats(supabase, user_id, ok=False)
            logger.error(f"FAILED: {result['error']}")
            return False

        # Upload to storage
        storage = await upload_image(supabase, result["image_data"], user_id, design_id)

        # Mark as ready
        supabase.table("pod_autom_designs").update({
            "status": "ready",
            "image_url": storage["image_url"],
            "thumbnail_url": storage["thumbnail_url"],
            "image_path": storage["image_path"],
            "generated_at": datetime.now(tz=None).isoformat(),
        }).eq("id", design_id).execute()

        logger.info(f"SUCCESS: design={design_id[:8]}... slogan='{mega['slogan']}'")

        # Stats tracking (non-critical, don't fail the design if this errors)
        try:
            await bump_stats(supabase, user_id, ok=True)
        except Exception as se:
            logger.warning(f"Stats error (non-critical): {se}")

        return True

    except Exception as e:
        supabase.table("pod_autom_designs").update({
            "status": "failed", "error_message": str(e),
        }).eq("id", design_id).execute()
        try:
            await bump_stats(supabase, user_id, ok=False)
        except Exception:
            pass
        logger.error(f"EXCEPTION: {e}")
        return False


# =====================================================
# PLAN DEFINITIONS
# =====================================================

PLAN_LIMITS = {
    "free": 10,
    "starter": 50,
    "pro": 200,
    "enterprise": 1000,
}


# =====================================================
# MONTHLY USAGE HELPERS
# =====================================================

def get_billing_month_start(billing_cycle_start: str) -> date:
    """Calculate the current billing month start based on original billing date."""
    if not billing_cycle_start:
        return date.today().replace(day=1)
    
    cycle_start = date.fromisoformat(str(billing_cycle_start))
    today = date.today()
    
    # Find the current billing period start
    # If billing started on the 15th, each month starts on the 15th
    day_of_month = min(cycle_start.day, 28)  # Cap at 28 for safety
    
    try:
        this_month_start = today.replace(day=day_of_month)
    except ValueError:
        this_month_start = today.replace(day=28)
    
    if this_month_start > today:
        # We're before this month's billing day, so current period started last month
        if this_month_start.month == 1:
            this_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
        else:
            this_month_start = this_month_start.replace(month=this_month_start.month - 1)
    
    return this_month_start


async def get_monthly_usage(supabase: Client, user_id: str, month_start: date) -> int:
    """Get how many designs were generated in the current billing month."""
    res = supabase.table("pod_autom_monthly_usage").select(
        "designs_generated"
    ).eq("user_id", user_id).eq("month_start", month_start.isoformat()).execute()
    return res.data[0]["designs_generated"] if res.data else 0


async def bump_monthly_usage(supabase: Client, user_id: str, month_start: date, ok: bool, is_manual: bool = False):
    """Increment monthly usage counter."""
    try:
        existing = supabase.table("pod_autom_monthly_usage").select("*").eq(
            "user_id", user_id
        ).eq("month_start", month_start.isoformat()).execute()

        if existing.data:
            cur = existing.data[0]
            update = {
                "designs_generated": cur["designs_generated"] + (1 if ok else 0),
                "designs_failed": cur["designs_failed"] + (0 if ok else 1),
                "updated_at": datetime.now(tz=None).isoformat(),
            }
            if is_manual:
                update["manual_triggers"] = cur.get("manual_triggers", 0) + 1
            else:
                update["scheduled_runs"] = cur.get("scheduled_runs", 0) + 1
            supabase.table("pod_autom_monthly_usage").update(update).eq("id", cur["id"]).execute()
        else:
            supabase.table("pod_autom_monthly_usage").insert({
                "user_id": user_id,
                "month_start": month_start.isoformat(),
                "designs_generated": 1 if ok else 0,
                "designs_failed": 0 if ok else 1,
                "manual_triggers": 1 if is_manual else 0,
                "scheduled_runs": 0 if is_manual else 1,
            }).execute()
    except Exception as e:
        logger.warning(f"Monthly usage tracking error (non-critical): {e}")


# =====================================================
# SCHEDULE CHECKER
# =====================================================

def is_scheduled_now(generation_time: str, generation_timezone: str, last_run: str = None) -> bool:
    """Check if a user's generation is scheduled for the current time window.
    
    The cron runs every 30 min, so we check if the user's generation_time
    falls within a 30-minute window of the current time in their timezone.
    """
    try:
        tz = ZoneInfo(generation_timezone)
    except Exception:
        tz = ZoneInfo("Europe/Berlin")
    
    now = datetime.now(tz)
    
    # Parse generation_time "HH:MM"
    parts = generation_time.split(":")
    target_hour = int(parts[0])
    target_minute = int(parts[1]) if len(parts) > 1 else 0
    
    # Check if current time is within 30 min of target
    target_today = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
    diff = (now - target_today).total_seconds()
    
    # Within 0 to 30 minutes after target time
    if not (0 <= diff < 1800):  # 30 min window
        return False
    
    # Check if already ran today (prevent double runs)
    if last_run:
        try:
            last_dt = datetime.fromisoformat(str(last_run))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            last_in_tz = last_dt.astimezone(tz)
            if last_in_tz.date() == now.date():
                logger.info(f"Already ran today at {last_in_tz.strftime('%H:%M')}")
                return False
        except Exception as e:
            logger.warning(f"Error parsing last_run: {e}")
    
    return True


# =====================================================
# BATCH GENERATION (for both scheduled and manual)
# =====================================================

async def generate_batch(
    supabase: Client,
    user_id: str,
    niche_list: List[Dict],
    count: int,
    monthly_limit: int,
    month_start: date,
    trigger_type: str = "scheduled",
    job_id: str = None,
) -> Dict[str, int]:
    """Generate a batch of designs across niches for a user.
    
    Returns: {"generated": N, "failed": N, "skipped": N}
    """
    # Check monthly limit
    current_usage = await get_monthly_usage(supabase, user_id, month_start)
    remaining = monthly_limit - current_usage
    
    if remaining <= 0:
        logger.info(f"User {user_id[:8]}... monthly limit reached ({current_usage}/{monthly_limit})")
        return {"generated": 0, "failed": 0, "skipped": count}
    
    # Cap count to remaining
    actual_count = min(count, remaining)
    if actual_count < count:
        logger.info(f"Capped from {count} to {actual_count} (remaining: {remaining})")
    
    generated = 0
    failed = 0
    is_manual = trigger_type == "manual"
    
    # Distribute designs across niches (round-robin)
    niche_index = 0
    for i in range(actual_count):
        niche = niche_list[niche_index % len(niche_list)]
        niche_index += 1
        
        ok = await generate_one(supabase, niche)
        if ok:
            generated += 1
        else:
            failed += 1
        
        # Update monthly usage
        await bump_monthly_usage(supabase, user_id, month_start, ok, is_manual)
        
        # Also update daily stats (backward compat)
        try:
            await bump_stats(supabase, user_id, ok)
        except Exception:
            pass
        
        # Update job progress if we have a job_id
        if job_id:
            try:
                supabase.table("pod_autom_generation_jobs").update({
                    "designs_completed": generated,
                    "designs_failed": failed,
                }).eq("id", job_id).execute()
            except Exception:
                pass
        
        # Delay between generations
        if i < actual_count - 1:
            await asyncio.sleep(2)
    
    return {"generated": generated, "failed": failed, "skipped": count - actual_count}


# =====================================================
# MANUAL GENERATION (called from API)
# =====================================================

async def generate_manual(user_id: str, count: int = 1) -> Dict[str, Any]:
    """Trigger manual design generation for a user.
    
    Called from API endpoint POST /api/designs/generate-now
    Returns: job status with counts
    """
    logger.info(f"Manual generation: user={user_id[:8]}... count={count}")
    
    if not OPENAI_API_KEY:
        return {"success": False, "error": "OPENAI_API_KEY not configured"}
    
    sb = get_supabase()
    
    # Get user settings (plan, limits)
    settings = sb.table("pod_autom_settings").select(
        "*, pod_autom_shops(user_id)"
    ).eq("pod_autom_shops.user_id", user_id).execute()
    
    if not settings.data:
        # Try alternate query: get shop first
        shops = sb.table("pod_autom_shops").select("id").eq("user_id", user_id).execute()
        if not shops.data:
            return {"success": False, "error": "Kein Shop verbunden"}
        shop_id = shops.data[0]["id"]
        settings = sb.table("pod_autom_settings").select("*").eq("shop_id", shop_id).execute()
        if not settings.data:
            return {"success": False, "error": "Keine Einstellungen gefunden"}
    
    user_settings = settings.data[0]
    plan_type = user_settings.get("plan_type", "free")
    monthly_limit = user_settings.get("monthly_design_limit") or PLAN_LIMITS.get(plan_type, 10)
    billing_start = user_settings.get("billing_cycle_start")
    month_start = get_billing_month_start(billing_start)
    
    # Check monthly limit
    current_usage = await get_monthly_usage(sb, user_id, month_start)
    remaining = monthly_limit - current_usage
    
    if remaining <= 0:
        return {
            "success": False,
            "error": f"Monatliches Limit erreicht ({current_usage}/{monthly_limit})",
            "monthly_used": current_usage,
            "monthly_limit": monthly_limit,
        }
    
    actual_count = min(count, remaining)
    
    # Get user's auto-generate niches
    shops = sb.table("pod_autom_shops").select("id").eq("user_id", user_id).execute()
    if not shops.data:
        return {"success": False, "error": "Kein Shop verbunden"}
    
    shop_id = shops.data[0]["id"]
    settings_res = sb.table("pod_autom_settings").select("id").eq("shop_id", shop_id).execute()
    if not settings_res.data:
        return {"success": False, "error": "Keine Einstellungen"}
    
    settings_id = settings_res.data[0]["id"]
    niches = sb.table("pod_autom_niches").select("*").eq(
        "settings_id", settings_id
    ).eq("auto_generate", True).eq("is_active", True).execute()
    
    if not niches.data:
        return {"success": False, "error": "Keine Nischen mit Auto-Generierung aktiviert"}
    
    niche_list = [{
        "id": n["id"],
        "user_id": user_id,
        "name": n["niche_name"],
        "language": n.get("language", "en"),
        "daily_limit": 9999,  # Manual doesn't have daily limit, only monthly
        "auto_generate": True,
    } for n in niches.data]
    
    # Create generation job record
    job = sb.table("pod_autom_generation_jobs").insert({
        "user_id": user_id,
        "trigger_type": "manual",
        "designs_requested": actual_count,
        "status": "running",
    }).execute()
    job_id = job.data[0]["id"]
    
    # Generate
    result = await generate_batch(
        supabase=sb,
        user_id=user_id,
        niche_list=niche_list,
        count=actual_count,
        monthly_limit=monthly_limit,
        month_start=month_start,
        trigger_type="manual",
        job_id=job_id,
    )
    
    # Complete job
    sb.table("pod_autom_generation_jobs").update({
        "status": "completed",
        "designs_completed": result["generated"],
        "designs_failed": result["failed"],
        "completed_at": datetime.now(tz=None).isoformat(),
    }).eq("id", job_id).execute()
    
    return {
        "success": True,
        "job_id": job_id,
        "generated": result["generated"],
        "failed": result["failed"],
        "skipped": result["skipped"],
        "monthly_used": current_usage + result["generated"],
        "monthly_limit": monthly_limit,
    }


# =====================================================
# MAIN JOB (scheduled via Render Cron)
# =====================================================

async def run():
    logger.info("=" * 60)
    logger.info("POD AutoM Design Generator - Schedule-Based Engine")
    logger.info(f"Image: {OPENAI_IMAGE_MODEL}/{OPENAI_IMAGE_QUALITY} | Text: {OPENAI_TEXT_MODEL}")
    logger.info("=" * 60)

    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY missing - abort")
        return
    if not SUPABASE_URL:
        logger.error("SUPABASE_URL missing - abort")
        return

    sb = get_supabase()

    # Get ALL settings with auto_generate niches (join to get user info)
    settings_res = sb.table("pod_autom_settings").select(
        "id, shop_id, plan_type, monthly_design_limit, generation_time, "
        "generation_timezone, billing_cycle_start, designs_per_batch, "
        "last_generation_run, pod_autom_shops(user_id)"
    ).execute()

    if not settings_res.data:
        logger.info("No settings found")
        return

    users_processed = 0
    users_skipped = 0
    total_generated = 0
    total_failed = 0

    for s in settings_res.data:
        try:
            user_id = s["pod_autom_shops"]["user_id"]
        except (KeyError, TypeError):
            continue
        
        gen_time = s.get("generation_time", "09:00")
        gen_tz = s.get("generation_timezone", "Europe/Berlin")
        last_run = s.get("last_generation_run")
        
        # Check if this user is scheduled for now
        if not is_scheduled_now(gen_time, gen_tz, last_run):
            users_skipped += 1
            continue
        
        logger.info(f"User {user_id[:8]}... scheduled at {gen_time} ({gen_tz})")
        
        # Get niches for this settings
        settings_id = s["id"]
        niches = sb.table("pod_autom_niches").select("*").eq(
            "settings_id", settings_id
        ).eq("auto_generate", True).eq("is_active", True).execute()
        
        if not niches.data:
            logger.info(f"  No active auto-generate niches, skipping")
            continue
        
        niche_list = [{
            "id": n["id"],
            "user_id": user_id,
            "name": n["niche_name"],
            "language": n.get("language", "en"),
            "daily_limit": n.get("daily_limit", 5),
            "auto_generate": True,
        } for n in niches.data]
        
        plan_type = s.get("plan_type", "free")
        monthly_limit = s.get("monthly_design_limit") or PLAN_LIMITS.get(plan_type, 10)
        designs_per_batch = s.get("designs_per_batch", 5)
        billing_start = s.get("billing_cycle_start")
        month_start = get_billing_month_start(billing_start)
        
        # Create job record
        job = sb.table("pod_autom_generation_jobs").insert({
            "user_id": user_id,
            "trigger_type": "scheduled",
            "designs_requested": designs_per_batch,
            "status": "running",
        }).execute()
        job_id = job.data[0]["id"]
        
        # Generate batch
        result = await generate_batch(
            supabase=sb,
            user_id=user_id,
            niche_list=niche_list,
            count=designs_per_batch,
            monthly_limit=monthly_limit,
            month_start=month_start,
            trigger_type="scheduled",
            job_id=job_id,
        )
        
        # Complete job
        sb.table("pod_autom_generation_jobs").update({
            "status": "completed",
            "designs_completed": result["generated"],
            "designs_failed": result["failed"],
            "completed_at": datetime.now(tz=None).isoformat(),
        }).eq("id", job_id).execute()
        
        # Mark last_generation_run
        sb.table("pod_autom_settings").update({
            "last_generation_run": datetime.now(timezone.utc).isoformat(),
        }).eq("id", settings_id).execute()
        
        users_processed += 1
        total_generated += result["generated"]
        total_failed += result["failed"]
        
        logger.info(f"  → {result['generated']} generated, {result['failed']} failed")

    logger.info("=" * 60)
    logger.info(f"DONE: {users_processed} users processed, {users_skipped} skipped")
    logger.info(f"Total: {total_generated} generated, {total_failed} failed")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
