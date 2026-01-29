from astropy.io import fits
from astropy.visualization import ZScaleInterval, AsinhStretch
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image
import io
import sys
import json
import argparse
import matplotlib.pyplot as plt
from flask_cors import CORS
from minio import Minio
import tempfile
import os
import logging
import sys

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import telescope normalization function
try:
    from src.lib.telescopeConfig import normalizeTelescopeName, isValidTelescopeName
except ImportError:
    # Fallback implementation if import fails
    def normalizeTelescopeName(name):
        """Fallback telescope name normalization"""
        if not name:
            return ""
        name = str(name).strip().upper()
        
        # Map common telescope names to standardized versions
        telescope_mapping = {
            "2.5M": "2.5m", "2.5 M": "2.5m", "DOT": "2.5m", "DOT 2.5M": "2.5m",
            "1.2M": "1.2m", "1.2 M": "1.2m", "PRL": "1.2m", "PRL 1.2M": "1.2m",
        }
        
        for key, value in telescope_mapping.items():
            if key in name:
                return value
        
        return name.lower()
    
    def isValidTelescopeName(name):
        """Fallback telescope validation"""
        return name in ["2.5m", "1.2m", "43cm", "50cm"]

from fits_viewer import FITSViewer
from view_fits_route import setup_view_fits_route

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def normalize(value):
    """Normalize string values for consistent comparison"""
    if value is None:
        return ""
    return str(value).strip().lower()

app = Flask(__name__)
# Configure CORS to allow specific ports
CORS(app, origins=[
    "http://localhost:8080",
    "http://localhost:8081", 
    "http://localhost:8082",
    "http://localhost:8083",
    "http://localhost:8084",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082", 
    "http://127.0.0.1:8083",
    "http://127.0.0.1:8084"
])

# Add request logging middleware
@app.before_request
def log_request_info():
    logger.debug('Headers: %s', dict(request.headers))
    logger.debug('Args: %s', dict(request.args))

# Add response logging
@app.after_request
def log_response_info(response):
    logger.debug('Response: %s', response.status)
    return response

# MinIO configuration
# Available MinIO console endpoints in the cluster:
# - Console Endpoints: localhost:9001, localhost:9003, localhost:9005, localhost:9007
# Using one of the working console endpoints (9001 was reported as failing)
MINIO_ENDPOINT = "localhost:9002"  # Using minio2 console endpoint which is working
# Alternative endpoints to try if one fails:
# MINIO_ENDPOINT = "localhost:9005"  # minio3 console endpoint
# MINIO_ENDPOINT = "localhost:9007"  # minio4 console endpoint
MINIO_ACCESS_KEY = "Laav10user"
MINIO_SECRET_KEY = "Laav10pass"
MINIO_BUCKET = "dataarchive"

# Initialize MinIO client
try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False
    )
    print("MinIO client initialized successfully")
except Exception as e:
    print(f"Error initializing MinIO client: {e}")
    minio_client = None

def get_presigned_url(bucket_name: str, object_name: str, expires=3600):
    """Generate a presigned URL for an object"""
    try:
        url = minio_client.presigned_get_object(
            bucket_name,
            object_name,
            expires=expires
        )
        return url
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return None

def get_header_value(header_list, keyword):
    """Extract value from header list by keyword"""
    for header in header_list:
        if header.get('Keyword') == keyword:
            return header.get('Value', '').strip()
    return ''

