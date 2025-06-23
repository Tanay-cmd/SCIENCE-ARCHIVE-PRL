
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Search } from "lucide-react";

export const SearchConstraints = () => {
  const [target, setTarget] = useState("");
  const [radius, setRadius] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [bibcode, setBibcode] = useState("");

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
          <Label className="text-gray-300">Upload your own table of targets in CSV, VOTable or TDAT format (&lt;50MB)</Label>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
              <Upload className="w-4 h-4 mr-2" />
              Select file to upload
            </Button>
            <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
              Clear for new upload
            </Button>
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
        
        <Button variant="outline" className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
          <Search className="w-4 h-4 mr-2" />
          Search for tables matching constraints
        </Button>
      </CardContent>
    </Card>
  );
};
