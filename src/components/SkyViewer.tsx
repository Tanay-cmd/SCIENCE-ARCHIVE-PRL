
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Layers } from "lucide-react";

export const SkyViewer = () => {
  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>View: Pan, zoom and shift/click to set query region</span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300">
              ICRS
            </Button>
            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300">
              SIN
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="w-full h-96 bg-gradient-to-br from-black via-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30 overflow-hidden">
            {/* Simulated star field */}
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1)_1px,transparent_1px),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1)_1px,transparent_1px),radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:100px_100px]"></div>
              
              {/* Coordinate display */}
              <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded text-white text-sm font-mono">
                17 44 05.84 -30 02 23.8
              </div>
              
              {/* Zoom controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300 bg-slate-800/80">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300 bg-slate-800/80">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300 bg-slate-800/80">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300 bg-slate-800/80">
                  <Layers className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Central crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-0.5 bg-purple-400"></div>
                <div className="w-0.5 h-8 bg-purple-400 absolute top-[-16px] left-[15px]"></div>
              </div>
              
              {/* Simulated stars */}
              <div className="absolute top-[30%] left-[25%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-[60%] left-[70%] w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
              <div className="absolute top-[45%] left-[55%] w-0.5 h-0.5 bg-yellow-200 rounded-full"></div>
              <div className="absolute top-[75%] left-[30%] w-1 h-1 bg-red-200 rounded-full"></div>
              <div className="absolute top-[20%] left-[80%] w-0.5 h-0.5 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded text-white text-sm">
            zoom out
          </div>
          
          {/* Coordinates display */}
          <div className="absolute bottom-4 right-4 bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded text-white text-sm font-mono">
            43.33° × 44.00°
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
