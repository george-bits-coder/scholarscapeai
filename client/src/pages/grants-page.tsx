import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import type { Grant } from "@shared/schema";

export default function GrantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  // Fetch all grants
  const { data: grants = [], isLoading } = useQuery<Grant[]>({
    queryKey: ["/api/grants"],
  });

  const filteredGrants = grants.filter(grant => {
    const matchesSearch = grant.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !regionFilter || grant.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const uniqueRegions = Array.from(new Set(grants.map(g => g.region).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Grants & Funding</h1>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search grants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region || ""}>
                    {region || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grants List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading grants...</p>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No grants found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGrants.map(grant => (
              <Card key={grant.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{grant.title}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {grant.region && (
                          <Badge variant="outline">{grant.region}</Badge>
                        )}
                        {grant.tags?.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    {grant.amount && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${grant.amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {grant.deadline && (
                      <div>
                        <p className="text-sm text-gray-600">Deadline</p>
                        <p className="font-semibold">
                          {new Date(grant.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {grant.url && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(grant.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Grant
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
