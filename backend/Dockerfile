# PhysioVision API service image
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# OpenCV/MediaPipe need these shared libraries at runtime (libegl1/libgles2 for
# MediaPipe's GPU-less GL context). Git is needed by pip to install the
# physiosight engine from its pinned commit (see requirements.txt).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libegl1 \
        libgl1 \
        libgles2 \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
