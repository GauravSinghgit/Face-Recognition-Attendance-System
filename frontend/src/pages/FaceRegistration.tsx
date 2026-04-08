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
  Card,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Checkbox,
} from '@mui/material';
import {
  Camera,
  CameraAlt,
  Check,
  Face,
  LightMode,
  CenterFocusStrong,
  PhotoCamera,
  Close,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiClient } from '../store/slices/authSlice';
import { Navigate } from 'react-router-dom';

interface CapturedImage {
  id: number;
  src: string;
  selected: boolean;
}

const FaceRegistration: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState<number>(0);
  const { token, user } = useSelector((state: RootState) => state.auth);

  const fetchFaceCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/face/face-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaceCount(response.data.face_count);
    } catch (error) {
      console.error('Error fetching face count:', error);
    }
  }, [token]);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImages((prev) => [...prev, {
          id: Date.now(),
          src: imageSrc,
          selected: true
        }]);
      }
    }
  }, []);

  useEffect(() => {
    fetchFaceCount();
  }, [fetchFaceCount]);

  // Redirect if user is a teacher or admin
  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRemoveImage = (id: number) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleToggleSelect = (id: number) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, selected: !img.selected } : img
    ));
  };

  const handleUpload = async () => {
    const selectedImages = images.filter(img => img.selected);
    
    if (selectedImages.length === 0) {
      setError('Please select at least one photo to register');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let successCount = 0;
    let failureCount = 0;

    try {
      for (const image of selectedImages) {
        try {
          // Convert base64 to blob
          const response = await fetch(image.src);
          const blob = await response.blob();
          const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

          // Create form data
          const formData = new FormData();
          formData.append('image', file);

          // Upload to server
          const result = await apiClient.post('/face/register-face', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          });

          successCount++;
          console.log('Face registration successful:', result.data.message);
        } catch (error: any) {
          failureCount++;
          const errorMessage = error.response?.data?.detail || error.message;
          console.error('Face registration error:', errorMessage);
          setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully registered ${successCount} face${successCount > 1 ? 's' : ''}`);
        if (failureCount === 0) {
          setImages([]);
        }
        fetchFaceCount();
      }

      if (failureCount > 0) {
        setError(prev => prev || `Failed to register ${failureCount} face${failureCount > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Upload process error:', error);
      setError('An unexpected error occurred during the upload process');
    } finally {
      setLoading(false);
    }
  };

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: 'user',
  };

  const FaceDetectionGuidelines = () => (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Face Detection Guidelines
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon>
            <Face />
          </ListItemIcon>
          <ListItemText 
            primary="Face Position"
            secondary="Ensure your face is clearly visible and centered in the frame"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LightMode />
          </ListItemIcon>
          <ListItemText 
            primary="Lighting"
            secondary="Make sure your face is well-lit, avoid backlighting"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <CenterFocusStrong />
          </ListItemIcon>
          <ListItemText 
            primary="Distance"
            secondary="Keep your face at arm's length from the camera"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <PhotoCamera />
          </ListItemIcon>
          <ListItemText 
            primary="Multiple Angles"
            secondary="Capture your face from slightly different angles for better recognition"
          />
        </ListItem>
      </List>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Face Registration
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Please take multiple photos of your face from different angles for better recognition.
        Current registered faces: {faceCount}
      </Typography>

      <FaceDetectionGuidelines />

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
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
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
                  borderRadius: '50%',
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
              onClick={capture}
              startIcon={<CameraAlt />}
              sx={{ mt: 2 }}
              disabled={loading}
            >
              Capture Photo
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Captured Photos
            </Typography>
            <Grid container spacing={2}>
              {images.map((image) => (
                <Grid item xs={6} key={image.id}>
                  <Card sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={image.src}
                      alt={`Captured face ${image.id}`}
                      sx={{ height: 200, objectFit: 'cover' }}
                    />
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      display: 'flex', 
                      gap: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 1,
                      p: 0.5
                    }}>
                      <Checkbox
                        checked={image.selected}
                        onChange={() => handleToggleSelect(image.id)}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveImage(image.id)}
                        sx={{ 
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.light' }
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {images.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Select the photos you want to register and remove any unclear ones.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpload}
                  disabled={loading || !images.some(img => img.selected)}
                  startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                  fullWidth
                >
                  {loading ? 'Uploading...' : 'Register Selected Faces'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FaceRegistration;  