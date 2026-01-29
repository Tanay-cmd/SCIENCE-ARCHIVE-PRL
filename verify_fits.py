#!/usr/bin/env python3
"""
FITS File Verification Script

This script verifies the content and structure of a FITS file before attempting
visualization in the Streamlit app. It checks basic structure, data validity,
and displays helpful information for debugging.
"""

import sys
import os
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
import matplotlib.pyplot as plt

def verify_fits_file(file_path):
    """
    Verify a FITS file structure and content
    
    Args:
        file_path (str): Path to the FITS file
    
    Returns:
        bool: True if verification passed, False otherwise
    """
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return False
    
    try:
        print(f"\n===== FITS File Verification: {file_path} =====")
        print(f"File size: {os.path.getsize(file_path) / (1024*1024):.2f} MB")
        
        # Open the FITS file
        with fits.open(file_path) as hdul:
            print(f"\nFITS Structure: {len(hdul)} HDU(s)")
            
            # Display info about each HDU
            for i, hdu in enumerate(hdul):
                print(f"\nHDU {i}: {hdu.__class__.__name__}")
                print(f"  Type: {'Primary' if i == 0 else 'Extension'}")
                
                # Check data presence and type
                if hdu.data is not None:
                    shape = hdu.data.shape
                    dtype = hdu.data.dtype
                    print(f"  Data: {shape} {dtype}")
                    
                    # Data statistics (avoiding potential NaN warnings)
                    data_flat = hdu.data.flatten()
                    valid_data = data_flat[~np.isnan(data_flat) & ~np.isinf(data_flat)]
                    
                    if len(valid_data) > 0:
                        print(f"  Valid values: {len(valid_data)} / {len(data_flat)} pixels ({len(valid_data)/len(data_flat)*100:.1f}%)")
                        print(f"  Data range: {valid_data.min():.5g} to {valid_data.max():.5g}")
                        print(f"  Mean: {valid_data.mean():.5g}")
                        print(f"  Median: {np.median(valid_data):.5g}")
                        print(f"  Std dev: {valid_data.std():.5g}")
                    else:
                        print("  WARNING: No valid data (all NaN or Inf)")
                else:
                    print("  Data: None")
                
                # Check header
                print(f"  Header: {len(hdu.header)} keywords")
                
                # Check for key WCS info
                wcs_info = {}
                for key in ['CTYPE1', 'CTYPE2', 'CRVAL1', 'CRVAL2', 'CRPIX1', 'CRPIX2', 'CDELT1', 'CDELT2']:
                    if key in hdu.header:
                        wcs_info[key] = hdu.header[key]
                
                if wcs_info:
                    print("  WCS Info:")
                    for key, value in wcs_info.items():
                        print(f"    {key}: {value}")
                    
                    # Try to create WCS object
                    try:
                        w = WCS(hdu.header)
                        print(f"  WCS valid: {'Yes' if w.has_celestial else 'No (not celestial)'}")
                    except Exception as e:
                        print(f"  WCS valid: No - {str(e)}")
                else:
                    print("  WCS Info: None")
                
                # Check for other important keywords
                print("  Key metadata:")
                for key in ['OBJECT', 'TELESCOP', 'INSTRUME', 'DATE-OBS', 'EXPTIME', 'FILTER']:
                    if key in hdu.header:
                        print(f"    {key}: {hdu.header[key]}")
            
            # Create a simple visualization of the primary HDU data
            if hdul[0].data is not None:
                try:
                    plt.figure(figsize=(10, 8))
                    
                    # Get data from primary HDU
                    data = hdul[0].data
                    
                    # Handle different data dimensions
                    if len(data.shape) == 2:
                        plot_data = data
                        plt.title("2D Image Data")
                    elif len(data.shape) == 3:
                        plot_data = data[0]  # Take first slice
                        plt.title(f"3D Cube Data (showing slice 0/{data.shape[0]-1})")
                    elif len(data.shape) == 4:
                        plot_data = data[0, 0]  # Take first slice of first cube
                        plt.title(f"4D Data (showing cube 0, slice 0)")
                    else:
                        raise ValueError(f"Cannot visualize data with shape {data.shape}")
                    
                    # Mask invalid values
                    masked_data = np.ma.masked_invalid(plot_data)
                    
                    # Get percentile scaling if we have enough valid data
                    if masked_data.count() > 100:
                        vmin = np.percentile(masked_data.compressed(), 1)
                        vmax = np.percentile(masked_data.compressed(), 99)
                    else:
                        vmin = masked_data.min()
                        vmax = masked_data.max()
                    
                    # Ensure valid range
                    if vmin == vmax:
                        vmin = vmin - 0.1 * abs(vmin) if vmin != 0 else -0.1
                        vmax = vmax + 0.1 * abs(vmax) if vmax != 0 else 0.1
                    
                    # Create visualization
                    plt.imshow(masked_data, cmap='viridis', origin='lower', vmin=vmin, vmax=vmax)
                    plt.colorbar(label='Pixel Value')
                    plt.xlabel("X Pixel")
                    plt.ylabel("Y Pixel")
                    
                    # Save the preview
                    preview_path = f"{os.path.splitext(file_path)[0]}_preview.png"
                    plt.savefig(preview_path, dpi=100)
                    plt.close()
                    print(f"\nPreview image created: {preview_path}")
                    
                except Exception as plot_error:
                    print(f"\nCould not create preview image: {str(plot_error)}")
            
            return True
                
    except Exception as e:
        print(f"Error verifying FITS file: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python verify_fits.py <fits_file>")
        return
    
    file_path = sys.argv[1]
    verify_fits_file(file_path)

if __name__ == "__main__":
    main()

