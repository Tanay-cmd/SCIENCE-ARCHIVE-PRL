FROM python:3.12-slim

WORKDIR /app
COPY minio_fits_backend.py .
COPY fits_header.py .

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
RUN pip install flask minio astropy flask-cors Pillow matplotlib numpy psycopg2-binary

EXPOSE 5003

CMD ["python", "minio_fits_backend.py"]

