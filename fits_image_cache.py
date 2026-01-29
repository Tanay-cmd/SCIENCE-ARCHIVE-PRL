from flask import Flask, jsonify, send_file
import os
import logging
import hashlib
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class FITSImageCache:
    def __init__(self, cache_dir="/tmp/fits_cache", max_age_hours=24):
        """Initialize the cache with a directory and maximum age for cached files"""
        self.cache_dir = cache_dir
        self.max_age = timedelta(hours=max_age_hours)
        self._init_cache_dir()
    
    def _init_cache_dir(self):
        """Create the cache directory if it doesn't exist"""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
            logger.info(f"Created cache directory: {self.cache_dir}")
    
    def _get_cache_path(self, fits_file):
        """Generate a unique cache path for a FITS file"""
        # Create a hash of the filename for uniqueness
        cache_key = hashlib.md5(fits_file.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{cache_key}.png")
    
    def get_cached_image(self, fits_file):
        """Check if an image exists in cache and is not expired"""
        cache_path = self._get_cache_path(fits_file)
        
        if os.path.exists(cache_path):
            # Check if cache is expired
            cache_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
            if datetime.now() - cache_time < self.max_age:
                logger.debug(f"Cache hit for {fits_file}")
                return cache_path
            else:
                logger.debug(f"Cache expired for {fits_file}")
                os.remove(cache_path)
        
        return None
    
    def store_image(self, fits_file, image_data):
        """Store a processed image in the cache"""
        cache_path = self._get_cache_path(fits_file)
        try:
            with open(cache_path, 'wb') as f:
                f.write(image_data)
            logger.debug(f"Stored image in cache: {fits_file}")
            return cache_path
        except Exception as e:
            logger.error(f"Error storing image in cache: {str(e)}")
            return None

# Example usage:
if __name__ == "__main__":
    # Create a cache instance
    cache = FITSImageCache()
    
    # Example test
    test_file = "miro_paras2_sim_v01.fits"
    
    # Check if file is in cache
    cached_path = cache.get_cached_image(test_file)
    if cached_path:
        print(f"Found in cache: {cached_path}")
    else:
        print("Not found in cache")

