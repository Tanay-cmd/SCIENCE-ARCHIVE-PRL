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
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

from datetime import datetime


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

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "database": os.environ.get("DB_NAME", "observatory"),
    "user": os.environ.get("DB_USER", "observatory_user"),
    "password": os.environ.get("DB_PASS", "observatory_pass"),
    "port": os.environ.get("DB_PORT", "5432")
}

db_pool = SimpleConnectionPool(1, 10, **DB_CONFIG)

def get_conn():
    return db_pool.getconn()


def release_conn(conn):
    db_pool.putconn(conn)

    
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
        region="minio-region",
        secure=False  # Set to True if using HTTPS
    )
    print("MinIO client initialized successfully")
except Exception as e:
    print(f"Error initializing MinIO client: {e}")
    minio_client = None

def get_str(h, key):
    val = h.get(key)
    return str(val) if val and val != "" else None

def get_int(h, key):
    val = h.get(key)
    if val is None or val == "":
        return None
    try:
        return int(val)
    except:
        return None

def get_float(h, key):
    val = h.get(key)
    # Debug print
    if key == "MOONANGL":
        print(f"DEBUG: {key} raw value: {repr(val)}")
    
    if val is None or val == "":
        return None
    try:
        return float(val)
    except:
        return None

def get_bool(h, key):
    val = h.get(key)
    return bool(val)


def header_to_row(h):
    # Ensure FILEID exists, otherwise generate or fail? 
    # Schema says NOT NULL. 
    fileid = get_int(h, "FILEID")
    if fileid is None:
        raise ValueError("FILEID missing or invalid in FITS header")

    obs_date_iso = get_str(h, "DATE-OBS")
    date_obs = None
    obs_date = None
    obs_time = None
    if obs_date_iso:
        try:
             date_obs = datetime.fromisoformat(obs_date_iso)
             if "T" in obs_date_iso:
                 obs_date, obs_time = obs_date_iso.split("T")
             else:
                 obs_date = obs_date_iso
        except:
             pass

    return {
        "fileid": fileid,
        "simple": get_bool(h, "SIMPLE"),
        "bitpix": get_int(h, "BITPIX"),
        "naxis": get_int(h, "NAXIS"),
        "naaxis1": get_int(h, "NAXIS1"),
        "naaxis2": get_int(h, "NAXIS2"),

        "data_type": get_str(h, "DATA_TYP"),
        "qual_fac": get_int(h, "QUAL_FAC"),
        "obs_cmts": get_str(h, "OBS_CMTS"),

        "pi_name": get_str(h, "PI_NAME"),
        "observer": get_str(h, "OBSERVER"),
        "tel_oprt": get_str(h, "TEL_OPRT"),

        "telescope": get_str(h, "TELESCOP"),
        "origin": get_str(h, "ORIGIN"),
        "observat": get_str(h, "OBSERVAT"),

        "obs_lat": get_float(h, "OBS_LAT"),
        "obs_long": get_float(h, "OBS_LONG"),
        "obs_elev": get_float(h, "OBS_ELEV"),

        "instrume": get_str(h, "INSTRUME"),
        "filter1": get_str(h, "FILTER1"),
        "filter2": get_str(h, "FILTER2"),

        "cat_comp": get_bool(h, "CAT-COMP"),
        "solarobj": get_bool(h, "SOLAROBJ"),
        "radecsys": get_str(h, "RADECSYS"),
        "epoch": get_str(h, "EPOCH"),

        "trg_name": get_str(h, "TRG_NAME"),
        "trg_alph": get_float(h, "TRG_ALPH"),
        "trg_delt": get_float(h, "TRG_DELT"),
        "trg_type": get_str(h, "TRG_TYPE"),
        "trg_epoc": get_int(h, "TRG_EPOC"),

        "bunit": get_str(h, "BUNIT"),
        "datamax": get_int(h, "DATAMAX"),
        "datamin": get_int(h, "DATAMIN"),

        "date_obs": date_obs,
        "obs_date": obs_date,
        "obs_time": obs_time,
        "obs_tsys": get_str(h, "OBS_TSYS"),
        "obs_mjd": get_float(h, "OBS MJD"),

        "obs_airm": get_float(h, "AIRMASS"),
        "moonangl": get_float(h, "MOONANGL"),

        "obs_type": get_str(h, "OBS TYPE"),
        "ccd_expt": get_float(h, "CCD EXPT"),
        "ccd_gain": get_float(h, "CCD GAIN"),
        "ccd_rdns": get_float(h, "CCD RDNS"),

        "ins_lamp": get_str(h, "INS_LAMP"),

        "bscale": get_float(h, "BSCALE"),
        "bzero": get_float(h, "BZERO"),
        "o_bzero": get_int(h, "O_BZERO"),
    }



def insert_header(row, conn):
    cols = list(row.keys())
    vals = [row[c] for c in cols]

    query = f"""
    INSERT INTO fits_headers ({",".join(cols)})
    VALUES ({",".join(["%s"] * len(cols))})
    ON CONFLICT (fileid) DO NOTHING
    """

    with conn.cursor() as cur:
        cur.execute(query, vals)


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

@app.route("/api/upload-fits/", methods=["POST"])
def upload_fits():
    """
    Upload FITS → extract header → insert Postgres → upload MinIO
    """

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".fits")
    tmp_path = tmp.name
    file.save(tmp_path)

    conn = get_conn()

    try:
        with fits.open(tmp_path) as hdul:
            header = hdul[0].header
            row = header_to_row(header)

        object_name = f"{row['fileid']}.fits"

        # TRANSACTION (atomic)
        conn.autocommit = False

        insert_header(row, conn)

        minio_client.fput_object(
            MINIO_BUCKET,
            object_name,
            tmp_path
        )

        conn.commit()

        return jsonify({
            "status": "stored",
            "fileid": row["fileid"],
            "object": object_name
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        release_conn(conn)
        os.unlink(tmp_path)


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
        ext = ".fits.gz" if file_name.endswith(".fits.gz") else ".fits"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
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
