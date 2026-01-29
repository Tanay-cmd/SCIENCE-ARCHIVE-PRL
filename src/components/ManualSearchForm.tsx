import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Check, Info, X, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getMinioClient } from "@/lib/minio";
import { fastFilter } from "@/lib/filterUtils";
import { TELESCOPE_CONFIG } from "@/lib/telescopeConfig";
import { getFitsHeader } from "@/lib/fitsHeader";
import { toast } from "@/components/ui/use-toast";
import {
  getAllInstruments,
  getAllObservationTypes,
  getValidInstrumentsForTelescopes,
  getValidObsTypesForTelescopesAndInstruments,
  findTelescopesForInstrument,
  findTelescopesAndInstrumentsForObsType,
  validateTelescopeInstrumentCombination,
  showValidationErrorToast,
  buildFilteredSearchParams
} from "@/lib/dynamicFilters";

interface SearchConstraintsProps {
  onSearch: (results: any[], coordinates: string | null) => void;
}

const TELESCOPE_OPTIONS = Object.keys(TELESCOPE_CONFIG);
const MODE_OPTIONS = ["Acquisition", "Readout", "Calibration"];
const RADIUS_UNITS = [
  { label: "arcmin ('')", value: "arcmin" },
  { label: "arcsec (')", value: "arcsec" },
  { label: "degrees (°)", value: "deg" },
];


