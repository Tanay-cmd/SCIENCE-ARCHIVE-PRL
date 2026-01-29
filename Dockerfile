FROM python:3.12-slim

WORKDIR /app
COPY minio_fits_backend.py .
COPY fits_header.py .

RUN pip install flask minio astropy flask-cors Pillow matplotlib numpy

EXPOSE 5003

CMD ["python", "minio_fits_backend.py"]

