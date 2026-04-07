FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Start the uvicorn server, using the PORT environment variable provided by Render
CMD uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}
