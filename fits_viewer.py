from minio import Minio
import numpy as np
from astropy.io import fits
from PIL import Image
import io
import tempfile
import logging
from fits_image_cache import FITSImageCache
from astropy.visualization import ZScaleInterval, ImageNormalize, AsinhStretch

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class FITSViewer:
    def __init__(self, minio_client, bucket_name):
        """Initialize the FITS viewer with MinIO connection"""
        self.minio_client = minio_client
        self.bucket_name = bucket_name
        self.cache = FITSImageCache()
    
    def get_download_info(self, fits_file):
        """Generate download information including presigned URL and curl command"""
        try:
            # Generate presigned URL with 1 hour expiry
            presigned_url = self.minio_client.presigned_get_object(
                self.bucket_name,
                fits_file,
                expires=3600
            )
            
            # Create curl command
            curl_command = f'curl -X GET "{presigned_url}" --output {fits_file}'
            
            return {
                'presigned_url': presigned_url,
                'curl_command': curl_command,
                'filename': fits_file,
                'expires_in': '1 hour'
            }
            
        except Exception as e:
            logger.error(f"Error generating download info: {str(e)}")
            raise
    
    def get_fits_image(self, fits_file):
        """Get a FITS image, using cache if available"""
        try:
            # Check cache first
            cached_path = self.cache.get_cached_image(fits_file)
            if cached_path:
                logger.debug(f"Returning cached image for {fits_file}")
                return cached_path
            
            # If not in cache, process the FITS file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
                self.minio_client.fget_object(self.bucket_name, fits_file, temp_file.name)
                processed_image = self._process_fits_file(temp_file.name)
                
                # Store in cache
                cache_path = self.cache.store_image(fits_file, processed_image)
                return cache_path
                
        except Exception as e:
            logger.error(f"Error processing FITS file: {str(e)}")
            raise
    
    def _process_fits_file(self, file_path):
        """Process a FITS file into a viewable image"""
        with fits.open(file_path) as hdul:
            # Get the SCI extension data (index 1)
            if len(hdul) < 2:
                raise ValueError("FITS file doesn't contain the expected SCI extension")
            
            data = hdul[1].data  # Use the SCI extension
            
            if data is None:
                raise ValueError("No image data found in SCI extension")
            
            # If data is multi-dimensional, take the first frame
            if data.ndim > 2:
                data = data[0]
            
            # Use ZScale normalization and AsinhStretch for better visualization
            norm = ImageNormalize(data, interval=ZScaleInterval(), stretch=AsinhStretch())
            normalized = norm(data)
            
            # Convert to 8-bit image
            image_data = (normalized * 255).astype(np.uint8)
            
            # Convert to PNG
            image = Image.fromarray(image_data)
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            
            return img_byte_arr.getvalue()

# Example usage
if __name__ == "__main__":
    # Initialize MinIO client
    minio_client = Minio(
        "localhost:9002",
        access_key="Laav10user",
        secret_key="Laav10pass",
        secure=False
    )
    
    # Create viewer instance
    viewer = FITSViewer(minio_client, "dataarchive")
    
    # Try to get download info
    test_file = "miro_paras2_sim_v01.fits"
    try:
        download_info = viewer.get_download_info(test_file)
        print("Download Information:")
        print(f"Presigned URL: {download_info['presigned_url']}")
        print(f"Curl Command: {download_info['curl_command']}")
        print(f"Expires in: {download_info['expires_in']}")
    except Exception as e:
        print(f"Error: {str(e)}")
