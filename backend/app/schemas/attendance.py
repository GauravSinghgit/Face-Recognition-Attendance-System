from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

from app.models.attendance import AttendanceStatus

class AttendanceBase(BaseModel):
    session_id: str
    status: AttendanceStatus
    confidence_score: Optional[float] = None

class AttendanceCreate(AttendanceBase):
    user_id: int

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int
    created_at: datetime
    student_name: str
    student_email: str
    student_identifier: Optional[str]

    class Config:
        from_attributes = True

class StudentAttendanceDetail(BaseModel):
    id: int
    user_id: int
    student_name: str
    student_email: str
    student_identifier: Optional[str]
    status: AttendanceStatus
    confidence_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceReport(BaseModel):
    start_date: date
    end_date: date
    session_id: Optional[str] = None
    total_students: int
    total_present: int
    total_absent: int
    attendance_rate: float
    attendance_details: List[StudentAttendanceDetail]

    class Config:
        from_attributes = True

class MarkAttendanceResponse(BaseModel):
    session_id: str
    total_students: int
    present_count: int
    absent_count: int
    attendance_list: List[AttendanceResponse]
    timestamp: datetime

    class Config:
        from_attributes = True  