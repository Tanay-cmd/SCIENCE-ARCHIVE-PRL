import { getMinioClient } from "./minio";

// Declare jsfitsio on window object
declare global {
  interface Window {
    jsfitsio: any;
  }
}

export const getCoordinatesFromFits = async (fileName: string): Promise<string | null> => {
  try {
    // Check if jsfitsio is available
    if (!window.jsfitsio) {
      console.error("jsfitsio library is not loaded");
      return null;
    }

    const minioClient = await getMinioClient();
    if (!minioClient) {
      throw new Error("Minio client not initialized");
    }

    // Get presigned URL for the file
    const presignedUrl = await minioClient.presignedGetObject("dataarchive", fileName, 24 * 60 * 60);
    
    // Use jsfitsio to parse the FITS file
    const fp = new window.jsfitsio.FITSParser(presignedUrl);
    const fits = await fp.loadFITS();

    if (fits && fits.header) {
      const header = fits.header;
      
      // Try to get coordinates using common FITS keywords
      const ra = header.get("RA") || header.get("CRVAL1") || header.get("OBJCTRA");
      const dec = header.get("DEC") || header.get("CRVAL2") || header.get("OBJCTDEC");

      console.log('FITS header RA:', ra, 'DEC:', dec);

      if (ra !== undefined && dec !== undefined) {
        return `${ra} ${dec}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error processing FITS file ${fileName}:`, error);
    return null;
  }
};
