
import { useState } from "react";
import { Header } from "@/components/Header";
import { QuickSearch } from "@/components/QuickSearch";
import { SearchConstraints } from "@/components/SearchConstraints";
import { SkyViewer } from "@/components/SkyViewer";
import { AvailableTables } from "@/components/AvailableTables";
import { ResultsSection } from "@/components/ResultsSection";

const Index = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (results: any[]) => {
    setSearchResults(results);
    setHasSearched(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <QuickSearch onSearch={handleSearch} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SearchConstraints onSearch={handleSearch} />
            <AvailableTables />
          </div>
          
          <div className="space-y-6">
            <SkyViewer />
          </div>
        </div>
        
        {hasSearched && <ResultsSection results={searchResults} />}
      </main>
    </div>
  );
};

export default Index;
