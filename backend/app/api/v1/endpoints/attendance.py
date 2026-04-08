from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from sqlalchemy import and_

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import AttendanceResponse, AttendanceReport, StudentAttendanceDetail
from app.core.config import settings
from app.utils.logger import default_logger as logger

router = APIRouter()

@router.get("/records", response_model=List[AttendanceResponse])
async def get_attendance_records(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user),
    start_date: date = Query(None),
    end_date: date = Query(None),
    session_id: str = Query(None)
) -> Any:
    """Get attendance records with optional filters."""
    logger.info(
        f"Fetching attendance records - User: {current_user.email}, Role: {current_user.role}, Start Date: {start_date}, End Date: {end_date}, Session ID: {session_id}"
    )
    
    # Base query
    query = db.query(Attendance)
    
    # Apply filters based on user role
    if current_user.role == UserRole.STUDENT:
        # Students can only see their own attendance
        query = query.filter(Attendance.user_id == current_user.id)
        logger.debug(f"Filtering attendance records for student: {current_user.email}")
    elif current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        logger.warning(f"Unauthorized attendance records access attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view attendance records"
        )
    
    # Apply date filters
    if start_date:
        query = query.filter(Attendance.created_at >= start_date)
    if end_date:
        query = query.filter(Attendance.created_at <= end_date)
    
    # Apply session filter
    if session_id:
        query = query.filter(Attendance.session_id == session_id)
    
    try:
        # Execute query
        records = query.order_by(Attendance.created_at.desc()).all()
        logger.info(f"Successfully retrieved {len(records)} attendance records")

        # Transform ORM objects to include student info required by response model
        response_records = []
        for record in records:
            student = db.query(User).filter(User.id == record.user_id).first()
            if student:
                response_records.append(
                    AttendanceResponse(
                        id=record.id,
                        user_id=record.user_id,
                        session_id=record.session_id,
                        status=record.status,
                        confidence_score=record.confidence_score,
                        created_at=record.created_at,
                        student_name=f"{student.first_name} {student.last_name}",
                        student_email=student.email,
                        student_identifier=student.identifier,
                    )
                )
        return response_records
    except Exception as e:
        logger.error(f"Error retrieving attendance records: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving attendance records"
        )

@router.get("/report", response_model=AttendanceReport)
async def get_attendance_report(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user),
    start_date: date = Query(...),
    end_date: date = Query(...),
    session_id: str = Query(..., description="Required session ID to identify specific class session")
) -> Any:
    """Generate attendance report for a given period and session."""
    logger.info(
        f"Generating attendance report - User: {current_user.email}, Start Date: {start_date}, End Date: {end_date}, Session ID: {session_id}"
    )
    
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        logger.warning(f"Unauthorized report generation attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=403,
            detail="Not authorized to generate attendance reports"
        )
    
    try:
        # Get all students
        students = db.query(User).filter(User.role == UserRole.STUDENT).all()
        total_students = len(students)
        
        # Convert dates to datetime for comparison
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Base attendance query with required session_id
        base_query = db.query(Attendance).filter(
            Attendance.created_at >= start_datetime,
            Attendance.created_at <= end_datetime,
            Attendance.session_id == session_id  # Session ID is  required
        )
        
        # Get all attendance records for the period and session
        attendance_records = base_query.all()
        
        # Debug log
        logger.debug(f"Found {len(attendance_records)} attendance records for session {session_id}")
        for record in attendance_records:
            logger.debug(f"Record - User ID: {record.user_id}, Status: {record.status}, Session: {record.session_id}")
        
        # Initialize attendance details list
        attendance_details = []
        present_count = 0
        absent_count = 0
        
        # Process each student
        for student in students:
            # Find student's attendance record
            student_record = next(
                (record for record in attendance_records if record.user_id == student.id),
                None
            )
            
            if student_record:
                # Student has an attendance record
                status = student_record.status
                logger.debug(f"Processing student {student.id} with status {status}")
                
                # Use the enum value for comparison
                if status == AttendanceStatus.PRESENT:
                    present_count += 1
                    
                elif status == AttendanceStatus.ABSENT:
                    absent_count += 1
                   
                elif status == AttendanceStatus.LATE:
                    present_count += 1  # Count late as present
                    
                
                attendance_details.append(
                    StudentAttendanceDetail(
                        id=student_record.id,
                        user_id=student.id,
                        student_name=f"{student.first_name} {student.last_name}",
                        student_email=student.email,
                        student_identifier=student.identifier,
                        status=status,
                        confidence_score=student_record.confidence_score,
                        created_at=student_record.created_at
                    )
                )
            else:
                # Student has no attendance record for this period
                absent_count += 1
                logger.debug(f"No record found for student {student.id}, marking as absent")
                attendance_details.append(
                    StudentAttendanceDetail(
                        id=0,  # No record ID
                        user_id=student.id,
                        student_name=f"{student.first_name} {student.last_name}",
                        student_email=student.email,
                        student_identifier=student.identifier,
                        status=AttendanceStatus.ABSENT,
                        confidence_score=None,
                        created_at=datetime.now()  # Current time as no attendance record exists
                    )
                )
        
        # Debug log final counts
        logger.debug(f"Final counts - Present: {present_count}, Absent: {absent_count}, Total: {total_students}")
        
        # Calculate attendance rate
        attendance_rate = (present_count / total_students * 100) if total_students > 0 else 0
        
        report = AttendanceReport(
            start_date=start_date,
            end_date=end_date,
            session_id=session_id,
            total_students=total_students,
            total_present=present_count,
            total_absent=absent_count,
            attendance_rate=round(attendance_rate, 2),
            attendance_details=sorted(attendance_details, key=lambda x: x.student_name)
        )
        
        logger.info(f"Successfully generated attendance report: {report}")
        return report
        
    except Exception as e:
        logger.error(f"Error generating attendance report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error generating attendance report"
        )

@router.delete("/records/{attendance_id}")
async def delete_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
) -> Any:
    """Delete an attendance record."""
    logger.info(f"Attempting to delete attendance record - ID: {attendance_id}, User: {current_user.email}")
    
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        logger.warning(f"Unauthorized deletion attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete attendance records"
        )
    
    try:
        attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not attendance:
            logger.warning(f"Attendance record not found: {attendance_id}")
            raise HTTPException(
                status_code=404,
                detail="Attendance record not found"
            )
        
        db.delete(attendance)
        db.commit()
        
        logger.info(f"Successfully deleted attendance record: {attendance_id}")
        return {"message": "Attendance record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting attendance record: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error deleting attendance record"
        )      