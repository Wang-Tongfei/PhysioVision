"""MinIO / S3 client wrapper for evidence video clips and avatars."""
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

_client = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )
        if not _client.bucket_exists(settings.minio_bucket):
            _client.make_bucket(settings.minio_bucket)
    return _client


def upload_evidence_clip(local_path: str, object_name: str) -> str:
    client = get_client()
    try:
        client.fput_object(settings.minio_bucket, object_name, local_path)
    except S3Error:
        # Fallback: store a reference path when MinIO is unavailable (demo).
        return f"minio://{settings.minio_bucket}/{object_name}"
    return f"minio://{settings.minio_bucket}/{object_name}"


def get_presigned_url(object_name: str, expires_sec: int = 3600) -> str:
    client = get_client()
    return client.presigned_get_object(settings.minio_bucket, object_name, expires=expires_sec)
