from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, EmailStr, model_validator
from urllib.parse import quote_plus

class Settings(BaseSettings):
    PROJECT_NAME: str = "Face Recognition Attendance System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "change-me-in-production"  # Override via SECRET_KEY env var
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "attendance_db"
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
   
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # CORS
    ALLOWED_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",  # React frontend
        "http://localhost:8000",  # FastAPI backend
        "http://127.0.0.1:3000",  # React frontend alternative URL
        "http://127.0.0.1:8000",  # FastAPI backend alternative URL
    ]
    
    # Face Recognition
    FACE_DETECTION_MODEL: str = "hog"  # Options: 'hog' or 'cnn'
    FACE_RECOGNITION_TOLERANCE: float = 0.6
    MIN_FACE_IMAGES_REQUIRED: int = 5
    
    # Storage
    UPLOAD_DIRECTORY: str = "./static/uploads"
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Admin user
    FIRST_SUPERUSER: EmailStr = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"

    @model_validator(mode="after")
    def assemble_db_uri(self) -> "Settings":
        if self.SQLALCHEMY_DATABASE_URI is None:
            self.SQLALCHEMY_DATABASE_URI = (
                f"postgresql://{self.POSTGRES_USER}"
                f":{quote_plus(self.POSTGRES_PASSWORD)}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )
        return self
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()   