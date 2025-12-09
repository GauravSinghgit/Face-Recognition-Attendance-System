import os

# Define the folder and files structure as a nested dict/list
structure = {
    "backend": {
        "app": {
            "__init__.py": "",
            "api": {
                "auth.py": "",
                "attendance.py": "",
                "students.py": "",
                "face_training.py": "",
            },
            "core": {
                "face_capture.py": "",
                "face_recognition.py": "",
                "face_trainer.py": "",
                "attendance_service.py": "",
                "user_service.py": "",
            },
            "db": {
                "base.py": "",
                "models.py": "",
                "session.py": "",
            },
            "utils": {
                "logger.py": "",
                "config.py": "",
                "security.py": "",
                "image_utils.py": "",
                "cloud_storage.py": "",
            },
            "tasks": {
                "train_worker.py": "",
            },
            "tests": {
                "test_face_trainer.py": "",
                "test_attendance.py": "",
                "test_auth.py": "",
                "test_face_capture.py": "",
            },
            "main.py": "",
            "celery_worker.py": "",
            "requirements.txt": "",
            "Dockerfile": "",
        }
    },
    "frontend": {
        "public": {},
        "src": {
            "assets": {},
            "components": {},
            "pages": {},
            "services": {
                "api.js": "",
            },
            "utils": {},
            "hooks": {},
            "contexts": {},
            "App.jsx": "",
            "index.jsx": "",
            "tailwind.config.js": "",
            "vite.config.js": "",
        },
        ".env": "",
        "package.json": "",
        "Dockerfile": "",
        "README.md": "",
    },
    "scripts": {
        "init_db.sh": "",
        "run_tests.sh": "",
        "deploy.sh": "",
    },
    ".env": "",
    ".gitignore": "",
    "README.md": "",
    "docker-compose.yml": "",
}


def create_structure(base_path, structure):
    for name, content in structure.items():
        path = os.path.join(base_path, name)
        if isinstance(content, dict):
            os.makedirs(path, exist_ok=True)
            create_structure(path, content)
        else:
            # content is file content, write empty file or content
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)


if __name__ == "__main__":
    project_root = os.getcwd()
    create_structure(project_root, structure)
    print("Project folder structure created successfully.")
