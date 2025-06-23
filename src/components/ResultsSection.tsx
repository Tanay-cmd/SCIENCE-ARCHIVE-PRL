import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, HelpCircle } from "lucide-react";

interface ResultsSectionProps {
  results: any[];
}

export const ResultsSection = ({ results }: ResultsSectionProps) => {
  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            <span>Results ({results.length} tables found)</span>
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
                <span className="text-sm text-gray-400">Add Products to Cart:</span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Highlighted Rows
                </Button>
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300">
                  All Rows
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg border border-blue-500/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700/50 border-blue-500/30">
                    <TableHead className="text-blue-200 font-semibold">#</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Table</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Description</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Matches</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Regime</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Mission</TableHead>
                    <TableHead className="text-blue-200 font-semibold">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, index) => (
                    <TableRow 
                      key={row.id} 
                      className="border-blue-500/20 hover:bg-blue-600/20 text-white"
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-blue-300 bg-blue-900/30">
                        {row.name}
                      </TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-500/50 text-green-300">
                          {row.matches}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.regime}</TableCell>
                      <TableCell className="text-blue-300">{row.mission}</TableCell>
                      <TableCell>{row.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
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
      
      {/* Data Products Cart */}
      <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Data Products Cart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No products selected yet</p>
            <p className="text-sm">Add data products from the results above to start building your cart</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
