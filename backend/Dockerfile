# Use a slim Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy and install requirements first for Docker layer caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and frontend files
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose port
EXPOSE 8000

# Start the FastAPI server from the backend directory
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
