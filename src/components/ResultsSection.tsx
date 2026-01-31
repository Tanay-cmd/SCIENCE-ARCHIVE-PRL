import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, HelpCircle, Eye, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { useState, Fragment } from "react";
import { cn } from "@/lib/utils";
import { getMinioClient } from "@/lib/minio";
import { ImageOverlay } from "./ImageOverlay";
import { toast } from "sonner";

declare global {
  interface Window {
    jsfitsio: any;
  }
}

interface ResultsSectionProps {
  results: any[];
  onResultSelect: (result: any, index: number) => void;
  onExpand: (rowIndex: number, fileName: string) => void;
  expandedRow: number | null;
  headerData: any[];
}

interface FitsImageData {
  data: number[][];
  width: number;
  height: number;
}

export const ResultsSection = ({
  results,
  onResultSelect,
  onExpand,
  expandedRow,
  headerData
}: ResultsSectionProps) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string | null>(null);

  const handleSelectRow = (row: any, index: number) => {
    setSelectedRow(index);
    onResultSelect(row, index);
  };

  const handleViewImage = (fileName: string) => {
    const lowerFileName = fileName.toLowerCase();
    if (!lowerFileName.endsWith('.fits') && !lowerFileName.endsWith('.fit')) {
      toast.error("Not a FITS file");
      return;
    }
    setViewingFileName(fileName);
  };

  const handleCopyCommand = async (fileName: string) => {
    try {
      const minioClient = await getMinioClient();
      const presignedUrl = await minioClient.presignedGetObject("dataarchive", fileName, 3600);
      const curlCommand = `curl -X GET "${presignedUrl}" --output ${fileName}`;

      await navigator.clipboard.writeText(curlCommand);
      toast.success("Curl command copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy command:", err);
      toast.error("Failed to copy command to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            <span>Results ({results.length} results found)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
                  <Filter className="w-4 h-4 mr-2" />
                  Click to filter by product type
                </Button>
              </div>
            </div>
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <HelpCircle className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-blue-200 mb-2">No Results Found</h3>
                <p className="text-base text-slate-400 mb-2">Try adjusting your search criteria or filters to find data.</p>
                <p className="text-sm text-slate-500">You can use the search forms above to perform a new search.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-500/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700/50 border-blue-500/30">
                      <TableHead className="text-blue-200 font-semibold w-12 text-center">#</TableHead>
                      <TableHead className="text-blue-200 font-semibold">Result</TableHead>
                      <TableHead className="text-blue-200 font-semibold">Description</TableHead>
                      <TableHead className="text-blue-200 font-semibold text-center">View</TableHead>
                      <TableHead className="text-blue-200 font-semibold">Type</TableHead>
                      <TableHead className="text-blue-200 font-semibold">Action</TableHead>
                      <TableHead className="text-blue-200 font-semibold text-center w-20">Header</TableHead>
                      <TableHead className="text-blue-200 font-semibold text-center w-20">Curl</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((row, index) => (
                      <Fragment key={row.id}>
                        <TableRow
                          className={cn("border-blue-500/20 hover:bg-blue-600/20 text-white", {
                            "bg-blue-600/30": selectedRow === index,
                          })}
                        >
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-mono text-blue-300 bg-blue-900/30">
                            {row.name}
                          </TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-300 hover:bg-blue-600/30 relative"
                              onClick={() => handleViewImage(row.name)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
                              onClick={() => handleSelectRow(row, index)}
                            >
                              Select
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onExpand(index, row.name)}
                              className="text-blue-300 hover:bg-blue-600/30"
                            >
                              {expandedRow === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCommand(row.name)}
                              className="text-blue-300 hover:bg-blue-600/30"
                              title="Copy curl command"
                            >
                              <Terminal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === index && (
                          <TableRow className="bg-slate-900/50">
                            <TableCell colSpan={7}>
                              <div className="p-4 bg-slate-800/50 rounded-lg">
                                <h4 className="font-bold text-lg text-blue-200 mb-2">FITS Header Information</h4>
                                <div className="mb-2 text-blue-300 text-sm">
                                  Observer: {(() => {
                                    const obs = headerData.find(h => h.Keyword && h.Keyword.toUpperCase() === 'OBSERVER');
                                    return obs ? obs.Value : '—';
                                  })()}
                                </div>
                                <div className="max-h-60 overflow-y-auto rounded-md border border-slate-700">
                                  <table className="w-full text-xs text-slate-300">
                                    <thead className="bg-slate-800 sticky top-0 z-10">
                                      <tr>
                                        <th className="text-left font-semibold p-2 text-blue-200 w-1/2">Keyword</th>
                                        <th className="text-left font-semibold p-2 text-blue-200 w-1/2">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {headerData.length > 0 ? (
                                        headerData.map((h, i) => (
                                          <tr key={i} className="border-t border-blue-900 bg-slate-900/80">
                                            <td className="p-2 font-mono text-blue-200 w-1/2">{h.Keyword}</td>
                                            <td className="p-2 font-mono whitespace-pre-wrap break-all text-blue-100 w-1/2">{h.Value}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={2} className="text-center p-4">Loading header...</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Q1:a1point @ op313</span>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Print
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Bookmark
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Help
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImageOverlay
        fileName={viewingFileName}
        isOpen={!!viewingFileName}
        onClose={() => setViewingFileName(null)}
        imageData={null}
      />
    </div>
  );
};
