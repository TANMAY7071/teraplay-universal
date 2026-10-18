import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { standardizedGenres } from "@/data/anime";

interface SearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  className?: string;
}

const SearchAndFilter = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedGenres, 
  setSelectedGenres,
  className = ""
}: SearchAndFilterProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(
      selectedGenres.includes(genre)
        ? selectedGenres.filter(g => g !== genre)
        : [...selectedGenres, genre]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSearchTerm("");
  };

  return (
    <div className={`premium-surface rounded-2xl p-3 sm:flex sm:flex-row sm:items-center sm:gap-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search donghua titles..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 rounded-full border-white/10 bg-white/[0.07] pl-11 pr-10 text-sm focus:border-primary/70 sm:text-base"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 h-auto -translate-y-1/2 rounded-full p-1"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>

      {/* Filter Button */}
      <div className="mt-3 flex items-center justify-between gap-2 sm:mt-0 sm:justify-start">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="relative h-12 flex-1 rounded-full border-white/10 bg-white/[0.07] text-sm hover:bg-white/[0.12] sm:flex-initial"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Genres</span>
              <span className="sm:hidden">Filter</span>
              {selectedGenres.length > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full bg-primary text-primary-foreground text-xs">
                  {selectedGenres.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="z-50 w-72 rounded-2xl border-white/10 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl sm:w-80" 
            align="end"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm sm:text-base">Filter by Genre</h4>
                {selectedGenres.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="rounded-full text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {standardizedGenres.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                      id={genre}
                      checked={selectedGenres.includes(genre)}
                      onCheckedChange={() => toggleGenre(genre)}
                    />
                    <label
                      htmlFor={genre}
                      className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {genre}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {(selectedGenres.length > 0 || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters - Mobile */}
      {selectedGenres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          {selectedGenres.map((genre) => (
            <Badge 
              key={genre} 
              variant="secondary" 
              className="cursor-pointer rounded-full bg-white/10 text-xs hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => toggleGenre(genre)}
            >
              {genre}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
