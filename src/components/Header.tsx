
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Settings, HelpCircle, ShoppingCart } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-slate-800/90 backdrop-blur-sm border-b border-blue-500/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mount Abu Observatory</h1>
                <p className="text-sm text-blue-300">Astronomical Data Explorer</p>
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              Clear/reset
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              Tables
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              Target/Constraints
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              Options
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              All
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              Session
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30">
              <HelpCircle className="w-4 h-4 mr-1" />
              Help
            </Button>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-blue-600/30 text-blue-200 border-blue-500/50">
              <ShoppingCart className="w-3 h-3 mr-1" />
              Product Cart: 0 row(s)
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
};
