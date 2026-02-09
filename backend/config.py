"""
POD AutoM Backend - Configuration
Loads environment variables and provides typed config.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "POD AutoM API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3001,http://localhost:5173,https://kashino17.github.io,https://pod-autom.de,https://pod-autom-frontend.onrender.com"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Shopify App
    SHOPIFY_CLIENT_ID: Optional[str] = None
    SHOPIFY_CLIENT_SECRET: Optional[str] = None
    SHOPIFY_SCOPES: str = "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory"
    SHOPIFY_REDIRECT_URI: str = "https://pod-autom-api.onrender.com/api/shopify/callback"
    
    # Pinterest App
    PINTEREST_CLIENT_ID: Optional[str] = None
    PINTEREST_CLIENT_SECRET: Optional[str] = None
    PINTEREST_REDIRECT_URI: str = "https://pod-autom.de/auth/pinterest/callback"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_IMAGE_MODEL: str = "gpt-image-1"
    OPENAI_IMAGE_QUALITY: str = "high"
    OPENAI_TEXT_MODEL: str = "gpt-4o"
    
    # Frontend URL (for redirects)
    FRONTEND_URL: str = "https://pod-autom-frontend.onrender.com"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
