# PhysioVision API service image
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# OpenCV's Linux wheels require these shared libraries at runtime. Git is used
# to fetch the public vision submodule because Render builds this service from
# the backend directory only.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ARG PHYSIO_AI_BOT_COMMIT=dff7bccec75eb9fd066cbca6a551f3cad64f97b5
RUN git clone --filter=blob:none --no-checkout \
        https://github.com/Wang-Tongfei/Physio_AI_Bot.git Physio_AI_Bot \
    && git -C Physio_AI_Bot checkout "${PHYSIO_AI_BOT_COMMIT}" \
    && rm -rf Physio_AI_Bot/.git

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
