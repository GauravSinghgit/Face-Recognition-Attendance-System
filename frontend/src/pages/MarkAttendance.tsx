import React, { useState, useCallback, useRef } from 'react';
import Webcam from 'react-webcam';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CameraAlt } from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AttendanceReport from '../components/AttendanceReport';

const MarkAttendance: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<any>(null);
  const { token } = useSelector((state: RootState) => state.auth);

  const handleMarkAttendance = async () => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setAttendanceReport(null);

    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Mark attendance
      const result = await axios.post(
        `http://localhost:8000/api/v1/face/mark-attendance?session_id=${sessionId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true
        }
      );

      setSuccess('Attendance marked successfully!');
      setAttendanceReport(result.data);
    } catch (error: any) {
      console.error('Attendance marking error:', error);
      setError(
        error.response?.data?.detail ||
        error.message ||
        'Failed to mark attendance'
      );
    } finally {
      setLoading(false);
    }
  };

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: 'user',
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mark Attendance
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="e.g., MATH101_2024_01_15"
                helperText="Enter a unique identifier for this attendance session"
              />
            </Box>

            <Box
              sx={{
                position: 'relative',
                width: '100%',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  height: '80%',
                  border: '2px dashed rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                  zIndex: 1,
                }
              }}
            >
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{ width: '100%', borderRadius: 8 }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleMarkAttendance}
              startIcon={loading ? <CircularProgress size={20} /> : <CameraAlt />}
              disabled={loading || !sessionId.trim()}
              fullWidth
              sx={{ mt: 2 }}
            >
              {loading ? 'Processing...' : 'Mark Attendance'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          {attendanceReport && (
            <AttendanceReport
              session_id={attendanceReport.session_id}
              total_students={attendanceReport.total_students}
              present_count={attendanceReport.present_count}
              absent_count={attendanceReport.absent_count}
              attendance_list={attendanceReport.attendance_list}
              timestamp={attendanceReport.timestamp}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MarkAttendance; 