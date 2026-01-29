from flask import Flask, request, jsonify, send_file
from fits_viewer import FITSViewer
from minio import Minio
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def setup_view_fits_route(app, minio_client, bucket_name):
    viewer = FITSViewer(minio_client, bucket_name)
    
    @app.route('/view-fits')
    def view_fits():
        """Handle FITS file viewing requests"""
        fits_file = request.args.get('file')
        if not fits_file:
            return jsonify({'error': 'No file specified'}), 400
        
        try:
            # Get the processed image path (either from cache or newly processed)
            image_path = viewer.get_fits_image(fits_file)
            
            # Serve the image file
            return send_file(image_path, mimetype='image/png')
            
        except Exception as e:
            logger.error(f"Error processing FITS file: {str(e)}")
            return jsonify({'error': str(e)}), 500

# Example usage in your main Flask app:
"""
from view_fits_route import setup_view_fits_route

app = Flask(__name__)
minio_client = Minio(...)
setup_view_fits_route(app, minio_client, "dataarchive")
"""
