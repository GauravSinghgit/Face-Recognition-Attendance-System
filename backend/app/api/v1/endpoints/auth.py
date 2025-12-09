from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, User
from app.schemas.token import Token
from app.models.user import User as UserModel
from app.utils.logger import default_logger as logger

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """Login user and return access token."""
    logger.info(f"Login attempt for user: {form_data.username}")
    
    user = AuthService.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Successful login for user: {form_data.username}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=User)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate
) -> Any:
    """Register new user."""
    logger.info(f"Registration attempt for email: {user_in.email}")
    
    # Check if user with given email exists
    user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if user:
        logger.warning(f"Registration failed - email already exists: {user_in.email}")
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    # Check if user with given identifier exists
    if user_in.identifier:
        existing_identifier = db.query(UserModel).filter(UserModel.identifier == user_in.identifier).first()
        if existing_identifier:
            logger.warning(f"Registration failed - {'employee ID' if user_in.role == 'teacher' else 'roll number'} already exists: {user_in.identifier}")
            raise HTTPException(
                status_code=400,
                detail=f"A user with this {'employee ID' if user_in.role == 'teacher' else 'roll number'} already exists."
            )
    
    try:
        # Create new user
        user = UserModel(
            email=user_in.email,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            identifier=user_in.identifier,
            hashed_password=AuthService.get_password_hash(user_in.password),
            role=user_in.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Successfully registered new user: {user_in.email}")
        return user
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="An error occurred during registration"
        )

@router.get("/me", response_model=User)
async def read_users_me(
    current_user: UserModel = Depends(AuthService.get_current_active_user),
) -> Any:
    """Get current user."""
    logger.info(f"Profile accessed by user: {current_user.email}")
    return current_user 