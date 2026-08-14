import React from 'react';
import { Observation } from '../types';
import { computeMilestones } from '../utils/storage';
import { Award, Sparkles, Trophy, Crown, Compass, Building2, GitFork, Network, MapPin, CheckCircle2 } from 'lucide-react';

interface MilestonesDashboardProps {
  observations: Observation[];
}

export const MilestonesDashboard: React.FC<MilestonesDashboardProps> = ({
  observations
}) => {
  const milestones = computeMilestones(observations);
  const completedCount = milestones.filter(m => m.completed).length;

  const renderIcon = (iconName: string, completed: boolean) => {
    const props = { className: `w-5 h-5 ${completed ? 'text-[#2e4a36]' : 'text-[#828d7e]'}` };
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
      default: return <Award {...props} />;
    }
  };

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-md p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#99582a]" />
          <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">
            Milestones & Achievements
          </h2>
        </div>
        <span className="text-xs font-semibold bg-[#eef3ed] text-[#2e4a36] px-2 py-0.5 rounded border border-[#cfddce]">
          {completedCount} / {milestones.length} Completed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {milestones.map(m => {
          const pct = Math.round((m.progress / m.target) * 100);
          return (
            <div
              key={m.id}
              className={`p-3 rounded-md border transition-all flex flex-col justify-between ${
                m.completed 
                  ? 'bg-[#fafcf9] border-[#cfddce] shadow-2xs' 
                  : 'bg-[#faf9f6] border-[#eee9e0] opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${m.completed ? 'bg-[#eef3ed]' : 'bg-[#f2ede4]'}`}>
                      {renderIcon(m.iconName, m.completed)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[#1f241d]">{m.title}</h3>
                      <span className="text-[10px] uppercase font-mono-tag text-[#828d7e]">{m.category}</span>
                    </div>
                  </div>

                  {m.completed && (
                    <CheckCircle2 className="w-4 h-4 text-[#2e4a36] shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-[#6b7568] leading-relaxed mb-3">
                  {m.subtitle}
                </p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono-tag text-[#6b7568] mb-1">
                  <span>{m.progress} / {m.target}</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#eee9e0] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${m.completed ? 'bg-[#2e4a36]' : 'bg-[#99582a]'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
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
