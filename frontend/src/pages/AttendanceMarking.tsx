import React, { useState, useCallback, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  Input,
} from '@mui/material';
import {
  CameraAlt,
  Check,
  Person,
  AccessTime,
  VerifiedUser,
  Email,
  Badge,
  VideocamOff,
  PhotoLibrary,
} from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { RootState } from '../store';
import { Navigate } from 'react-router-dom';

interface AttendanceRecord {
  id: number;
  user_id: number;
  session_id: string;
  status: 'present' | 'absent' | 'late';
  confidence_score: number;
  created_at: string;
  student_name: string;
  student_email: string;
  student_identifier: string | null;
}

interface AttendanceReport {
  session_id: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_list: AttendanceRecord[];
  timestamp: string;
}

const AttendanceMarking: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('session_id', sessionId);

    const result = await axios.post(
      `http://localhost:8000/api/v1/face/mark-attendance`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        params: {
          session_id: sessionId,
        },
        withCredentials: true
      }
    );

    setReport(result.data);
    setSuccess(`Attendance marked successfully. Present: ${result.data.present_count}, Absent: ${result.data.absent_count}`);
  };

  const handleCapture = useCallback(async () => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    if (!hasCamera || cameraError) {
      setError('Camera is not available. Please check camera permissions and connection.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image. Please make sure your camera is working.');
      }

      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });

      await handleImageUpload(file);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  }, [sessionId, hasCamera, cameraError]);

  const handleGalleryUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      setError('No image selected');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await handleImageUpload(file);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [sessionId]);

  useEffect(() => {
    async function checkCamera() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
        
        if (!hasVideoDevice) {
          setHasCamera(false);
          setCameraError('No camera detected on your device');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up the test stream
        setHasCamera(true);
        setCameraError(null);
      } catch (err: any) {
        setHasCamera(false);
        setCameraError(
          err.name === 'NotAllowedError' 
            ? 'Camera access denied. Please allow camera access in your browser settings.'
            : 'Failed to initialize camera. Please check your camera connection.'
        );
      }
    }

    checkCamera();
  }, []);

  // Redirect if user is a student
  if (user?.role === 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: "user",
    aspectRatio: 1.5,
  };

  const renderCamera = () => {
    if (cameraError) {
      return (
        <Box
          sx={{
            width: '100%',
            height: 480,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 2,
            p: 3,
            textAlign: 'center'
          }}
        >
          <VideocamOff sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography color="error" gutterBottom>
            {cameraError}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry Camera Access
          </Button>
        </Box>
      );
    }

    return (
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMediaError={(err) => {
          console.error('Webcam Error:', err);
          setCameraError('Failed to access camera. Please check permissions and try again.');
        }}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '8px'
        }}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Mark Attendance
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              variant="outlined"
              required
            />
          </Grid>

          <Grid item xs={12}>
            {renderCamera()}
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCapture}
                disabled={loading || !hasCamera || !!cameraError}
                startIcon={<CameraAlt />}
              >
                Capture
              </Button>

              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleGalleryUpload}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                startIcon={<PhotoLibrary />}
              >
                Upload from Gallery
              </Button>
            </Box>
          </Grid>

          {loading && (
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <CircularProgress />
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {success && (
            <Grid item xs={12}>
              <Alert severity="success">{success}</Alert>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Attendance Records
            </Typography>
            {report && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Session Summary
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`Total: ${report.total_students}`} />
                  <Chip color="success" label={`Present: ${report.present_count}`} />
                  <Chip color="error" label={`Absent: ${report.absent_count}`} />
                </Box>
              </Box>
            )}
            <List>
              {report?.attendance_list.map((record, index) => (
                <React.Fragment key={record.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      <Person color={record.status === 'present' ? 'success' : 'error'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={record.student_name}
                      secondary={
                        <Box component="div">
                          <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" />
                            <span>{record.student_email}</span>
                          </Box>
                          {record.student_identifier && (
                            <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Badge fontSize="small" />
                              <span>ID: {record.student_identifier}</span>
                            </Box>
                          )}
                          <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTime fontSize="small" />
                            <span>{format(new Date(record.created_at), 'PPp')}</span>
                          </Box>
                          {record.status === 'present' && (
                            <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VerifiedUser fontSize="small" />
                              <span>Confidence: {Math.round(record.confidence_score * 100)}%</span>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    {record.status === 'present' ? (
                      <Check color="success" />
                    ) : (
                      <Typography color="error" variant="body2">Absent</Typography>
                    )}
                  </ListItem>
                </React.Fragment>
              ))}
              {!report?.attendance_list.length && (
                <ListItem>
                  <ListItemText
                    secondary="No attendance records for this session yet"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AttendanceMarking; 