import React, { useState, useMemo } from 'react';
import { Observation, Milestone } from '../types';
import { computeMilestones } from '../utils/storage';
import { 
  Award, 
  Sparkles, 
  Trophy, 
  Crown, 
  Compass, 
  Building2, 
  GitFork, 
  Network, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  Navigation, 
  Bird, 
  Fish, 
  Bug, 
  ShieldCheck, 
  BookOpen, 
  Heart, 
  Trees, 
  Globe, 
  Layers, 
  Flame, 
  Target, 
  Feather, 
  Scan, 
  Tag, 
  Search,
  Filter
} from 'lucide-react';

interface MilestonesDashboardProps {
  observations: Observation[];
}

type CategoryFilter = 'all' | 'count' | 'diversity' | 'venue' | 'clade' | 'guilds' | 'fieldcraft';
type StatusFilter = 'all' | 'completed' | 'in_progress' | 'unstarted';

export const MilestonesDashboard: React.FC<MilestonesDashboardProps> = ({
  observations
}) => {
  const milestones = useMemo(() => computeMilestones(observations), [observations]);
  
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const completedCount = useMemo(() => milestones.filter(m => m.completed).length, [milestones]);
  const overallPercentage = Math.round((completedCount / (milestones.length || 1)) * 100);

  const categories: { id: CategoryFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Milestones', count: milestones.length },
    { id: 'count', label: 'Scale & Totals', count: milestones.filter(m => m.category === 'count').length },
    { id: 'diversity', label: 'Wild & Reserves', count: milestones.filter(m => m.category === 'diversity').length },
    { id: 'venue', label: 'Living Collections', count: milestones.filter(m => m.category === 'venue').length },
    { id: 'clade', label: 'Taxonomic Clades', count: milestones.filter(m => m.category === 'clade').length },
    { id: 'guilds', label: 'Specialist Guilds', count: milestones.filter(m => m.category === 'guilds').length },
    { id: 'fieldcraft', label: 'Field Craft & Media', count: milestones.filter(m => m.category === 'fieldcraft').length }
  ];

  const filteredMilestones = useMemo(() => {
    return milestones.filter(m => {
      // Category filter
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'completed' && !m.completed) return false;
      if (selectedStatus === 'in_progress' && (m.completed || m.progress === 0)) return false;
      if (selectedStatus === 'unstarted' && m.progress > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchSub = m.subtitle.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchCat) return false;
      }

      return true;
    });
  }, [milestones, selectedCategory, selectedStatus, searchQuery]);

  const renderIcon = (iconName: string, completed: boolean) => {
    const props = { className: `w-4 h-4 ${completed ? 'text-[#2e4a36]' : 'text-[#828d7e]'}` };
    switch (iconName) {
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Award': return <Award {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Building2': return <Building2 {...props} />;
      case 'GitFork': return <GitFork {...props} />;
      case 'Network': return <Network {...props} />;
      case 'MapPin': return <MapPin {...props} />;
      case 'Camera': return <Camera {...props} />;
      case 'Navigation': return <Navigation {...props} />;
      case 'Bird': return <Bird {...props} />;
      case 'Fish': return <Fish {...props} />;
      case 'Bug': return <Bug {...props} />;
      case 'ShieldCheck': return <ShieldCheck {...props} />;
      case 'BookOpen': return <BookOpen {...props} />;
      case 'Heart': return <Heart {...props} />;
      case 'Trees': return <Trees {...props} />;
      case 'Globe': return <Globe {...props} />;
      case 'Layers': return <Layers {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Feather': return <Feather {...props} />;
      case 'Scan': return <Scan {...props} />;
      case 'Tag': return <Tag {...props} />;
      default: return <Award {...props} />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'count': return { label: 'Scale', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'diversity': return { label: 'Wild', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'venue': return { label: 'Collections', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'clade': return { label: 'Clade', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'guilds': return { label: 'Guild', color: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'fieldcraft': return { label: 'Field Craft', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      default: return { label: category, color: 'bg-stone-50 text-stone-700 border-stone-200' };
    }
  };

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Master Progress Tracker */}
      <div className="border-b border-[#f0eae0] pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2e4a36]/10 text-[#2e4a36] flex items-center justify-center border border-[#2e4a36]/20">
              <Trophy className="w-4 h-4 text-[#99582a]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1f241d] font-serif-species tracking-wide">
                Naturalist Milestones & Badges
              </h2>
              <p className="text-[11px] text-[#6b7568]">
                {milestones.length} achievements tracking lifetime diversity, wild expeditions, taxonomy, and field craft
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#eef3ed] text-[#2e4a36] px-3 py-1 rounded-lg border border-[#cfddce] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold text-xs font-mono-tag">
                {completedCount} of {milestones.length} Completed ({overallPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="w-full bg-[#f4efe6] h-2 rounded-full overflow-hidden border border-[#ded6c9]/60">
          <div 
            className="h-full bg-linear-to-r from-[#2e4a36] via-[#3b5e45] to-[#99582a] transition-all duration-700"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-[#2e4a36] text-white shadow-xs'
                    : 'bg-[#faf9f6] text-[#576054] hover:bg-[#eee9e0] border border-[#e6dfd3]'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-tag ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#e8e2d7] text-[#576054]'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Quick Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs pt-1">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#828d7e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search milestones..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#faf9f6] border border-[#d8d0c4] rounded-lg text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36] focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#828d7e] flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {(['all', 'completed', 'in_progress', 'unstarted'] as StatusFilter[]).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-[#2e4a36]/15 text-[#2e4a36] font-bold border border-[#2e4a36]/30'
                    : 'text-[#6b7568] hover:text-[#1f241d] hover:bg-[#f4efe6]'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
        {filteredMilestones.map(m => {
          const pct = Math.round((m.progress / m.target) * 100);
          const badge = getCategoryBadge(m.category);

          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                m.completed 
                  ? 'bg-[#fafcf9] border-[#b8dabf] shadow-2xs ring-1 ring-[#2e4a36]/10' 
                  : m.progress > 0
                    ? 'bg-[#fcfbf9] border-[#e6dfd3] hover:border-[#cfc6b8]'
                    : 'bg-[#faf9f6] border-[#eee9e0] opacity-75 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      m.completed 
                        ? 'bg-[#eef3ed] border-[#c2ddc8]' 
                        : m.progress > 0
                          ? 'bg-[#f5ede2] border-[#e4d6c4]'
                          : 'bg-[#f2ede4] border-[#e6dfd3]'
                    }`}>
                      {renderIcon(m.iconName, m.completed)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-[#1f241d] font-serif-species truncate">
                        {m.title}
                      </h3>
                      <span className={`text-[9px] uppercase font-mono-tag px-1.5 py-0.2 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {m.completed && (
                    <span className="flex items-center gap-1 bg-[#2e4a36] text-white text-[10px] font-mono-tag font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      Done
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#576054] leading-relaxed mb-3">
                  {m.subtitle}
                </p>
              </div>

              {/* Progress bar and metrics */}
              <div className="pt-2 border-t border-[#f0eae0]">
                <div className="flex items-center justify-between text-[10px] font-mono-tag text-[#6b7568] mb-1">
                  <span className="font-semibold">
                    {m.progress} / {m.target} {m.completed ? 'reached' : `(${m.target - m.progress} left)`}
                  </span>
                  <span className={`font-bold ${m.completed ? 'text-[#2e4a36]' : 'text-[#99582a]'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#eee9e0] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      m.completed 
                        ? 'bg-[#2e4a36]' 
                        : m.progress > 0
                          ? 'bg-[#99582a]'
                          : 'bg-transparent'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMilestones.length === 0 && (
        <div className="p-8 text-center bg-[#faf9f6] rounded-xl border border-dashed border-[#d8d0c4] space-y-2">
          <Trophy className="w-8 h-8 text-[#a99e8d] mx-auto" />
          <p className="text-xs font-semibold text-[#576054]">
            No milestones match your current filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            className="text-xs text-[#2e4a36] font-bold underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