def matches_filters(header_list, filters):
    """Check if file matches all applied filters"""
    # Extract header values
    telescope = get_header_value(header_list, 'TELESCOP')
    instrument = get_header_value(header_list, 'INSTRUME')
    obs_type = get_header_value(header_list, 'OBSTYPE')
    mode = get_header_value(header_list, 'MODE')
    observer = get_header_value(header_list, 'OBSERVER')
    
    # Normalize telescope using the imported function
    normalized_telescope = normalizeTelescopeName(telescope) if telescope else ''
    
    # Normalize other values consistently
    normalized_instrument = instrument.strip().upper() if instrument else ''
    normalized_obs_type = obs_type.strip().upper() if obs_type else ''
    normalized_mode = mode.strip().upper() if mode else ''
    normalized_observer = observer.strip().upper() if observer else ''
    
    logger.debug(f"Processing file with normalized values:")
    logger.debug(f"  Telescope: {telescope} -> {normalized_telescope}")
    logger.debug(f"  Instrument: {instrument} -> {normalized_instrument}")
    logger.debug(f"Applied filters: {filters}")
    
    # Apply filters with AND logic
    # If filter is empty/not provided, it matches all (no restriction)
    
    # Telescope filter - only apply if telescopes array is not empty
    if filters.get('telescopes') and len(filters['telescopes']) > 0:
        if not telescope:  # If file has no telescope, it doesn't match
            logger.debug(f"Rejected: File has no telescope value")
            return False
            
        normalized_filter_telescopes = [normalizeTelescopeName(t) for t in filters['telescopes']]
        if normalized_telescope not in normalized_filter_telescopes:
            logger.debug(f"Rejected: Telescope '{telescope}' (normalized: {normalized_telescope}) not in {normalized_filter_telescopes}")
            return False
        logger.debug(f"Matched telescope: {telescope} (normalized: {normalized_telescope})")
    
    # Instrument filter - only apply if instruments array is not empty
    if filters.get('instruments') and len(filters['instruments']) > 0:
        if not instrument:  # If file has no instrument, it doesn't match
            logger.debug(f"Rejected: File has no instrument value")
            return False
            
        normalized_filter_instruments = [i.strip().upper() for i in filters['instruments']]
        if normalized_instrument not in normalized_filter_instruments:
            logger.debug(f"Rejected: Instrument '{instrument}' (normalized: {normalized_instrument}) not in {normalized_filter_instruments}")
            return False
        logger.debug(f"Matched instrument: {instrument} (normalized: {normalized_instrument})")
    
    # Observation type filter - only apply if observationTypes array is not empty
    if filters.get('observationTypes') and len(filters['observationTypes']) > 0:
        if not obs_type:  # If file has no observation type, it doesn't match
            logger.debug(f"Rejected: File has no observation type value")
            return False
            
        normalized_filter_obs_types = [ot.strip().upper() for ot in filters['observationTypes']]
        if normalized_obs_type not in normalized_filter_obs_types:
            logger.debug(f"Rejected: Observation type '{obs_type}' (normalized: {normalized_obs_type}) not in {normalized_filter_obs_types}")
            return False
        logger.debug(f"Matched observation type: {obs_type} (normalized: {normalized_obs_type})")
    
    # Mode filter - only apply if mode is not empty
    if filters.get('mode') and filters['mode'].strip():
        if not mode:  # If file has no mode, it doesn't match
            logger.debug(f"Rejected: File has no mode value")
            return False
            
        normalized_filter_mode = filters['mode'].strip().upper()
        if normalized_mode != normalized_filter_mode:
            logger.debug(f"Rejected: Mode '{mode}' (normalized: {normalized_mode}) != '{filters['mode']}' (normalized: {normalized_filter_mode})")
            return False
        logger.debug(f"Matched mode: {mode} (normalized: {normalized_mode})")
    
    # Observer filter - only apply if observer is not empty
    if filters.get('observer') and filters['observer'].strip():
        if not observer:  # If file has no observer, it doesn't match
            logger.debug(f"Rejected: File has no observer value")
            return False
            
        normalized_filter_observer = filters['observer'].strip().upper()
        if normalized_observer != normalized_filter_observer:
            logger.debug(f"Rejected: Observer '{observer}' (normalized: {normalized_observer}) != '{filters['observer']}' (normalized: {normalized_filter_observer})")
            return False
        logger.debug(f"Matched observer: {observer} (normalized: {normalized_observer})")
    
    # Target filter - check OBJECT or TARGET keywords 
    if filters.get('target'):
        object_name = get_header_value(header_list, 'OBJECT').strip().lower()
        target_name = get_header_value(header_list, 'TARGET').strip().lower()
        # Also check for TARGNAME which is sometimes used
        targ_name = get_header_value(header_list, 'TARGNAME').strip().lower()
        
        # Fuzzy matching - check if target is in any of the fields
        target_found = False
        search_target = filters['target'].lower()
        
        if search_target in object_name or search_target in target_name or search_target in targ_name:
            target_found = True
            
        if not target_found:
            logger.debug(f"Rejected: Target '{filters['target']}' not found in OBJECT='{object_name}' or TARGET='{target_name}' or TARGNAME='{targ_name}'")
            return False
        
        logger.debug(f"Matched target: '{filters['target']}' found in fields: OBJECT='{object_name}' or TARGET='{target_name}' or TARGNAME='{targ_name}'")

    logger.debug("File matches all filters")
    return True

