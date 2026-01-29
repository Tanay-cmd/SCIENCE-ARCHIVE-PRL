export interface FitsHeaderCard {
  Keyword: string;
  Value: string;
  Comment: string;
}

export async function getFitsHeader(fileName: string): Promise<FitsHeaderCard[]> {
  try {
    console.log("getFitsHeader called with fileName:", fileName);
    const url = `http://127.0.0.1:5000/fits-header?file=${encodeURIComponent(fileName)}`;
    console.log("Making request to:", url);
    
    // Call the MinIO backend API
    const response = await fetch(url);
    
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    console.log("Response headers:", response.headers);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Response not ok, error data:", errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const headerList: FitsHeaderCard[] = await response.json();
    console.log("Header list received:", headerList.length, "items");
    console.log("First few items:", headerList.slice(0, 3));
    return headerList;
    
  } catch (error: any) {
    console.error("Error reading FITS header:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
} 