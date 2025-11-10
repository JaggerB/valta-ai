from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Placeholder for authentication logic
    # In MVP, we'll use simple authentication
    if request.username == "demo" and request.password == "demo":
        return LoginResponse(
            access_token="demo_token_12345",
            token_type="bearer"
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )

@router.get("/me")
async def get_current_user():
    # Placeholder for user info
    return {"username": "demo", "role": "analyst"}