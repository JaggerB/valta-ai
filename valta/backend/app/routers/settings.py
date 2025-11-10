from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/api/settings", tags=["settings"])


# Request/Response models
class APIKeysUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class APIKeysStatus(BaseModel):
    openai_configured: bool
    anthropic_configured: bool
    current_model: str


class ModelSelection(BaseModel):
    preferred_model: str  # "claude" or "openai"


@router.get("/api-keys", response_model=APIKeysStatus)
async def get_api_keys_status():
    """Get status of API keys (whether they're configured, not the actual keys)"""
    openai_key = os.getenv("OPENAI_API_KEY", "")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")

    # Check if keys are real (not placeholder values)
    openai_configured = bool(openai_key and not openai_key.startswith("your_") and len(openai_key) > 20)
    anthropic_configured = bool(anthropic_key and not anthropic_key.startswith("your_") and len(anthropic_key) > 20)

    # Determine current model
    current_model = "claude-3-5-sonnet" if anthropic_configured else "gpt-4-turbo"

    return {
        "openai_configured": openai_configured,
        "anthropic_configured": anthropic_configured,
        "current_model": current_model
    }


@router.post("/api-keys")
async def update_api_keys(keys: APIKeysUpdate):
    """Update API keys in environment file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')

    try:
        # Read current .env file
        with open(env_path, 'r') as f:
            lines = f.readlines()

        # Update keys in memory
        updated_lines = []
        openai_found = False
        anthropic_found = False

        for line in lines:
            if keys.openai_api_key and line.startswith('OPENAI_API_KEY='):
                updated_lines.append(f'OPENAI_API_KEY={keys.openai_api_key}\n')
                openai_found = True
            elif keys.anthropic_api_key and line.startswith('ANTHROPIC_API_KEY='):
                updated_lines.append(f'ANTHROPIC_API_KEY={keys.anthropic_api_key}\n')
                anthropic_found = True
            else:
                updated_lines.append(line)

        # Add keys if they weren't found
        if keys.openai_api_key and not openai_found:
            updated_lines.append(f'\nOPENAI_API_KEY={keys.openai_api_key}\n')
        if keys.anthropic_api_key and not anthropic_found:
            updated_lines.append(f'\nANTHROPIC_API_KEY={keys.anthropic_api_key}\n')

        # Write back to .env file
        with open(env_path, 'w') as f:
            f.writelines(updated_lines)

        # Update environment variables for current session
        if keys.openai_api_key:
            os.environ['OPENAI_API_KEY'] = keys.openai_api_key
        if keys.anthropic_api_key:
            os.environ['ANTHROPIC_API_KEY'] = keys.anthropic_api_key

        return {"message": "API keys updated successfully. Please restart the server for changes to take full effect."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update API keys: {str(e)}")
