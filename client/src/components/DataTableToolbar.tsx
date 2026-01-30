import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
}

export interface ActiveFilters {
  search: string;
  [key: string]: any;
}

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  resultCount?: number;
}

export function DataTableToolbar({
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters,
  onFiltersChange,
  resultCount,
}: DataTableToolbarProps) {
  const [localSearch, setLocalSearch] = useState(activeFilters.search || '');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== activeFilters.search) {
        onFiltersChange({ ...activeFilters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, activeFilters, onFiltersChange]);
  
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...activeFilters, [key]: value });
  };
  
  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };
  
  const clearAllFilters = () => {
    setLocalSearch('');
    onFiltersChange({ search: '' });
  };
  
  const activeFilterCount = Object.keys(activeFilters).filter(
    k => k !== 'search' && activeFilters[k] && activeFilters[k] !== 'all'
  ).length;
  
  const hasActiveFilters = activeFilters.search || activeFilterCount > 0;
  
  return (
    <div className="space-y-3" data-testid="data-table-toolbar">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-search"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setLocalSearch('');
                onFiltersChange({ ...activeFilters, search: '' });
              }}
              data-testid="button-clear-search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {filters.map((filter) => (
          <div key={filter.key}>
            {filter.type === 'select' && (
              <Select
                value={activeFilters[filter.key] || 'all'}
                onValueChange={(value) => handleFilterChange(filter.key, value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-[150px]" data-testid={`select-filter-${filter.key}`}>
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {filter.type === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[150px] justify-start text-left font-normal"
                    data-testid={`button-date-filter-${filter.key}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activeFilters[filter.key] 
                      ? format(new Date(activeFilters[filter.key]), 'MMM d, yyyy')
                      : filter.label
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={activeFilters[filter.key] ? new Date(activeFilters[filter.key]) : undefined}
                    onSelect={(date) => handleFilterChange(filter.key, date?.toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        ))}
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-all-filters">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground" data-testid="text-result-count">
            {resultCount !== undefined && `${resultCount} results`}
          </span>
          
          {activeFilters.search && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-search-filter">
              Search: "{activeFilters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setLocalSearch('');
                  onFiltersChange({ ...activeFilters, search: '' });
                }}
              />
            </Badge>
          )}
          
          {filters.map((filter) => {
            const value = activeFilters[filter.key];
            if (!value || value === 'all') return null;
            
            const label = filter.options?.find(o => o.value === value)?.label || value;
            
            return (
              <Badge key={filter.key} variant="secondary" className="gap-1" data-testid={`badge-filter-${filter.key}`}>
                {filter.label}: {label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearFilter(filter.key)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DataTableToolbar;
