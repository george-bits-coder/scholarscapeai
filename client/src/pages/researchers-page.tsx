import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/header";
import ResearcherCard from "@/components/researcher-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { User } from "@shared/schema";

export default function ResearchersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Fetch all researchers
  const { data: researchers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/researchers"],
  });

  const filteredResearchers = researchers.filter(researcher => {
    const matchesSearch = researcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         researcher.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         researcher.affiliation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || researcher.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Researchers</h1>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search researchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="researcher">Researcher</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Researchers Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading researchers...</p>
          </div>
        ) : filteredResearchers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No researchers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResearchers.map(researcher => (
              <Link key={researcher.id} href={`/researchers/${researcher.id}`}>
                <a>
                  <ResearcherCard researcher={researcher} />
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
