import React, { useState, useMemo } from 'react';
import { Observation } from '../types';
import { ChevronRight, ChevronDown, Network, ExternalLink, Sparkles, Building, Trees } from 'lucide-react';
import { SpeciesImage } from './SpeciesImage';

interface TaxonomyTreeViewProps {
  observations: Observation[];
  onSelectObservation: (obs: Observation) => void;
  onViewTaxon: (scientificName: string) => void;
}

interface TreeNode {
  name: string;
  rank: 'class' | 'order' | 'family' | 'genus' | 'species';
  count: number;
  speciesCount: number;
  children: Map<string, TreeNode>;
  observations: Observation[];
}

export const TaxonomyTreeView: React.FC<TaxonomyTreeViewProps> = ({
  observations,
  onSelectObservation,
  onViewTaxon
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Mammalia', 'Aves', 'Reptilia']));

  const tree = useMemo(() => {
    const root = new Map<string, TreeNode>();

    for (const obs of observations) {
      const cls = obs.taxonomy?.class || 'Unclassified Class';
      const ord = obs.taxonomy?.order || 'Unclassified Order';
      const fam = obs.taxonomy?.family || 'Unclassified Family';
      const gen = obs.taxonomy?.genus || obs.scientificName.split(' ')[0] || 'Unknown Genus';
      const sp = obs.scientificName;

      // Class level
      if (!root.has(cls)) {
        root.set(cls, {
          name: cls,
          rank: 'class',
          count: 0,
          speciesCount: 0,
          children: new Map(),
          observations: []
        });
      }
      const classNode = root.get(cls)!;
      classNode.count += 1;

      // Order level
      if (!classNode.children.has(ord)) {
        classNode.children.set(ord, {
          name: ord,
          rank: 'order',
          count: 0,
          speciesCount: 0,
          children: new Map(),
          observations: []
        });
      }
      const orderNode = classNode.children.get(ord)!;
      orderNode.count += 1;

      // Family level
      if (!orderNode.children.has(fam)) {
        orderNode.children.set(fam, {
          name: fam,
          rank: 'family',
          count: 0,
          speciesCount: 0,
          children: new Map(),
          observations: []
        });
      }
      const familyNode = orderNode.children.get(fam)!;
      familyNode.count += 1;

      // Genus level
      if (!familyNode.children.has(gen)) {
        familyNode.children.set(gen, {
          name: gen,
          rank: 'genus',
          count: 0,
          speciesCount: 0,
          children: new Map(),
          observations: []
        });
      }
      const genusNode = familyNode.children.get(gen)!;
      genusNode.count += 1;

      // Species level
      if (!genusNode.children.has(sp)) {
        genusNode.children.set(sp, {
          name: sp,
          rank: 'species',
          count: 0,
          speciesCount: 1,
          children: new Map(),
          observations: []
        });
      }
      const speciesNode = genusNode.children.get(sp)!;
      speciesNode.count += 1;
      speciesNode.observations.push(obs);
    }

    // Compute distinct species counts bottom up
    for (const classNode of root.values()) {
      let classSpecies = 0;
      for (const orderNode of classNode.children.values()) {
        let orderSpecies = 0;
        for (const familyNode of orderNode.children.values()) {
          let familySpecies = 0;
          for (const genusNode of familyNode.children.values()) {
            genusNode.speciesCount = genusNode.children.size;
            familySpecies += genusNode.speciesCount;
          }
          familyNode.speciesCount = familySpecies;
          orderSpecies += familySpecies;
        }
        orderNode.speciesCount = orderSpecies;
        classSpecies += orderSpecies;
      }
      classNode.speciesCount = classSpecies;
    }

    return root;
  }, [observations]);

  const toggleNode = (nodePath: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodePath)) {
        next.delete(nodePath);
      } else {
        next.add(nodePath);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    for (const [cName, cNode] of tree) {
      all.add(cName);
      for (const [oName, oNode] of cNode.children) {
        all.add(`${cName}/${oName}`);
        for (const [fName, fNode] of oNode.children) {
          all.add(`${cName}/${oName}/${fName}`);
          for (const [gName] of fNode.children) {
            all.add(`${cName}/${oName}/${fName}/${gName}`);
          }
        }
      }
    }
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (observations.length === 0) {
    return (
      <div className="bg-white border border-[#e6dfd3] rounded-2xl p-12 text-center shadow-xs">
        <Network className="w-10 h-10 text-[#828d7e] mx-auto mb-2 opacity-60" />
        <h3 className="text-base font-bold text-[#1f241d] font-serif-species">No Phylogenetic Records</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1">
          Your taxonomic tree will automatically populate with Kingdoms, Classes, Orders, and Families as you log species.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#f0eae0] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#eef3ed] flex items-center justify-center text-[#2e4a36]">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1f241d] font-serif-species leading-tight">
              Phylogenetic Tree of Life
            </h2>
            <span className="text-[11px] text-[#6b7568] font-mono-tag">
              {tree.size} Taxonomic Classes Documented
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={expandAll}
            className="px-2.5 py-1 text-[#576054] hover:bg-[#f4efe6] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Expand All
          </button>
          <span className="text-[#d8d0c4]">|</span>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1 text-[#576054] hover:bg-[#f4efe6] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div className="space-y-2 text-xs">
        {Array.from(tree.entries()).map(([className, classNode]) => {
          const classOpen = expandedNodes.has(className);
          return (
            <div key={className} className="border border-[#e6dfd3] rounded-xl bg-[#fdfbf7] overflow-hidden shadow-2xs">
              {/* Class header */}
              <div
                onClick={() => toggleNode(className)}
                className="flex items-center justify-between px-3.5 py-2.5 bg-[#f5f1e8] hover:bg-[#ede6d8] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  {classOpen ? <ChevronDown className="w-4 h-4 text-[#2e4a36]" /> : <ChevronRight className="w-4 h-4 text-[#828d7e]" />}
                  <span className="font-bold text-[#1f241d] tracking-wide text-xs sm:text-sm font-serif-species">
                    Class {className}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#576054]">
                  <span className="bg-white px-2.5 py-0.5 rounded-full border border-[#d8d0c4] font-bold text-[#2e4a36] font-mono shadow-2xs">
                    {classNode.speciesCount} species
                  </span>
                  <span className="text-[#828d7e]">({classNode.count} logs)</span>
                </div>
              </div>

              {/* Order level */}
              {classOpen && (
                <div className="p-3 space-y-2 pl-4 sm:pl-6 bg-white">
                  {Array.from(classNode.children.entries()).map(([orderName, orderNode]) => {
                    const orderPath = `${className}/${orderName}`;
                    const orderOpen = expandedNodes.has(orderPath);
                    return (
                      <div key={orderName} className="border-l-2 border-[#cfddce] pl-3 py-1">
                        <div
                          onClick={() => toggleNode(orderPath)}
                          className="flex items-center justify-between hover:bg-[#faf8f4] p-1.5 rounded-lg cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {orderOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#2e4a36]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#828d7e]" />}
                            <span className="font-bold text-[#2e4a36] text-xs">Order {orderName}</span>
                          </div>
                          <span className="text-[11px] text-[#828d7e] font-mono-tag">
                            {orderNode.speciesCount} spp ({orderNode.children.size} families)
                          </span>
                        </div>

                        {/* Family level */}
                        {orderOpen && (
                          <div className="pl-4 space-y-1.5 mt-1.5">
                            {Array.from(orderNode.children.entries()).map(([famName, famNode]) => {
                              const famPath = `${orderPath}/${famName}`;
                              const famOpen = expandedNodes.has(famPath);
                              return (
                                <div key={famName} className="border-l border-[#e2dacd] pl-2.5 py-1">
                                  <div
                                    onClick={() => toggleNode(famPath)}
                                    className="flex items-center justify-between hover:bg-[#faf8f4] p-1.5 rounded-lg cursor-pointer text-xs select-none transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {famOpen ? <ChevronDown className="w-3 h-3 text-[#576054]" /> : <ChevronRight className="w-3 h-3 text-[#828d7e]" />}
                                      <span className="font-semibold text-[#1f241d]">Family {famName}</span>
                                    </div>
                                    <span className="text-[#828d7e] text-[11px] font-mono-tag">
                                      {famNode.speciesCount} spp
                                    </span>
                                  </div>

                                  {/* Genus / Species level */}
                                  {famOpen && (
                                    <div className="pl-4 space-y-1.5 mt-1.5">
                                      {Array.from(famNode.children.entries()).map(([genName, genNode]) => (
                                        <div key={genName} className="bg-[#faf8f4] p-2.5 rounded-xl border border-[#e8e2d5]">
                                          <div className="text-xs font-bold text-[#576054] mb-1.5 font-serif-species italic flex items-center gap-1">
                                            <span>Genus {genName}</span>
                                          </div>
                                          <div className="space-y-1">
                                            {Array.from(genNode.children.entries()).map(([spName, spNode]) => {
                                              const representativeObs = spNode.observations[0];
                                              const isWild = representativeObs?.wildStatus === 'wild';
                                              return (
                                                <div
                                                  key={spName}
                                                  onClick={() => onSelectObservation(representativeObs)}
                                                  className="flex items-center justify-between p-1.5 hover:bg-[#eef3ed] rounded-lg cursor-pointer group text-xs transition-colors"
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <SpeciesImage
                                                      scientificName={spName}
                                                      commonName={representativeObs?.vernacularName}
                                                      fallbackPhotoUrl={representativeObs?.photoUrl}
                                                      observations={observations}
                                                      className="w-7 h-7 rounded-md object-cover border border-[#d8d0c4] shrink-0"
                                                    />
                                                    <span className="font-serif-species italic font-semibold text-[#1f241d] group-hover:text-[#2e4a36] truncate">
                                                      {spName}
                                                    </span>
                                                    <span className="text-[#6b7568] text-[11px] truncate">
                                                      ({representativeObs?.vernacularName || 'Species'})
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-2 text-[10px] shrink-0">
                                                    <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                                                      isWild 
                                                        ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]' 
                                                        : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                                                    }`}>
                                                      {isWild ? 'Wild' : 'Captive'}
                                                    </span>
                                                    <span className="text-[#828d7e] font-mono-tag">
                                                      {spNode.count} log{spNode.count > 1 ? 's' : ''}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
