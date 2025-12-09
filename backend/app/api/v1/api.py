from fastapi import APIRouter

from app.api.v1.endpoints import auth, face_recognition, attendance

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(face_recognition.router, prefix="/face", tags=["face recognition"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"]) 