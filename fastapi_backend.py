from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from astropy.io import fits
import os
from typing import List, Dict, Any

app = FastAPI(title="FITS Header API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080", 
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "FITS Header API is running!"}

@app.get("/api/fits-header/")
def get_fits_header(file: str = Query(..., description="Path to FITS file")):
    """
    Get FITS header information from a file
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file specified")
    
    if not os.path.exists(file):
        raise HTTPException(status_code=404, detail=f"File not found: {file}")
    
    try:
        with fits.open(file) as hdul:
            header = hdul[0].header
            header_list = [
                {
                    'Keyword': card.keyword, 
                    'Value': str(card.value), 
                    'Comment': card.comment
                }
                for card in header.cards
            ]
        return header_list
    except Exception as e:
        print(f"Error opening FITS file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/headers/")
def get_headers():
    """
    Get request headers (for testing)
    """
    return {"message": "Headers endpoint working!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001) 