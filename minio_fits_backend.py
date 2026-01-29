from flask import Flask, request, jsonify
from flask_cors import CORS
from minio import Minio
from astropy.io import fits
import tempfile
import os
import json
import numpy as np
import matplotlib.pyplot as plt
from astropy.visualization import (ZScaleInterval, ImageNormalize, AsinhStretch)

app = Flask(__name__)

# Configure CORS to allow all origins
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:8080", "http://localhost:8081", "http://localhost:8082",
                   "http://127.0.0.1:3000", "http://127.0.0.1:8080", "http://127.0.0.1:8081", "http://127.0.0.1:8082"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

print("Flask app created")

# MinIO configuration from environment variables with fallbacks
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "Laav10user")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "Laav10pass")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "dataarchive")

print(f"MinIO config: {MINIO_ENDPOINT}, bucket: {MINIO_BUCKET}")

try:
    # Initialize MinIO client
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False  # Set to True if using HTTPS
    )
    print("MinIO client initialized successfully")
except Exception as e:
    print(f"Error initializing MinIO client: {e}")
    minio_client = None

@app.route('/')
def hello():
    print("Root endpoint called")
    return "Hello, world!"

@app.route('/api/fits-header/', methods=['GET'])
def get_fits_header():
    """
    Get FITS header from a file stored in MinIO
    """
    print("FITS header endpoint called")
    file_name = request.args.get('file')
    
    if not file_name:
        return jsonify({'error': 'No file specified'}), 400
    
    try:
        # Download file from MinIO to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
            minio_client.fget_object(MINIO_BUCKET, file_name, temp_file.name)
            temp_file_path = temp_file.name
        
        # Read FITS header
        with fits.open(temp_file_path) as hdul:
            header = hdul[0].header
            header_list = [
                {
                    'Keyword': card.keyword, 
                    'Value': str(card.value), 
                    'Comment': card.comment
                }
                for card in header.cards
            ]
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return jsonify(header_list)
        
    except Exception as e:
        print(f"Error processing FITS file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/headers/', methods=['GET'])
def get_headers():
    """
    Get request headers (for testing)
    """
    print("Headers endpoint called")
    return jsonify({'message': 'MinIO FITS Header API is working!'})

@app.route('/api/files/', methods=['GET'])
def list_files():
    """
    List all FITS files in the MinIO bucket
    """
    print("Files endpoint called")
    try:
        objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
        files = []
        for obj in objects:
            if obj.object_name.lower().endswith(('.fits', '.fit')):
                files.append({
                    'name': obj.object_name,
                    'size': obj.size,
                    'last_modified': obj.last_modified.isoformat()
                })
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fits-image/', methods=['GET'])
def get_fits_image():
    """
    Create a URL for the FITS image
    """
    print("FITS image conversion endpoint called")
    file_name = request.args.get('file')
    
    if not file_name:
        return jsonify({'error': 'No file specified'}), 400
    
    try:
        # Check if file exists in MinIO
        try:
            minio_client.stat_object(MINIO_BUCKET, file_name)
        except Exception as e:
            return jsonify({'error': f'File not found in MinIO: {str(e)}'}), 404
        
        # Create a presigned URL for direct image access
        image_path = f"fits-image-data/{file_name}"
        
        # Generate the full URL to the image endpoint
        host = request.host
        scheme = request.scheme or 'http'
        image_url = f"{scheme}://{host}/api/fits-image-data/?file={file_name}"
        
        return jsonify({
            'url': image_url,
            'file': file_name
        })
        
    except Exception as e:
        print(f"Error processing FITS file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/fits-image-data/', methods=['GET'])
def get_fits_image_data():
    """
    Convert a FITS file from MinIO to an image and return it directly
    """
    print("FITS image data endpoint called")
    file_name = request.args.get('file')
    
    if not file_name:
        return jsonify({'error': 'No file specified'}), 400
    
    try:
        # Retrieve FITS file from MinIO
        with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
            minio_client.fget_object(MINIO_BUCKET, file_name, temp_file.name)
            temp_file_path = temp_file.name
        
        # Convert FITS to image using Astropy and Matplotlib
        with fits.open(temp_file_path) as hdul:
            # Use primary HDU
            data = hdul[0].data
            
            if data is None:
                return jsonify({'error': 'No image data found'}), 400
            
            # Handle multi-dimensional data by taking the first frame
            if data.ndim > 2:
                data = data[0]

            # Image normalization
            norm = ImageNormalize(interval=ZScaleInterval(), stretch=AsinhStretch())
            
            # Plot image
            plt.figure(figsize=(10, 10))
            plt.imshow(data, cmap='gray', origin='lower', norm=norm)
            plt.colorbar()
            plt.axis('off')  # Hide axes for cleaner image

            # Save image to a temporary buffer
            buf = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            plt.savefig(buf.name, format='png', bbox_inches='tight', pad_inches=0)
            plt.close()
            
            with open(buf.name, 'rb') as img_file:
                img_data = img_file.read()
        
        # Serve generated image
        response = app.response_class(img_data, content_type='image/png')
        response.headers['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
        
        # Clean up temporary files
        os.unlink(temp_file_path)
        os.unlink(buf.name)
        
        return response
        
    except Exception as e:
        print(f"Error processing FITS file: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(port=5003, debug=False, host='0.0.0.0') 
