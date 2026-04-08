from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import numpy as np
import os
from datetime import datetime

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.services.face_recognition_service import FaceRecognitionService
from app.models.user import User, UserRole
from app.models.face_encoding import FaceEncoding
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
    AttendanceReport,
    MarkAttendanceResponse
)
from app.core.config import settings
from app.utils.logger import default_logger as logger

router = APIRouter()
face_service = FaceRecognitionService()

@router.post("/register-face")
async def register_face(
    *,
    db: Session = Depends(get_db),
    image: UploadFile = File(...),
    current_user: User = Depends(AuthService.get_current_active_user)
) -> Any:
    """Register a new face for the current user."""
    logger.info(f"Face registration attempt for user: {current_user.email}, image: {image.filename}")
    image_path = None
    
    try:
        # Read image data
        image_data = await image.read()
        
        # Save image to disk
        image_path = face_service.save_face_image(image_data, current_user.id)
        logger.debug(f"Saved face image to: {image_path}")
        
        # Detect faces in the image
        face_locations = face_service.detect_faces(image_path)
        if not face_locations:
            logger.warning(f"No face detected in uploaded image for user: {current_user.email}, path: {image_path}")
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image. Please ensure your face is clearly visible."
            )
        
        if len(face_locations) > 1:
            logger.warning(f"Multiple faces ({len(face_locations)}) detected in uploaded image for user: {current_user.email}")
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            raise HTTPException(
                status_code=400,
                detail="Multiple faces detected. Please provide an image with a single face."
            )
        
        # Generate face encoding
        face_encoding = face_service.encode_face(image_path, face_locations[0])
        if face_encoding is None:
            logger.error(f"Failed to generate face encoding for user: {current_user.email}, path: {image_path}")
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            raise HTTPException(
                status_code=400,
                detail="Failed to generate face encoding. Please try with a different image."
            )
        
        # Save face encoding to database
        db_encoding = FaceEncoding(
            user_id=current_user.id,
            encoding_data=face_encoding.tobytes(),
            image_path=image_path
        )
        db.add(db_encoding)
        db.commit()
        
        logger.info(f"Successfully registered face for user: {current_user.email}, path: {image_path}")
        return {"message": "Face registered successfully"}
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error during face registration: {str(e)}")
        # Clean up the image file if it exists
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(
            status_code=500,
            detail=f"Error during face registration: {str(e)}"
        )

@router.post("/mark-attendance", response_model=MarkAttendanceResponse)
async def mark_attendance(
    *,
    db: Session = Depends(get_db),
    session_id: str,
    image: UploadFile = File(...),
    background_tasks: BackgroundTasks,
    current_user: User = Depends(AuthService.get_current_active_user)
) -> Any:
    """Mark attendance using face recognition."""
    logger.info(f"Attendance marking attempt by user: {current_user.email}, session: {session_id}")
    
    # Check if user has permission to mark attendance
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        logger.warning(f"Unauthorized attendance marking attempt by user: {current_user.email}, role: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="Not authorized to mark attendance"
        )
    
    try:
        # Read and save image
        image_data = await image.read()
        image_path = face_service.save_face_image(image_data, 0)  # Use 0 for temporary storage
        logger.debug(f"Saved attendance image to: {image_path}")
        
        # Get all face encodings from database
        known_faces = db.query(FaceEncoding).all()
        if not known_faces:
            logger.warning("No registered faces found in database")
            raise HTTPException(
                status_code=400,
                detail="No registered faces found in the database"
            )
        
        logger.debug(f"Processing attendance image with {len(known_faces)} known faces")
        
        # Process attendance image
        matches = face_service.process_attendance_image(image_path, known_faces)
        logger.info(f"Found {len(matches)} face matches in attendance image")
        
        # Record attendance for matched users (skip if already recorded for this session)
        attendance_records = []
        for user, confidence in matches:
            existing = db.query(Attendance).filter(
                Attendance.user_id == user.id,
                Attendance.session_id == session_id
            ).first()
            if existing:
                logger.debug(f"Attendance already recorded for user {user.id} in session {session_id}, skipping")
                attendance_records.append(existing)
                continue
            attendance = Attendance(
                user_id=user.id,
                session_id=session_id,
                status=AttendanceStatus.PRESENT,
                confidence_score=float(confidence)
            )
            db.add(attendance)
            attendance_records.append(attendance)
            logger.debug(f"Marked attendance for user ID: {user.id} with confidence: {confidence}")
        
        db.commit()
        
        # Get all students
        all_students = db.query(User).filter(User.role == UserRole.STUDENT).all()
        total_students = len(all_students)
        
        # Mark absent for non-matched students (skip if already recorded)
        present_student_ids = {record.user_id for record in attendance_records}
        for student in all_students:
            if student.id not in present_student_ids:
                existing = db.query(Attendance).filter(
                    Attendance.user_id == student.id,
                    Attendance.session_id == session_id
                ).first()
                if existing:
                    attendance_records.append(existing)
                    continue
                absent_record = Attendance(
                    user_id=student.id,
                    session_id=session_id,
                    status=AttendanceStatus.ABSENT,
                    confidence_score=0.0
                )
                db.add(absent_record)
                attendance_records.append(absent_record)
        
        db.commit()
        
        # Prepare detailed attendance response
        attendance_responses = []
        for record in attendance_records:
            student = db.query(User).filter(User.id == record.user_id).first()
            response = AttendanceResponse(
                id=record.id,
                user_id=record.user_id,
                session_id=record.session_id,
                status=record.status,
                confidence_score=record.confidence_score,
                created_at=record.created_at,
                student_name=f"{student.first_name} {student.last_name}",
                student_email=student.email,
                student_identifier=student.identifier
            )
            attendance_responses.append(response)
        
        # Clean up temporary image in background
        background_tasks.add_task(lambda: os.remove(image_path))
        
        # Create attendance report
        report = MarkAttendanceResponse(
            session_id=session_id,
            total_students=total_students,
            present_count=len([r for r in attendance_records if r.status == AttendanceStatus.PRESENT]),
            absent_count=len([r for r in attendance_records if r.status == AttendanceStatus.ABSENT]),
            attendance_list=attendance_responses,
            timestamp=datetime.now()
        )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during attendance marking: {str(e)}")
        if 'image_path' in locals() and os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(
            status_code=500,
            detail=f"Error during attendance marking: {str(e)}"
        )

@router.get("/face-count")
async def get_face_count(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get the number of registered faces for the current user."""
    logger.info(f"Retrieving face count for user: {current_user.email}")
    
    try:
        count = db.query(FaceEncoding).filter(
            FaceEncoding.user_id == current_user.id
        ).count()
        
        response = {
            "user_id": current_user.id,
            "face_count": count,
            "minimum_required": settings.MIN_FACE_IMAGES_REQUIRED
        }
        
        logger.info(f"Retrieved face count successfully: {count} faces for user {current_user.email}")
        return response
        
    except Exception as e:
        logger.error(f"Error retrieving face count: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving face count"
        )  