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
  Check
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
    { id: 'all', label: 'All', count: milestones.length },
    { id: 'count', label: 'Totals', count: milestones.filter(m => m.category === 'count').length },
    { id: 'diversity', label: 'Wild', count: milestones.filter(m => m.category === 'diversity').length },
    { id: 'venue', label: 'Collections', count: milestones.filter(m => m.category === 'venue').length },
    { id: 'clade', label: 'Taxonomy', count: milestones.filter(m => m.category === 'clade').length },
    { id: 'guilds', label: 'Specialist', count: milestones.filter(m => m.category === 'guilds').length },
    { id: 'fieldcraft', label: 'Field Craft', count: milestones.filter(m => m.category === 'fieldcraft').length }
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

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Master Progress Tracker */}
      <div className="border-b border-[#f0eae0] pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#2e4a36] flex items-center justify-center border border-[#ded6c9] shadow-2xs">
              <Trophy className="w-5 h-5 text-[#99582a]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1f241d] font-serif-species leading-tight">
                Naturalist Milestones
              </h2>
              <p className="text-xs text-[#6b7568]">
                {milestones.length} achievements tracking lifetime diversity, wild expeditions, and taxonomy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#eef3ed] text-[#2e4a36] px-3 py-1.5 rounded-xl border border-[#cfddce] flex items-center gap-2 shadow-2xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs font-mono-tag">
                {completedCount} / {milestones.length} Unlocked ({overallPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-[#f0eae0] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-linear-to-r from-[#2e4a36] to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Category Pills & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#f4efe6] rounded-xl border border-[#ded6c9]">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                  : 'text-[#6b7568] hover:text-[#1f241d]'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] ml-1 opacity-70 font-mono">({cat.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Status */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#828d7e]" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#fdfbf7] border border-[#d8d0c4] rounded-xl pl-8 pr-2.5 py-1 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
            />
          </div>

          <div className="flex items-center bg-[#f4efe6] p-1 rounded-xl border border-[#ded6c9]">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-white text-[#1f241d] shadow-2xs'
                  : 'text-[#6b7568] hover:text-[#1f241d]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('completed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                selectedStatus === 'completed'
                  ? 'bg-white text-[#2e4a36] shadow-2xs'
                  : 'text-[#6b7568] hover:text-[#1f241d]'
              }`}
            >
              Unlocked
            </button>
            <button
              onClick={() => setSelectedStatus('in_progress')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                selectedStatus === 'in_progress'
                  ? 'bg-white text-[#99582a] shadow-2xs'
                  : 'text-[#6b7568] hover:text-[#1f241d]'
              }`}
            >
              In Progress
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Milestone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMilestones.map(m => {
          const isDone = m.completed;
          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-[#f7faf7] border-[#2e4a36]/30 shadow-2xs'
                  : 'bg-[#faf8f4] border-[#e6dfd3] opacity-90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isDone
                        ? 'bg-[#eef3ed] border-[#cfddce] text-[#2e4a36]'
                        : 'bg-white border-[#ded6c9] text-[#828d7e]'
                    }`}>
                      {renderIcon(m.icon, isDone)}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#1f241d] font-serif-species leading-tight">
                        {m.title}
                      </h4>
                      <p className="text-[11px] text-[#6b7568] mt-0.5 line-clamp-2">
                        {m.subtitle}
                      </p>
                    </div>
                  </div>

                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-[#2e4a36] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono-tag font-bold text-[#828d7e] shrink-0 bg-white px-2 py-0.5 rounded-full border border-[#ded6c9]">
                      {m.currentValue}/{m.targetValue}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar inside Card */}
              <div className="mt-2 pt-2 border-t border-[#eee7db]">
                <div className="flex items-center justify-between text-[10px] text-[#828d7e] mb-1 font-mono-tag">
                  <span>{isDone ? 'COMPLETED' : `${Math.round(m.progress * 100)}% COMPLETE`}</span>
                  <span>{m.currentValue} / {m.targetValue}</span>
                </div>
                <div className="w-full bg-[#e8e2d5] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDone ? 'bg-[#2e4a36]' : 'bg-[#99582a]'
                    }`}
                    style={{ width: `${Math.min(100, Math.round(m.progress * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
