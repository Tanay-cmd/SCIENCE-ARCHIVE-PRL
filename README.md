# Astronomy Archive Viewer

This application allows viewing and analyzing astronomical FITS files.

## Running the Backend Server

The application uses a Flask backend server to interface with MinIO for FITS file storage and processing:

1. Make sure you have all required dependencies installed:
   ```bash
   pip install flask flask-cors minio astropy matplotlib numpy
   ```

2. Start the MinIO FITS backend server:
   ```bash
   python minio_fits_backend.py
   ```

   This will start the server on port 5003. The server must be running for the image viewer to work.

## Troubleshooting

If images don't display when clicking the eye view button:

1. Ensure the backend server is running on port 5003:
   ```bash
   ps aux | grep python
   ```
   
   You should see a process running `minio_fits_backend.py`

2. If the server isn't running, start it:
   ```bash
   python minio_fits_backend.py
   ```

3. Check the browser console for any error messages

4. Verify that your FITS files are correctly uploaded to the MinIO bucket

## Development

To start the frontend development server:
```bash
npm run dev
```

# FITS Image Viewer Implementation

## FITS to Image Conversion Process

The FITS (Flexible Image Transport System) files are converted to viewable images using a server-side process in `fits_header.py`. This approach leverages the powerful astronomical data processing capabilities of `astropy` while keeping the browser-side code simple.

### Key Components

1. **Data Retrieval**
   - The frontend requests an image via `/fits-image?file=filename.fits`
   - Backend retrieves the FITS file from MinIO object storage
   - File is temporarily stored on the server for processing

2. **Image Processing Pipeline**
   - **Reading**: Use `astropy.io.fits` to open and read FITS data
   - **Dimensionality Handling**: Handle multi-dimensional FITS data by taking the first frame
   - **Scaling**: Use `ZScaleInterval` for automatic contrast scaling
     - This is an astronomy-specific algorithm that robustly determines black/white levels
   - **Normalization**: Clip values to 0-1 range based on the calculated scale
   - **Dynamic Range Enhancement**: Apply `AsinhStretch` transformation
     - This stretch function is particularly effective for astronomical data with high dynamic range
   - **8-bit Conversion**: Transform to standard 8-bit (0-255) image format

3. **Image Delivery**
   - Convert processed data to PNG using PIL (Python Imaging Library)
   - Set cache headers for better performance on repeated views
   - Return image with proper MIME type

### Frontend Enhancement Features

Once the image is delivered to the browser, the user can apply additional visual enhancements:
- Color mapping
- Brightness/contrast adjustments
- Image transformations (rotate, flip)
- Zoom and pan with gesture support
- Histogram visualization

This hybrid approach offers the best of both worlds:
- Scientific-grade processing in Python for the complex FITS handling
- Interactive user experience in the browser for real-time adjustments

### Advanced Features

- Automatic detection of data ranges for optimal display
- Handling of various FITS formats (including multi-dimensional data)
- Browser-side caching to minimize server load
- Error handling for corrupted or invalid FITS files


