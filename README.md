# Face Recognition Attendance System

A modern, scalable attendance management system powered by facial recognition technology.

## Features

- Face-based student registration and attendance tracking
- Real-time face detection and recognition
- Role-based access control (Admin, Teacher, Student)
- Attendance reporting and analytics
- Cloud storage integration
- Asynchronous background processing for model training
- Modern React-based frontend
- RESTful API backend with FastAPI
- Docker containerization

## Tech Stack

### Backend
- FastAPI (Python web framework)
- face_recognition library for facial recognition
- PostgreSQL for database
- Redis for background job queue
- JWT for authentication
- SQLAlchemy for ORM
- Alembic for database migrations

### Frontend
- React with TypeScript
- Material-UI components
- Axios for API calls
- React Webcam for camera integration
- Redux Toolkit for state management

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── alembic/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── public/
└── docker/
```

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/face-recognition-attendance.git
cd face-recognition-attendance
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Using Docker:
```bash
docker-compose up --build
```

4. Manual Setup:

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm start
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## API Documentation

The API documentation is available at `/docs` when running the backend server. It provides detailed information about all available endpoints, request/response formats, and authentication requirements.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
