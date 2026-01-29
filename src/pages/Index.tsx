import { useState } from "react";
import { Header } from "@/components/Header";
import { ClassicSearchForm } from "@/components/ManualSearchForm";
import { SkyViewer } from "@/components/SkyViewer";
import { ResultsSection } from "@/components/ResultsSection";
import { getCoordinatesFromFits } from "@/lib/fits";
import { TableSearch } from "@/components/QuickSearch";
import { getMinioClient } from "@/lib/minio";
import { TargetInfo } from "@/components/TargetInfo";
import { getFitsHeader } from "@/lib/fitsHeader";

const Index = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [skyViewerCoords, setSkyViewerCoords] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<'manual' | 'quick'>('manual');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [headerData, setHeaderData] = useState<any[]>([]);

  const handleSearch = (results: any[], coordinates: string | null) => {
    // Always REPLACE results, never append, to avoid duplicates
    console.log("Results from backend:", results);
    setSearchResults(results);
    setHasSearched(true);
    setExpandedRow(null); // Collapse any open row on new search
    if (coordinates) {
      setSkyViewerCoords(coordinates);
    }
  };

  const handleConstraintsSearch = (results: any[], coordinates: string | null) => {
    // Always REPLACE results, never append, to avoid duplicates
    console.log("Results from backend:", results);
    setSearchResults(results);
    setHasSearched(true);
    setExpandedRow(null); // Collapse any open row on new search
    if (coordinates) {
      setSkyViewerCoords(coordinates);
    }
  };

  const handleClear = () => {
    setSearchResults([]);
    setHasSearched(false);
    setSkyViewerCoords(null);
    setSelectedIndex(null);
    setExpandedRow(null);
  };

  const handleResultSelect = async (result: any, index: number) => {
    setSelectedIndex(index);
    if (result && result.name) {
      const coords = await getCoordinatesFromFits(result.name);
      if (coords) {
        setSkyViewerCoords(coords);
      }
    }
  };

  const handleExpand = async (rowIndex: number, fileName: string) => {
    console.log("=== handleExpand START ===");
    console.log("handleExpand called with:", { rowIndex, fileName });
    console.log("Current expandedRow:", expandedRow);
    
    if (expandedRow === rowIndex) {
      console.log("Collapsing row:", rowIndex);
      setExpandedRow(null);
      return;
    }
  
    console.log("Expanding row:", rowIndex);
    setHeaderData([]); // Clear previous data while loading
    setExpandedRow(rowIndex);
    console.log("Fetching header for file:", fileName);
  
    try {
      console.log("About to call getFitsHeader...");
      const headerList = await getFitsHeader(fileName);
      console.log("Header data received successfully:", headerList.length, "items");
      setHeaderData(headerList);
      console.log("Header data set in state");
    } catch (error: any) {
      console.error("Error reading FITS header:", error);
      setHeaderData([{ 
        Keyword: 'ERROR', 
        Value: 'Could not load header.', 
        Comment: error.message 
      }]);
    }
    console.log("=== handleExpand END ===");
  };

  const getSearchModeLabel = (mode: string) => {
    switch (mode) {
      case 'manual': return 'Classic Search';
      case 'quick': return 'Table Search';
      default: return 'Classic Search';
    }
  };

  const getNextSearchMode = (currentMode: string) => {
    switch (currentMode) {
      case 'manual': return 'quick';
      case 'quick': return 'manual';
      default: return 'manual';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Header onClear={handleClear} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="mb-6 flex justify-center">
            <button
              className="transition-all duration-200 px-8 py-3 rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold text-lg border-2 border-transparent hover:from-pink-500 hover:to-blue-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
              onClick={() => setSearchMode(getNextSearchMode(searchMode))}
            >
              Switch to {getSearchModeLabel(getNextSearchMode(searchMode))}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-6">
              {searchMode === 'manual' ? (
                <ClassicSearchForm onSearch={handleConstraintsSearch} />
              ) : (
                <>
                  <TableSearch onSearch={handleSearch} />
                  <TargetInfo
                    results={searchResults}
                    selectedIndex={selectedIndex}
                    coordinates={skyViewerCoords}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col space-y-6">
              <SkyViewer
                coordinates={skyViewerCoords}
                results={searchResults}
                selectedIndex={selectedIndex}
              />
              {searchMode === 'manual' && (
                <TargetInfo
                  results={searchResults}
                  selectedIndex={selectedIndex}
                  coordinates={skyViewerCoords}
                />
              )}
            </div>
          </div>
        </div>

        {/* Always show ResultsSection */}
        <div className="mt-6">
          <ResultsSection
            results={searchResults}
            onResultSelect={handleResultSelect}
            onExpand={handleExpand}
            expandedRow={expandedRow}
            headerData={headerData}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
