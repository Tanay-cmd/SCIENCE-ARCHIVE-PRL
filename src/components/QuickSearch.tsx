
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, HelpCircle } from "lucide-react";

export const QuickSearch = () => {
  const [query, setQuery] = useState("");
  const [currentSelections, setCurrentSelections] = useState<string[]>([]);

  return (
    <Card className="p-6 bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <label className="text-lg font-semibold text-white">Quick Search:</label>
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Tables, positions, times, ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
          <Button variant="link" className="text-blue-400 hover:text-blue-300">
            Query examples
          </Button>
        </div>
        
        {currentSelections.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">Current selections:</span>
            {currentSelections.map((selection, index) => (
              <div key={index} className="flex items-center space-x-1 bg-blue-600/30 px-2 py-1 rounded text-sm text-blue-200">
                <span>{selection}</span>
                <button 
                  onClick={() => setCurrentSelections(prev => prev.filter((_, i) => i !== index))}
                  className="text-blue-300 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Search className="w-4 h-4 mr-2" />
            Send query
          </Button>
        </div>
      </div>
    </Card>
  );
};
