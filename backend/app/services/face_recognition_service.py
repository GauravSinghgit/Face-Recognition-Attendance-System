import face_recognition
import numpy as np
import cv2
from typing import List, Tuple, Optional
import os
from datetime import datetime

from app.core.config import settings
from app.models.face_encoding import FaceEncoding
from app.models.user import User

class FaceRecognitionService:
    def __init__(self):
        self.face_encodings_cache = {}  # Cache for face encodings
        self.last_cache_update = None
        self.cache_ttl = 300  # Cache TTL in seconds (5 minutes)

    def detect_faces(self, image_path: str) -> List[np.ndarray]:
        """Detect faces in an image and return their locations."""
        try:
            if not os.path.exists(image_path):
                raise ValueError(f"Image file not found: {image_path}")
            
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Failed to load image file")
            
            # Convert to RGB (face_recognition expects RGB)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Try different preprocessing techniques if no face is detected initially
            face_locations = face_recognition.face_locations(
                image_rgb, model=settings.FACE_DETECTION_MODEL
            )
            
            if not face_locations:
                # Try histogram equalization
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                equalized = cv2.equalizeHist(gray)
                face_locations = face_recognition.face_locations(
                    equalized, model=settings.FACE_DETECTION_MODEL
                )
                
                if not face_locations:
                    # Try adjusting brightness and contrast
                    adjusted = cv2.convertScaleAbs(image_rgb, alpha=1.3, beta=30)
                    face_locations = face_recognition.face_locations(
                        adjusted, model=settings.FACE_DETECTION_MODEL
                    )
            
            return face_locations
        except Exception as e:
            print(f"Error in detect_faces: {str(e)}")
            raise

    def encode_face(self, image_path: str, face_location: Optional[Tuple] = None) -> Optional[np.ndarray]:
        """Generate face encoding for a given image."""
        try:
            if not os.path.exists(image_path):
                raise ValueError(f"Image file not found: {image_path}")
            
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Failed to load image file")
            
            # Convert to RGB (face_recognition expects RGB)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Try to enhance image quality
            enhanced = cv2.convertScaleAbs(image_rgb, alpha=1.3, beta=30)
            
            if face_location:
                face_encodings = face_recognition.face_encodings(enhanced, [face_location])
            else:
                face_encodings = face_recognition.face_encodings(enhanced)
            
            if not face_encodings:
                # Try with original image if enhancement didn't work
                if face_location:
                    face_encodings = face_recognition.face_encodings(image_rgb, [face_location])
                else:
                    face_encodings = face_recognition.face_encodings(image_rgb)
            
            if not face_encodings:
                print("No face encodings generated")
                return None
            
            return face_encodings[0]
        except Exception as e:
            print(f"Error in encode_face: {str(e)}")
            return None

    def compare_faces(self, known_encoding: np.ndarray, unknown_encoding: np.ndarray) -> Tuple[bool, float]:
        """Compare two face encodings and return match status and confidence."""
        if known_encoding is None or unknown_encoding is None:
            return False, 0.0

        # Calculate face distance
        face_distance = face_recognition.face_distance([known_encoding], unknown_encoding)[0]
        
        # Convert distance to similarity score (0-1)
        # The face_distance is typically between 0 and 1, where:
        # - 0 means perfect match
        # - >0.6 typically means different faces
        # We'll convert this to a confidence score where:
        # - 1.0 means perfect match (distance = 0)
        # - 0.0 means completely different (distance >= 0.6)
        confidence = max(0, min(1, (0.6 - face_distance) / 0.6))
        
        # Check if faces match based on tolerance
        is_match = face_distance <= settings.FACE_RECOGNITION_TOLERANCE
        
        return is_match, confidence

    def save_face_image(self, image_data: bytes, user_id: int) -> str:
        """Save face image to disk and return the file path."""
        try:
            if not image_data:
                raise ValueError("Empty image data")
            
            # Ensure base upload directory exists
            os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
            
            # Create user directory if it doesn't exist
            user_dir = os.path.join(settings.UPLOAD_DIRECTORY, str(user_id))
            os.makedirs(user_dir, exist_ok=True)

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"face_{timestamp}.jpg"
            file_path = os.path.join(user_dir, filename)

            # Save image
            with open(file_path, "wb") as f:
                f.write(image_data)

            # Verify the file was saved
            if not os.path.exists(file_path):
                raise ValueError("Failed to save image file")

            return file_path
        except Exception as e:
            print(f"Error in save_face_image: {str(e)}")
            raise

    def process_attendance_image(self, image_path: str, known_faces: List[FaceEncoding]) -> List[Tuple[User, float]]:
        """Process an attendance image and return matched users with confidence scores."""
        # Detect and encode faces in the attendance image
        image = face_recognition.load_image_file(image_path)
        face_locations = face_recognition.face_locations(image, model=settings.FACE_DETECTION_MODEL)
        face_encodings = face_recognition.face_encodings(image, face_locations)

        matches = []
        for unknown_encoding in face_encodings:
            best_match = None
            best_confidence = 0.0

            # Compare with each known face
            for known_face in known_faces:
                known_encoding = np.frombuffer(known_face.encoding_data)
                is_match, confidence = self.compare_faces(known_encoding, unknown_encoding)
                
                if is_match and confidence > best_confidence:
                    best_match = known_face.user
                    best_confidence = confidence

            if best_match:
                matches.append((best_match, best_confidence))

        return matches

    def preprocess_image(self, image_path: str) -> str:
        """Preprocess image for better face detection."""
        image = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization
        equalized = cv2.equalizeHist(gray)
        
        # Save preprocessed image
        preprocessed_path = f"{image_path}_preprocessed.jpg"
        cv2.imwrite(preprocessed_path, equalized)
        
        return preprocessed_path 