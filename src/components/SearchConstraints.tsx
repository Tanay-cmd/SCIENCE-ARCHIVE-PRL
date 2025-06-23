import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface SearchConstraintsProps {
  onSearch: (results: any[]) => void;
}

export const SearchConstraints = ({ onSearch }: SearchConstraintsProps) => {
  const [target, setTarget] = useState("");
  const [radius, setRadius] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [bibcode, setBibcode] = useState("");

  const handleSearch = () => {
    // Create mock results based on constraints
    const mockResults = [];
    
    if (target) {
      mockResults.push({
        id: 1,
        name: "targetresult",
        description: `Target search results for "${target}"`,
        matches: Math.floor(Math.random() * 15) + 1,
        regime: "Multi-wavelength",
        mission: "",
        type: "target"
      });
    }
    
    if (timeFrom || timeTo) {
      mockResults.push({
        id: 2,
        name: "timeresult",
        description: `Temporal constraint results`,
        matches: Math.floor(Math.random() * 8) + 1,
        regime: "X-ray",
        mission: "chandra",
        type: "temporal"
      });
    }
    
    if (bibcode) {
      mockResults.push({
        id: 3,
        name: "bibresult",
        description: `Publication-associated data for bibcode`,
        matches: Math.floor(Math.random() * 5) + 1,
        regime: "Optical",
        mission: "hst",
        type: "publication"
      });
    }
    
    // If no specific constraints, show general results
    if (mockResults.length === 0) {
      mockResults.push({
        id: 1,
        name: "generalresult",
        description: "General catalog search results",
        matches: Math.floor(Math.random() * 20) + 1,
        regime: "Multi-wavelength",
        mission: "",
        type: "general"
      });
    }
    
    onSearch(mockResults);
  };

  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Search Constraints (optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Target:</Label>
          <Input
            placeholder="Name or coordinates. Hit return to recenter viewer."
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Radius:</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Search radius"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
              />
              <Select defaultValue="min">
                <SelectTrigger className="w-20 bg-slate-700/50 border-blue-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">min (')</SelectItem>
                  <SelectItem value="deg">deg (°)</SelectItem>
                  <SelectItem value="sec">sec (")</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-gray-300">Observation epoch (ISO, MJD or JD)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Instant or start of range"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
            />
            <Input
              placeholder="End of time range"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-gray-300">
            <span className="text-blue-400 underline cursor-pointer">Bibcode</span> (i.e., find datasets associated with a particular publication)
          </Label>
          <Input
            placeholder="YYYYjjjjjvvvvppppA"
            value={bibcode}
            onChange={(e) => setBibcode(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
        </div>
        
        <Button onClick={handleSearch} variant="outline" className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
          <Search className="w-4 h-4 mr-2" />
          Search for tables matching constraints
        </Button>
      </CardContent>
    </Card>
  );
};
