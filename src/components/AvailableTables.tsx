
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export const AvailableTables = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const tableCategories = [
    {
      name: "Tables to Search",
      tables: ["Enter table name here or select from dropdown"]
    },
    {
      name: "Matches in HEASARC Catalogs",
      tables: []
    },
    {
      name: "Available Tables", 
      subsections: [
        {
          name: "Master Observation Tables",
          count: 12,
          tables: ["chanmaster", "swiftmastr", "xmmmaster", "fermilat"]
        },
        {
          name: "X-ray Sources",
          count: 8,
          tables: ["xraycat", "rosatpspc", "wgacat"]
        },
        {
          name: "Gamma-ray Sources", 
          count: 6,
          tables: ["fermi4fgl", "fermi3fhl", "fermilat"]
        }
      ]
    }
  ];

  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Tables to Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Enter table name here or select from dropdown"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
          <div className="flex space-x-2">
            <Input
              placeholder="Or search for table by keyword"
              className="flex-1 bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
            />
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input type="checkbox" className="rounded" />
            <span>Include VizieR catalogs:</span>
          </label>
          <p className="text-sm text-gray-400 ml-6">
            Alternatively, go to Available Tables pane below to browse
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="border-t border-blue-500/30 pt-4">
            <Button
              onClick={() => toggleSection("matches")}
              variant="ghost"
              className="w-full justify-between text-blue-300 hover:bg-blue-600/30"
            >
              <span>Matches in HEASARC Catalogs</span>
              {expandedSections.includes("matches") ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </Button>
          </div>
          
          <div className="border-t border-blue-500/30 pt-4">
            <Button
              onClick={() => toggleSection("available")}
              variant="ghost"
              className="w-full justify-between text-blue-300 hover:bg-blue-600/30"
            >
              <span>Available Tables</span>
              {expandedSections.includes("available") ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </Button>
            
            {expandedSections.includes("available") && (
              <div className="mt-2 ml-4 space-y-2">
                <div className="space-y-1">
                  <Button
                    onClick={() => toggleSection("master")}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm text-gray-300 hover:bg-blue-600/30"
                  >
                    <span className="flex items-center space-x-2">
                      <span>Master Observation Tables</span>
                      <Badge variant="secondary" className="bg-green-600/30 text-green-200">+</Badge>
                    </span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300">12</Badge>
                  </Button>
                  
                  <Button
                    onClick={() => toggleSection("xray")}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm text-gray-300 hover:bg-blue-600/30"
                  >
                    <span>X-ray Sources</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300">8</Badge>
                  </Button>
                  
                  <Button
                    onClick={() => toggleSection("gamma")}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm text-gray-300 hover:bg-blue-600/30"
                  >
                    <span>Gamma-ray Sources</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300">6</Badge>
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-blue-500/30 pt-4">
            <Button
              onClick={() => toggleSection("parameters")}
              variant="ghost"
              className="w-full justify-between text-blue-300 hover:bg-blue-600/30"
            >
              <span>Table Parameters & Constraints</span>
              {expandedSections.includes("parameters") ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