export const ClassicSearchForm = ({ onSearch }: SearchConstraintsProps) => {
  const [coordinates, setCoordinates] = useState("");
  const [objectName, setObjectName] = useState("");
  // Always use strict matching
  const exactMatch = true;
  const [objectSuggestions, setObjectSuggestions] = useState<{name: string, exactMatch: boolean}[]>([]);
  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resultStats, setResultStats] = useState<{total: number, exactMatches: number}>({total: 0, exactMatches: 0});
  const [radius, setRadius] = useState("");
  const [radiusUnit, setRadiusUnit] = useState("arcmin");
  const [telescopes, setTelescopes] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [obsTypes, setObsTypes] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [observer, setObserver] = useState("");
  const [andOr, setAndOr] = useState<'AND' | 'OR'>('AND');
  const [observerSearch, setObserverSearch] = useState("");
  const [allItems, setAllItems] = useState<any[]>([]);
  const [observerOptions, setObserverOptions] = useState<string[]>([]);

  // Optimized filtered results for coordinates/target
  const filteredItems = useMemo(() => fastFilter(allItems, coordinates, ["name", "description", "target"]), [allItems, coordinates]);


  // Enhanced multi-select handler with bottom-up selection
  const toggleMultiSelectWithBottomUp = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void,
    validOptions: string[],
    childSelected: string[],
    setChildSelected: (v: string[]) => void,
    parentSelected: string[],
    setParentSelected: (v: string[]) => void,
    selectionType: 'telescope' | 'instrument' | 'obsType'
  ) => {
    let newSelected;
    if (selected.includes(value)) {
      // Remove the selection
      newSelected = selected.filter(v => v !== value);
      setSelected(newSelected);
      
      // If removing a telescope, prune invalid instruments and obsTypes
      if (selectionType === 'telescope') {
        setTimeout(() => {
          const newValidInstruments = getValidInstrumentsForTelescopes(newSelected);
          setChildSelected(childSelected.filter(opt => newValidInstruments.includes(opt)));
          
          const newValidObsTypes = getValidObsTypesForTelescopesAndInstruments(newSelected, childSelected.filter(opt => newValidInstruments.includes(opt)));
          setChildSelected(childSelected.filter(opt => newValidObsTypes.includes(opt)));
        }, 0);
      }
      // If removing an instrument, prune invalid obsTypes
      else if (selectionType === 'instrument') {
        setTimeout(() => {
          const newValidObsTypes = getValidObsTypesForTelescopesAndInstruments(parentSelected, newSelected);
          setChildSelected(childSelected.filter(opt => newValidObsTypes.includes(opt)));
        }, 0);
      }
    } else {
      // Add the selection
      newSelected = [...selected, value];
      setSelected(newSelected);
      
      // Bottom-up selection logic
      if (selectionType === 'instrument') {
        // Find and add parent telescopes for this instrument
        const parentTelescopes = findTelescopesForInstrument(value);
        const newParentSelected = [...new Set([...parentSelected, ...parentTelescopes])];
        setParentSelected(newParentSelected);
      } else if (selectionType === 'obsType') {
        // Find and add parent instruments and telescopes for this observation type
        const { instruments: parentInstruments, telescopes: parentTelescopes } = findTelescopesAndInstrumentsForObsType(value);
        const newParentSelected = [...new Set([...parentSelected, ...parentTelescopes])];
        const newInstrumentSelected = [...new Set([...newSelected, ...parentInstruments])];
        setParentSelected(newParentSelected);
        setSelected(newInstrumentSelected);
      }
    }
  };


  // Filter observer options by search (now dynamic)
  const filteredObservers = observerOptions.filter(name =>
    name.toLowerCase().includes(observerSearch.toLowerCase())
  );

  // Object search handling
  const handleObjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setObjectName(value);
    
    // Reset result stats when changing the search
    setResultStats({total: 0, exactMatches: 0});
    
    // Generate suggestions based on what's available in the system
    if (value.trim().length > 2) {
      // Ideally this would come from a backend API call
      // For now, we'll use a static list of sample objects
      const sampleObjects = ["TAUCETI", "M31", "HD189733", "OP313", "NGC1234", "WASP-12b"];
      
      // Create enhanced suggestions with exact match information
      const matches = sampleObjects
        .filter(obj => obj.toLowerCase().includes(value.toLowerCase()))
        .map(obj => ({
          name: obj,
          exactMatch: obj.toLowerCase() === value.toLowerCase()
        }))
        // Sort exact matches first
        .sort((a, b) => {
          if (a.exactMatch && !b.exactMatch) return -1;
          if (!a.exactMatch && b.exactMatch) return 1;
          return 0;
        });
      
      setObjectSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setObjectSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setObjectName(suggestion);
    setShowSuggestions(false);
  };
  
  const clearObjectSearch = () => {
    setObjectName("");
    setObjectSuggestions([]);
    setShowSuggestions(false);
    setResultStats({total: 0, exactMatches: 0});
  };
  
  // Function to highlight the matching part of a suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 1) return <span>{text}</span>;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return <span>{text}</span>;
    
    return (
      <span>
        {text.substring(0, index)}
        <span className="bg-blue-500/30 font-medium">{text.substring(index, index + query.length)}</span>
        {text.substring(index + query.length)}
      </span>
    );
  };

  // Handle clicks outside the suggestions box to close it
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Dynamic instrument and obsType options
  // Get the list of all available instruments and observation types
  const allInstruments = useMemo(() => getAllInstruments(), []);
  const allObsTypes = useMemo(() => getAllObservationTypes(), []);

  // Dynamic instrument and obsType options based on current selections
  const validInstruments = useMemo(() => {
    return getValidInstrumentsForTelescopes(telescopes);
  }, [telescopes]);

  const validObsTypes = useMemo(() => {
    return getValidObsTypesForTelescopesAndInstruments(telescopes, instruments);
  }, [telescopes, instruments]);

  // Add a validation effect that runs whenever filter selections change
  useEffect(() => {
    if (telescopes.length > 0 && instruments.length > 0) {
      const validationResult = validateTelescopeInstrumentCombination(telescopes, instruments);
      if (!validationResult.valid) {
        showValidationErrorToast(validationResult, toast);
      }
    }
  }, [telescopes, instruments]);
  
  const handleSearch = async () => {
    // Reset and start loading
    setIsSearching(true);
    setSearchResults([]);
    setResultStats({total: 0, exactMatches: 0});

    // Show toast for exact match search mode
    if (objectName.trim() !== "") {
      toast({
        title: "Strict matching active",
        description: `Searching for exact matches of "${objectName.trim()}"`,
        variant: "default"
      });
    }
    
    // Validate telescope-instrument combination
    const validationResult = validateTelescopeInstrumentCombination(telescopes, instruments);
    if (!validationResult.valid) {
      showValidationErrorToast(validationResult, toast);
      setIsSearching(false);
      return;
    }

    // Build query parameters using our utility function
    const params = buildFilteredSearchParams({
      telescopes,
      instruments,
      observationTypes: obsTypes,
      mode: modes.length > 0 ? modes[0] : "",
      observer
    });
    
    // Add object name parameter if provided
    if (objectName && objectName.trim() !== "") {
      params.append('object', objectName.trim());
      // Always use exact matching
      params.append('exact_match', 'true');
    }
    
    // Add coordinate parameters if provided
    if (coordinates && coordinates.trim() !== "") {
      params.append('coordinates', coordinates.trim());
    }
    
    if (radius && radius.trim() !== "") {
      params.append('radius', radius.trim());
      params.append('radius_unit', radiusUnit);
    }

    const url = `http://127.0.0.1:5000/filtered-search?${params.toString()}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // Process files to identify exact and partial matches
        let processedFiles = [...data.files];
        let exactMatchCount = 0;
        let partialMatchCount = 0;
        
        // Apply client-side exact matching if needed
        if (objectName && objectName.trim() !== "") {
          const searchTerm = objectName.trim().toLowerCase();
          
          // Identify exact matches (case-insensitive complete match)
          const exactMatches = processedFiles.filter(file => 
            file.metadata.object && 
            file.metadata.object.toLowerCase() === searchTerm
          );
          
          // Identify partial matches (case-insensitive contains)
          const partialMatches = processedFiles.filter(file => 
            file.metadata.object && 
            file.metadata.object.toLowerCase().includes(searchTerm) &&
            file.metadata.object.toLowerCase() !== searchTerm // Exclude exact matches
          );
          
          exactMatchCount = exactMatches.length;
          partialMatchCount = partialMatches.length;
          
          // Always use strict matching, ONLY show exact matches
          processedFiles = exactMatches;
          
          if (exactMatchCount > 0) {
            // Show success toast for exact matches
            toast({
              title: `Found ${exactMatchCount} exact ${exactMatchCount === 1 ? 'match' : 'matches'}`,
              description: `Showing only exact matches for "${objectName.trim()}"`,
              variant: "success"
            });
          } else {
            // Show a message when no exact matches found but partial matches exist
            if (partialMatchCount > 0) {
              toast({
                title: "No exact matches found",
                description: `No exact matches for "${objectName.trim()}", but ${partialMatchCount} partial ${partialMatchCount === 1 ? 'match exists' : 'matches exist'}.`,
                variant: "default"
              });
            } else {
              toast({
                title: "No matches found",
                description: `No matches found for "${objectName.trim()}". Try a different search term.`,
                variant: "destructive"
              });
            }
            
            // Return an empty array when no exact matches are found
            processedFiles = [];
          }
        }
        
        // Update result stats with our filtered results
        setResultStats({
          total: processedFiles.length,
          exactMatches: exactMatchCount
        });
        
        // Map files to search results with enhanced match information
        const searchResults = processedFiles.map((file: any, index: number) => {
          // Check for exact and partial matches (must be case-insensitive)
          const searchTerm = objectName ? objectName.trim().toLowerCase() : "";
          const fileObject = file.metadata.object ? file.metadata.object.toLowerCase() : "";
          
          // Determine match type with more precision
          const isExactObjectMatch = !!(searchTerm && fileObject && fileObject === searchTerm);
          const isPartialObjectMatch = !!(searchTerm && fileObject && fileObject.includes(searchTerm) && fileObject !== searchTerm);
          const isStartsWithMatch = !!(searchTerm && fileObject && fileObject.startsWith(searchTerm) && fileObject !== searchTerm);
          
          // Calculate match quality score
          let matchQuality = "none";
          if (isExactObjectMatch) matchQuality = "exact";
          else if (isStartsWithMatch) matchQuality = "high";
          else if (isPartialObjectMatch) matchQuality = "medium";
          
          // More sophisticated match scoring with clearer priority levels
          let matchScore = 1; // Base score for all results
          
          // Object name matching scores
          if (isExactObjectMatch) {
            // Exact matches get highest priority
            matchScore = 1000;
          } else if (isStartsWithMatch) {
            // Starts-with matches get high priority
            matchScore = 500;
          } else if (isPartialObjectMatch) {
            // Contains matches get medium priority
            matchScore = 100;
          }
          
          // Additional score boost for matches with specified filters
          if (instruments.includes(file.metadata.instrument || "")) matchScore += 50;
          if (telescopes.includes(file.metadata.telescope || "")) matchScore += 25;
          if (obsTypes.includes(file.metadata.obs_type || "")) matchScore += 10;
          
          return {
            id: index + 1,
            name: file.name,
            // More descriptive result representation with object name highlighted
            description: `${file.metadata.object || 'Unknown'} | ${file.metadata.telescope || 'N/A'} | ${file.metadata.instrument || 'N/A'}`,
            matches: matchScore,
            regime: "Optical",
            mission: file.metadata.telescope || "N/A",
            type: "FITS",
            ra: file.metadata.ra || null,
            dec: file.metadata.dec || null,
            metadata: file.metadata,
            isExactObjectMatch,
            objectName: file.metadata.object || 'Unknown',
            size: formatFileSize(file.size),
            // Add enhanced match information for UI display
            matchType: isExactObjectMatch ? 'exact' : isPartialObjectMatch ? 'partial' : 'none',
            matchQuality,
            // Add highlight information for result display
            highlightInfo: objectName && file.metadata.object ? {
              text: file.metadata.object,
              matchTerm: objectName.trim(),
              isExact: isExactObjectMatch,
              isPartial: isPartialObjectMatch
            } : null
          };
        });
        
        // Sort with exact matches first, then by other relevant criteria
        searchResults.sort((a, b) => {
          // First sort by match score (descending)
          if (b.matches !== a.matches) return b.matches - a.matches;
          
          // Then by match type (exact > partial > none)
          const matchTypeOrder = { exact: 2, partial: 1, none: 0 };
          const aTypeValue = matchTypeOrder[a.matchType] || 0;
          const bTypeValue = matchTypeOrder[b.matchType] || 0;
          if (bTypeValue !== aTypeValue) return bTypeValue - aTypeValue;
          
          // Then alphabetically by object name for consistent ordering
          return (a.objectName || '').localeCompare(b.objectName || '');
        });
        
        setSearchResults(searchResults);
        
        // Update result statistics with detailed info
        setResultStats({
          total: processedFiles.length,
          exactMatches: exactMatchCount
        });
        
        const firstResult = searchResults[0];
        const coords = firstResult && firstResult.ra && firstResult.dec ? `${firstResult.ra} ${firstResult.dec}` : null;
        onSearch(searchResults, coords);
      } else {
        toast({
          title: "Filtered search failed",
          description: response.statusText,
          variant: "destructive"
        });
        setSearchResults([]);
        onSearch([], null);
      }
      
      setIsSearching(false);
    } catch (error) {
      toast({
        title: "Error in filtered search",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
      setSearchResults([]);
      onSearch([], null);
      setIsSearching(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Classic Search (Advanced Search)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Object/Target Name and Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label className="text-gray-300">Object/Target Name:</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-help">
                        <Info className="h-4 w-4 text-blue-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-800 border-blue-500/30 text-white p-3">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Object Search Mode</h4>
                        <div>
                          <span className="font-semibold">Strict matching:</span> Only finds exact object name matches (case-insensitive)
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-blue-600">
                  Strict match only
                </Badge>
              </div>
            </div>
            <div className="relative">
              <div className="relative">
                <Input
                  placeholder="e.g. TAUCETI, M31, HD189733"
                  value={objectName}
                  onChange={handleObjectNameChange}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (objectName.length > 2 && objectSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400 pr-10"
                />
                {objectName && (
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={clearObjectSearch}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-blue-500/30 rounded-md shadow-lg max-h-60 overflow-auto">
                  {objectSuggestions.map(suggestion => (
                    <div 
                      key={suggestion.name}
                      className="px-4 py-2 cursor-pointer hover:bg-blue-600/30 text-white flex items-center justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSuggestion(suggestion.name);
                      }}
                    >
                      <div>{highlightMatch(suggestion.name, objectName)}</div>
                      <div className="flex items-center">
                        {suggestion.exactMatch && (
                          <Badge variant="outline" className="ml-2 bg-green-800/30 text-green-300 border-green-500/30 text-xs">
                            Exact
                          </Badge>
                        )}
                        {exactMatch && suggestion.exactMatch && (
                          <Check className="h-4 w-4 ml-1 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs mt-1">
                <div className="text-gray-400">
                  Only exact object names will be matched (case-insensitive)
                </div>
                {resultStats.total > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge className="bg-green-600 text-xs">
                      {resultStats.exactMatches} exact {resultStats.exactMatches === 1 ? 'match' : 'matches'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Coordinates (RA Dec):</Label>
            <Input
              placeholder="e.g. 12 34 56.7 -12 34 56"
              value={coordinates}
              onChange={e => setCoordinates(e.target.value)}
              className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Radius */}
        <div className="space-y-2">
          <Label className="text-gray-300">Radius:</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="e.g. 5"
              value={radius}
              onChange={e => setRadius(e.target.value)}
              className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
            />
            <Select value={radiusUnit} onValueChange={setRadiusUnit}>
              <SelectTrigger className="w-28 bg-slate-700/50 border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_UNITS.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Telescopes */}
        <div className="space-y-2">
          <Label className="text-gray-300">Telescopes:</Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TELESCOPE_CONFIG).map(opt => (
              <Button
                key={opt}
                type="button"
                variant={telescopes.includes(opt) ? "default" : "outline"}
                className={
                  telescopes.includes(opt)
                    ? "bg-blue-600 text-white border-blue-400 font-semibold"
                    : "bg-slate-800 text-blue-300 border-blue-400 hover:bg-blue-700 hover:text-white"
                }
                onClick={() => toggleMultiSelectWithBottomUp(opt, telescopes, setTelescopes, validInstruments, instruments, setInstruments, telescopes, setTelescopes, 'telescope')}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        {/* Instruments */}
        <div className="space-y-2">
          <Label className="text-gray-300">Instruments:</Label>
          <div className="flex flex-wrap gap-2">
            {allInstruments.map(opt => (
              <Button
                key={opt}
                type="button"
                variant={instruments.includes(opt) ? "default" : "outline"}
                className={
                  instruments.includes(opt)
                    ? "bg-blue-600 text-white border-blue-400 font-semibold"
                    : validInstruments.includes(opt)
                      ? "bg-slate-800 text-blue-300 border-blue-400 hover:bg-blue-700 hover:text-white"
                      : "bg-slate-700 text-slate-400 opacity-60 border-slate-600 cursor-not-allowed"
                }
                onClick={() => toggleMultiSelectWithBottomUp(opt, instruments, setInstruments, validObsTypes, obsTypes, setObsTypes, telescopes, setTelescopes, 'instrument')}
                disabled={!validInstruments.includes(opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        {/* Type of Observation */}
        <div className="space-y-2">
          <Label className="text-gray-300">Type of Observation:</Label>
          <div className="flex flex-wrap gap-2">
            {allObsTypes.map(opt => (
              <Button
                key={opt}
                type="button"
                variant={obsTypes.includes(opt) ? "default" : "outline"}
                className={
                  obsTypes.includes(opt)
                    ? "bg-blue-600 text-white border-blue-400 font-semibold"
                    : validObsTypes.includes(opt)
                      ? "bg-slate-800 text-blue-300 border-blue-400 hover:bg-blue-700 hover:text-white"
                      : "bg-slate-700 text-slate-400 opacity-60 border-slate-600 cursor-not-allowed"
                }
                onClick={() => toggleMultiSelectWithBottomUp(opt, obsTypes, setObsTypes, validObsTypes, obsTypes, setObsTypes, telescopes, setTelescopes, 'obsType')}
                disabled={!validObsTypes.includes(opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        {/* Mode */}
        <div className="space-y-2">
          <Label className="text-gray-300">Mode:</Label>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map(opt => (
              <Button
                key={opt}
                type="button"
                variant={modes.includes(opt) ? "default" : "outline"}
                className={modes.includes(opt) ? "bg-blue-600 text-white" : "bg-slate-700 text-blue-300"}
                onClick={() => {
                  if (modes.includes(opt)) {
                    setModes(modes.filter(m => m !== opt));
                  } else {
                    setModes([...modes, opt]);
                  }
                }}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        {/* Observer */}
        <div className="space-y-2">
          <Label className="text-gray-300">Observer:</Label>
          <Input
            placeholder="Search observer name..."
            value={observerSearch}
            onChange={e => setObserverSearch(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400 mb-2"
          />
          <div className="max-h-32 overflow-y-auto bg-slate-700/30 rounded-lg p-2">
            {filteredObservers.map(name => (
              <div
                key={name}
                className={`cursor-pointer px-2 py-1 rounded ${observer === name ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/30 text-blue-200'}`}
                onClick={() => setObserver(name)}
              >
                {name}
              </div>
            ))}
            {filteredObservers.length === 0 && <div className="text-gray-400 px-2">No matches</div>}
          </div>
        </div>
        {/* Search Button */}
        <Button 
          onClick={handleSearch} 
          variant="outline" 
          className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-600/30 mt-4"
          disabled={isSearching}
        >
          {isSearching ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
