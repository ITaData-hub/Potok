FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Check structure
RUN echo "=== Directory structure ===" && \
    ls -la /app/ && \
    echo "=== App subdirectory ===" && \
    ls -la /app/app/ && \
    echo "=== Looking for main.py ===" && \
    find /app -name "main.py" -type f

# Create __init__.py if missing
RUN touch /app/__init__.py && \
    touch /app/app/__init__.py

# Create non-root user
RUN useradd -m -u 1001 mluser

# Создать директории для логов и других данных ПЕРЕД переключением на non-root
RUN mkdir -p /app/app/data/logs /app/app/data/models && \
    chown -R mluser:mluser /app

# Теперь переключаемся на non-root пользователя
USER mluser

# Expose port
EXPOSE 3004

# Set PYTHONPATH so Python can find the 'app' module
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Start application
CMD ["python", "-m", "app.main"]

