import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, Target } from "lucide-react";

interface TargetInfoProps {
  results: any[];
  selectedIndex: number | null;
  coordinates: string | null;
}

export const TargetInfo = ({ results, selectedIndex, coordinates }: TargetInfoProps) => {
  const selectedResult = selectedIndex !== null ? results[selectedIndex] : null;

  const hasContent = selectedResult || coordinates;

  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Target className="w-5 h-5 text-blue-400" />
          <span>Target Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center space-y-4 text-slate-300 p-6">
        {!hasContent ? (
          <div className="text-center text-slate-400">
            <Info className="mx-auto h-10 w-10 text-slate-500 mb-4" />
            <p className="font-semibold">No Target Selected</p>
            <p className="text-sm">Select a result from the table to see details.</p>
          </div>
        ) : selectedResult ? (
          <>
            <div>
              <p className="font-bold text-blue-300 text-sm">NAME</p>
              <p className="font-mono text-lg">{selectedResult.name}</p>
            </div>
            <div>
              <p className="font-bold text-blue-300 text-sm">DESCRIPTION</p>
              <p>{selectedResult.description}</p>
            </div>
            <div>
              <p className="font-bold text-blue-300 text-sm">COORDINATES (RA, DEC)</p>
              <p className="font-mono">{selectedResult.ra?.toFixed(6)}, {selectedResult.dec?.toFixed(6)}</p>
            </div>
            <div>
              <p className="font-bold text-blue-300 text-sm">TYPE</p>
              <p className="capitalize">{selectedResult.type}</p>
            </div>
          </>
        ) : (
          <div>
            <p className="font-bold text-blue-300 text-sm">CURRENT COORDINATES</p>
            <p className="font-mono text-lg">{coordinates}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 