def process_fits_image(hdul):
    """Process FITS data into viewable image with enhanced error handling for 32-bit float data"""
    logger.debug(f"Processing FITS image with {len(hdul)} HDUs")

    # Initialize variables to track suitable HDUs
    image_data = None
    primary_hdu_has_data = False
    float32_warning_issued = False  # To track if float32 precision warnings are needed
    candidate_hdus = []  # List to store candidate HDUs
    
    
    # First pass: identify all HDUs with potential image data
    for i, hdu in enumerate(hdul):
        try:
            if hdu.data is not None:
                hdu_type = type(hdu).__name__
                shape_info = getattr(hdu.data, 'shape', None)
                dtype_info = getattr(hdu.data, 'dtype', None)
                
                # Ensure dtype compatibility - check for any float32 variant
                if not (str(dtype_info).endswith('f4') or dtype_info == np.float32):
                    logger.warning(f"HDU {i} has unexpected data type: {dtype_info}")
                    logger.debug(f"Looking for float32 data (f4), found {dtype_info}")
                    continue  # Skip non-float32 data
            
                logger.debug(f"HDU {i}: Type={hdu_type}, Shape={shape_info}, Data type={dtype_info}")
                
                # Record if primary HDU has data
                if i == 0 and shape_info:
                    primary_hdu_has_data = True
                
                # Check for potentially usable image data (at least 2D)
                if shape_info and len(shape_info) >= 2:
                    pixel_count = np.prod(shape_info)
                    logger.debug(f"HDU {i} has {pixel_count} pixels with shape {shape_info}")
                    
                    # Add to candidates with metadata
                    candidate_hdus.append({
                        'index': i,
                        'shape': shape_info,
                        'dimensions': len(shape_info),
                        'pixel_count': pixel_count,
                        'hdu': hdu
                    })
            else:
                logger.debug(f"HDU {i} has no data")
        except Exception as e:
            logger.debug(f"Error analyzing HDU {i}: {str(e)}")
    
    # Log candidate HDUs
    logger.debug(f"Found {len(candidate_hdus)} HDUs with potential image data")
    for candidate in candidate_hdus:
        logger.debug(f"Candidate HDU {candidate['index']}: {candidate['dimensions']}D with shape {candidate['shape']}")
    
    # Select the best HDU for image processing
    if not candidate_hdus:
        raise ValueError("No suitable image data found in any HDU of the FITS file")
    
    # Prioritization logic for selecting best HDU:
    # 1. If primary HDU (HDU 0) has usable image data, prefer it
    # 2. Otherwise, prefer 2D data over higher dimensions if available
    # 3. For similar dimensions, prefer larger images (more pixels)
    
    # First check if primary HDU is a viable candidate
    primary_candidates = [c for c in candidate_hdus if c['index'] == 0]
    if primary_candidates:
        selected_hdu = primary_candidates[0]
        logger.debug(f"Selected primary HDU (index 0) with shape {selected_hdu['shape']}")
    else:
        # Look for 2D candidates first
        two_d_candidates = [c for c in candidate_hdus if c['dimensions'] == 2]
        if two_d_candidates:
            # Select the 2D candidate with the most pixels
            selected_hdu = max(two_d_candidates, key=lambda c: c['pixel_count'])
            logger.debug(f"Selected 2D HDU {selected_hdu['index']} with shape {selected_hdu['shape']}")
        else:
            # Otherwise select the candidate with the least dimensions
            selected_hdu = min(candidate_hdus, key=lambda c: c['dimensions'])
            logger.debug(f"Selected HDU {selected_hdu['index']} with {selected_hdu['dimensions']}D and shape {selected_hdu['shape']}")
    
    # Get the image data from selected HDU
    image_data = selected_hdu['hdu'].data
    logger.debug(f"Using image data from HDU {selected_hdu['index']} with shape {image_data.shape}")
    # Check data type - handle different float32 representations
    if not (str(image_data.dtype).endswith('f4') or image_data.dtype == np.float32):
        logger.warning(f"Selected image data is not 32-bit float (found {image_data.dtype}), modifications might be needed for accurate processing.")
    
    # Handle multi-dimensional data (3D or higher)
    if len(image_data.shape) > 2:
        original_shape = image_data.shape
        logger.debug(f"Processing multi-dimensional data with shape {original_shape}")
        
        try:
            # For 3D data, typically the first dimension is the frame/channel
            if len(image_data.shape) == 3 and image_data.shape[0] == 3:
                # Process as RGB data
                logger.debug("Processing RGB data with 3 channels")
                rgb = np.zeros((image_data.shape[1], image_data.shape[2], 3), dtype=np.float32)
                
                for channel_idx in range(3):
                    channel_data = image_data[channel_idx]
                    valid_pixels = channel_data[np.isfinite(channel_data)]
                    if len(valid_pixels) == 0:
                        vmin, vmax = 0, 1
                    else:
                        vmin = np.percentile(valid_pixels, 1)
                        vmax = np.percentile(valid_pixels, 99)
                        if vmin == vmax:
                            vmin -= 1
                            vmax += 1
                    
                    # Scale and clip
                    scaled = np.clip((channel_data - vmin) / (vmax - vmin), 0, 1)
                    rgb[:, :, channel_idx] = scaled.astype(np.float32)
                
                final_image = (rgb * 255).astype(np.uint8)
                logger.debug("Created RGB composite image")
                return final_image
            
            # For 3D data with different dimensions
            elif len(image_data.shape) == 3:
                # If first dimension is small (like RGB channels but not exactly 3), handle differently
                if image_data.shape[0] <= 3:
                    logger.debug(f"Detected possible channel data with {image_data.shape[0]} channels")
                    # For RGB-like data, use the first channel or average
                    image_data = image_data[0]
                else:
                    # For cube data, use middle slice from first dimension
                    middle_slice = image_data.shape[0] // 2
                    logger.debug(f"Using middle slice ({middle_slice}) from first dimension")
                    image_data = image_data[middle_slice]
            # For 4D or higher, take middle slices of all but the last two dimensions
            elif len(image_data.shape) >= 4:
                logger.debug(f"Handling {len(image_data.shape)}D data by taking middle slices")
                indices = tuple(shape // 2 for shape in image_data.shape[:-2])
                image_data = image_data[indices]
            
            logger.debug(f"Reduced multi-dimensional data from {original_shape} to {image_data.shape}")
        except Exception as e:
            logger.error(f"Error processing multi-dimensional data: {str(e)}")
            # Fallback to simpler method if the sophisticated approach fails
            logger.debug("Using fallback method for multi-dimensional data")
            # Keep slicing first dimension until we get a 2D array
            while len(image_data.shape) > 2:
                image_data = image_data[image_data.shape[0]//2]
            logger.debug(f"Fallback resulted in shape {image_data.shape}")
    
    # Check for valid data values
    try:
        has_nans = np.isnan(image_data).any()
        has_infs = np.isinf(image_data).any()
        non_finite_count = np.sum(~np.isfinite(image_data))
        
        # Check for precision-related warnings in float32
        if image_data.dtype == np.float32 and not float32_warning_issued:
            if non_finite_count / image_data.size > 0.01:
                logger.warning("Significant number of non-finite values detected in float32 data, indicating potential precision issues.")
            float32_warning_issued = True
        
        if has_nans or has_infs:
            logger.debug(f"Found {non_finite_count} non-finite values (NaN/Inf) in image data")
            image_data = np.nan_to_num(image_data)
    except Exception as e:
        logger.warning(f"Error checking data validity: {e}")
    
    # Check for empty or all-zero array
    if image_data.size == 0:
        raise ValueError("Image data is empty (zero size)")
    
    if np.all(image_data == 0):
        logger.warning("Image contains all zeros")
        # Add a small value to make it visible
        image_data = image_data + 1
    
    # Check data range to detect potential issues
    data_min = np.min(image_data)
    data_max = np.max(image_data)
    logger.debug(f"Raw data range: min={data_min}, max={data_max}, mean={np.mean(image_data):.2f}")
    
    # Use ZScale for automatic scaling
    zscale = ZScaleInterval()
    try:
        vmin, vmax = zscale.get_limits(image_data)
        logger.debug(f"ZScale limits: vmin={vmin}, vmax={vmax}")
        
        # Sanity check on ZScale limits
        if vmin >= vmax:
            logger.warning(f"Invalid ZScale limits (vmin={vmin} >= vmax={vmax}), using data min/max instead")
            vmin, vmax = data_min, data_max
            # Ensure there's a range to prevent division by zero
            if vmin == vmax:
                logger.warning("Image has uniform values, applying offset to prevent division by zero")
                vmax = vmin + 1
    except Exception as e:
        logger.warning(f"Error calculating ZScale limits: {e}. Using min/max values instead.")
        vmin, vmax = data_min, data_max
        # Prevent division by zero if min equals max
        if vmin == vmax:
            logger.warning("Image has uniform values, applying offset to prevent division by zero")
            vmax = vmin + 1
    
    # Normalize the data
    try:
        normalized = np.clip((image_data - vmin) / (vmax - vmin), 0, 1)
        logger.debug(f"Normalized data range: min={np.min(normalized):.4f}, max={np.max(normalized):.4f}")
        
        # Apply asinh stretch for better dynamic range
        stretch = AsinhStretch()
        stretched = stretch(normalized)
        logger.debug(f"Stretched data range: min={np.min(stretched):.4f}, max={np.max(stretched):.4f}")
        
        # Check if stretch produced valid results
        if not np.isfinite(stretched).all() or np.min(stretched) < 0 or np.max(stretched) > 1:
            logger.warning("Stretch produced invalid values, falling back to linear normalization")
            stretched = normalized
        
        # Convert to 8-bit image
        final_image = (stretched * 255).astype(np.uint8)
        logger.debug(f"Final 8-bit image range: min={np.min(final_image)}, max={np.max(final_image)}")
        
        # Check if the image has enough variance to be useful
        std_dev = np.std(final_image)
        if std_dev < 1.0:
            logger.warning(f"Image has very low variance (std={std_dev:.2f}), may appear nearly blank")
        
        logger.debug(f"Successfully processed image data to shape {final_image.shape}")
        return final_image
    
    except Exception as e:
        logger.error(f"Error in final image processing: {str(e)}")
        raise

@app.route('/fits-header', methods=['GET'])
def fits_header():
    fits_file = request.args.get('file')
    if not fits_file:
        return jsonify({'error': 'No file specified'}), 400
    
    try:
        # Download file from MinIO to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
            minio_client.fget_object(MINIO_BUCKET, fits_file, temp_file.name)
            temp_file_path = temp_file.name
        
        # Read FITS header
        with fits.open(temp_file_path) as hdul:
            header = hdul[0].header
            header_list = [
                {'Keyword': card.keyword, 'Value': str(card.value), 'Comment': card.comment}
                for card in header.cards
            ]
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return jsonify(header_list)
    except Exception as e:
        print(f"Error processing FITS file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/filtered-search', methods=['GET'])
def filtered_search():
    """
    Search FITS files with header-based filtering, now including target keyword
    """
    try:
        # Get filter parameters from query string
        telescopes = request.args.get('telescopes', '').split(',') if request.args.get('telescopes') else []
        instruments = request.args.get('instruments', '').split(',') if request.args.get('instruments') else []
        observation_types = request.args.get('observationTypes', '').split(',') if request.args.get('observationTypes') else []
        mode = request.args.get('mode', '')
        observer = request.args.get('observer', '')
        target = request.args.get('target', '')
        
        # Remove empty strings from arrays and normalize values
        telescopes = [normalizeTelescopeName(t.strip()) for t in telescopes if t.strip()]
        instruments = [i.strip().upper() for i in instruments if i.strip()]  # Store instruments in uppercase
        observation_types = [ot.strip().upper() for ot in observation_types if ot.strip()]
        
        # Log the normalized filters
        logger.info(f"Normalized filters: telescopes={telescopes}, instruments={instruments}")
        
        filters = {
            'telescopes': telescopes,
            'instruments': instruments,
            'observationTypes': observation_types,
            'mode': mode.strip() if mode else '',
            'observer': observer.strip() if observer else '',
            'target': target.strip().lower()
        }
        
        logger.info(f"Applied filters: {filters}")
        logger.info(f"Raw query params: telescopes='{request.args.get('telescopes')}', instruments='{request.args.get('instruments')}', observationTypes='{request.args.get('observationTypes')}', mode='{mode}', observer='{observer}', target='{target}'")
        
        # Enable debug logging
        logger.setLevel(logging.DEBUG)
            
        # List all FITS files
        objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
        files = []
        total_files_processed = 0
        matched_files = 0
        
        for obj in objects:
            if obj.object_name.lower().endswith(('.fits', '.fit')):
                total_files_processed += 1
                try:
                    # Download file temporarily to read header
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
                        minio_client.fget_object(MINIO_BUCKET, obj.object_name, temp_file.name)
                        temp_file_path = temp_file.name
                    
                    # Read FITS header
                    with fits.open(temp_file_path) as hdul:
                        header = hdul[0].header
                        header_list = [
                            {'Keyword': card.keyword, 'Value': str(card.value), 'Comment': card.comment}
                            for card in header.cards
                        ]
                    
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
                    # Check if file matches filters
                    if matches_filters(header_list, filters):
                        matched_files += 1
                        # Extract key metadata for response
                        telescope = get_header_value(header_list, 'TELESCOP')
                        instrument = get_header_value(header_list, 'INSTRUME')
                        obs_type = get_header_value(header_list, 'OBSTYPE')
                        mode_val = get_header_value(header_list, 'MODE')
                        observer_val = get_header_value(header_list, 'OBSERVER')
                        ra = get_header_value(header_list, 'RA')
                        dec = get_header_value(header_list, 'DEC')
                        object_name = get_header_value(header_list, 'OBJECT')
                        target_name = get_header_value(header_list, 'TARGET')
                        targ_name = get_header_value(header_list, 'TARGNAME')
                        
                        files.append({
                            'name': obj.object_name,
                            'size': obj.size,
                            'last_modified': obj.last_modified.isoformat(),
                            'metadata': {
                                'telescope': telescope,
                                'instrument': instrument,
                                'obs_type': obs_type,
                                'mode': mode_val,
                                'observer': observer_val,
                                'ra': ra,
                                'dec': dec,
                                'object': object_name,
                                'target': target_name,
                                'targname': targ_name
                            }
                        })
                        
                except Exception as e:
                    logger.error(f"Error processing file {obj.object_name}: {e}")
                    continue
        
        logger.info(f"Filtering complete: {matched_files}/{total_files_processed} files matched")
        
        return jsonify({
            'files': files,
            'total_count': len(files),
            'total_processed': total_files_processed,
            'matched_count': matched_files,
            'applied_filters': filters
        })
        
    except Exception as e:
        logger.error(f"Error in filtered search: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/', methods=['GET'])
def list_files():
    """
    List all FITS files in the MinIO bucket
    """
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

@app.route('/api/headers', methods=['GET'])
def get_headers():
    # Example: Return request headers as JSON
    return jsonify(dict(request.headers))

@app.route('/fits-image', methods=['GET'])
def fits_image():
    fits_file = request.args.get('file')
    if not fits_file:
        return jsonify({'error': 'No file specified'}), 400
    
    logger.info(f"Processing FITS image request for file: {fits_file}")
    
    try:
        # Create a temporary processed file name
        processed_name = f"processed_{fits_file.replace('.fits', '.png').replace('.fit', '.png')}"
        
        # Check if processed image already exists
        try:
            minio_client.stat_object(MINIO_BUCKET, processed_name)
            logger.info(f"Found existing processed image: {processed_name}")
            # If exists, return presigned URL
            url = get_presigned_url(MINIO_BUCKET, processed_name)
            if url:
                logger.info(f"Generated presigned URL for existing image")
                return jsonify({'url': url})
            else:
                logger.error("Failed to generate presigned URL for existing image")
                raise Exception("Failed to generate presigned URL")
        except Exception as e:
            logger.info(f"No existing processed image found or error accessing it: {str(e)}")
            # Process and save if doesn't exist
            temp_file_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
                    logger.debug(f"Downloading FITS file from MinIO: {fits_file}")
                    minio_client.fget_object(MINIO_BUCKET, fits_file, temp_file.name)
                    temp_file_path = temp_file.name
                
                # Process FITS file
                logger.debug(f"Opening FITS file: {temp_file_path}")
                with fits.open(temp_file_path) as hdul:
                    try:
                        image_data = process_fits_image(hdul)
                        
                        # Convert to PNG
                        logger.debug("Converting processed data to PNG image")
                        image = Image.fromarray(image_data)
                        img_byte_arr = io.BytesIO()
                        image.save(img_byte_arr, format='PNG', optimize=True)
                        img_byte_arr.seek(0)
                        
                        # Save processed image to MinIO
                        logger.debug(f"Saving processed image to MinIO: {processed_name}")
                        minio_client.put_object(
                            MINIO_BUCKET,
                            processed_name,
                            img_byte_arr,
                            img_byte_arr.getbuffer().nbytes,
                            content_type='image/png'
                        )
                        
                        # Get presigned URL
                        logger.debug("Generating presigned URL for new image")
                        url = get_presigned_url(MINIO_BUCKET, processed_name)
                        if not url:
                            logger.error("Failed to generate presigned URL for new image")
                            raise Exception("Failed to generate presigned URL")
                        
                        logger.info(f"Successfully processed and generated URL for {fits_file}")
                        return jsonify({'url': url})
                    except Exception as e:
                        logger.error(f"Error processing FITS image: {str(e)}", exc_info=True)
                        return jsonify({'error': f'Error processing image: {str(e)}'}), 500
            except Exception as e:
                logger.error(f"Error downloading or opening FITS file: {str(e)}", exc_info=True)
                return jsonify({'error': f'Error accessing FITS file: {str(e)}'}), 500
            finally:
                # Ensure temp file is cleaned up even if processing fails
                if temp_file_path and os.path.exists(temp_file_path):
                    logger.debug(f"Cleaning up temporary file: {temp_file_path}")
                    try:
                        os.unlink(temp_file_path)
                    except Exception as e:
                        logger.warning(f"Failed to clean up temporary file: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error in fits-image endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def view_fits_directly(fits_file):
    """Display a FITS image using matplotlib with detailed subplots for multi-channel data."""
    try:
        with fits.open(fits_file) as hdul:
            logger.info(f"Opening FITS file: {fits_file}")
            
            # Identify the image data
            data = hdul[0].data
            
            if data is None:
                logger.error(f"No data found in FITS file: {fits_file}")
                return
            
            plt.figure(figsize=(12, 10))
            
            if len(data.shape) == 3 and data.shape[0] == 3:
                # Assume RGB order (or similar)
                logger.info(f"Displaying 3-channel FITS data with shape {data.shape}")
                ax1 = plt.subplot(2, 2, 1)
                ax1.imshow(data[0], vmin=np.percentile(data[0], 1), vmax=np.percentile(data[0], 99), cmap='viridis', origin='lower')
                ax1.set_title("Channel 1")
                plt.colorbar(ax1.images[0], ax=ax1)

                ax2 = plt.subplot(2, 2, 2)
                ax2.imshow(data[1], vmin=np.percentile(data[1], 1), vmax=np.percentile(data[1], 99), cmap='viridis', origin='lower')
                ax2.set_title("Channel 2")
                plt.colorbar(ax2.images[0], ax=ax2)

                ax3 = plt.subplot(2, 2, 3)
                ax3.imshow(data[2], vmin=np.percentile(data[2], 1), vmax=np.percentile(data[2], 99), cmap='viridis', origin='lower')
                ax3.set_title("Channel 3")
                plt.colorbar(ax3.images[0], ax=ax3)

                ax4 = plt.subplot(2, 2, 4)
                normalized_rgb = np.stack([data[i] - np.nanmin(data[i]) for i in range(3)], axis=-1)
                norm_rgb = np.clip(normalized_rgb / np.nanmax(normalized_rgb), 0, 1)
                ax4.imshow(norm_rgb, origin='lower')
                ax4.set_title("Composite RGB")
            else:
                # Assume 2D grayscale image
                logger.info(f"Displaying single-channel FITS data with shape {data.shape}")
                plt.imshow(data, cmap='viridis', origin='lower', vmin=np.percentile(data, 1), vmax=np.percentile(data, 99))
                plt.colorbar(label='Intensity')
                plt.title(f"FITS Image: {os.path.basename(fits_file)}")
                plt.xlabel("X (pixels)")
                plt.ylabel("Y (pixels)")

            plt.suptitle(f"FITS Image Overview: {os.path.basename(fits_file)}  -  Shape: {data.shape}")
            plt.tight_layout(rect=[0, 0, 1, 0.95])
            plt.show()
    except Exception as e:
        logger.error(f"Error while viewing FITS file directly: {str(e)}")
        

@app.route('/view-fits', methods=['GET'])
def view_fits_endpoint():
    """API endpoint to view a FITS file through browser visualization"""
    fits_file = request.args.get('file')
    if not fits_file:
        return jsonify({'error': 'No file specified'}), 400
    
    try:
        # Download file from MinIO to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.fits') as temp_file:
            minio_client.fget_object(MINIO_BUCKET, fits_file, temp_file.name)
            temp_file_path = temp_file.name
        
        # Generate visualization data
        with fits.open(temp_file_path) as hdul:
            # Use the existing process_fits_image function
            image_data = process_fits_image(hdul)
            
            # Convert to PNG
            image = Image.fromarray(image_data)
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG', optimize=True)
            img_byte_arr.seek(0)
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            # Return PNG as response
            return send_file(img_byte_arr, mimetype='image/png')
    except Exception as e:
        logger.error(f"Error viewing FITS file: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Support legacy command-line arguments but default to running server
    import sys
    
    # Check for legacy arguments
    if len(sys.argv) > 1:
        parser = argparse.ArgumentParser(description='FITS Handler')
        parser.add_argument('--server', action='store_true', help='Run as web server')
        parser.add_argument('--view', type=str, metavar='FILE', help='View a FITS file directly')
        args = parser.parse_args()
        
        if args.view:
            view_fits_directly(args.view)
            sys.exit(0)
    
    # Default behavior: run the server
    print("Starting FITS header server on http://0.0.0.0:5000")
    print("Available endpoints:")
    print("  - /fits-header?file=<filename>: Get FITS header information")
    print("  - /fits-image?file=<filename>: Get processed FITS image")
    print("  - /view-fits?file=<filename>: View FITS visualization in browser")
    print("  - /filtered-search: Search for FITS files with filtering")
    print("  - /api/files/: List all FITS files")
    app.run(host='0.0.0.0', port=5000, debug=False)
