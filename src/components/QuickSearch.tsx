import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { getMinioClient } from "@/lib/minio";
import { fastFilter } from "@/lib/filterUtils";

interface QuickSearchProps {
  onSearch: (results: any[], coordinates: string | null) => void;
}

const RADIUS_UNITS = [
  { label: "arcmin ('')", value: "arcmin" },
  { label: "arcsec (')", value: "arcsec" },
  { label: "degrees (°)", value: "deg" },
];

export const TableSearch = ({ onSearch }: QuickSearchProps) => {
  const [target, setTarget] = useState("");
  const [radius, setRadius] = useState("");
  const [radiusUnit, setRadiusUnit] = useState("arcmin");
  const [epoch, setEpoch] = useState("");
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Optimized filtered results
  const filteredItems = useMemo(() => fastFilter(allItems, target, ["name", "description", "target"]), [allItems, target]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const minioClient = await getMinioClient();
      if (!minioClient) {
        onSearch([], null);
        setLoading(false);
        return;
      }
      // List all objects in the bucket (or use a prefix if you want to limit)
      const objects = minioClient.listObjects("dataarchive", "", true);
      const items: any[] = [];
      await new Promise<void>((resolve, reject) => {
        objects.on("data", (item) => items.push(item));
        objects.on("error", (err) => reject(err));
        objects.on("end", () => resolve());
      });
      setAllItems(items);
      // Filtering is now handled by filteredItems
      const filtered = fastFilter(items, target, ["name", "description", "target"]);
      // Map to result format
      const searchResults = filtered.map((item, index) => ({
        id: index + 1,
        name: item.name,
        description: `Size: ${item.size}`,
        matches: 1,
        regime: item.metaData?.regime || "N/A",
        mission: item.metaData?.mission || "N/A",
        type: item.metaData?.type || "file",
        ra: item.metaData?.RA || (266.4 + (Math.random() - 0.5) * 2.0),
        dec: item.metaData?.DEC || (-29.0 + (Math.random() - 0.5) * 2.0),
      }));
      const firstResult = searchResults[0];
      const coordinates = firstResult && firstResult.ra && firstResult.dec ? `${firstResult.ra} ${firstResult.dec}` : null;
      onSearch(searchResults, coordinates);
    } catch (error) {
      console.error("Error searching Minio:", error);
      onSearch([], null);
    } finally {
      setLoading(false);
    }
  };

  // Optionally, trigger search on input change (debounced in a real app)
  // useEffect(() => { handleSearch(); }, [target]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="p-6 bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="text-lg font-semibold text-white">Quick Search</label>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Target name or coordinates"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
        </div>
        <div className="flex space-x-2">
          <Input
            placeholder="Radius"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
          <select
            value={radiusUnit}
            onChange={e => setRadiusUnit(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white rounded px-2"
          >
            {RADIUS_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Epoch (date/time or range)"
            value={epoch}
            onChange={(e) => setEpoch(e.target.value)}
            className="bg-slate-700/50 border-blue-500/30 text-white placeholder:text-gray-400"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </Card>
  );
};
