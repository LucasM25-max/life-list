import React, { useState, useMemo } from 'react';
import { Observation } from '../types';
import { ChevronRight, ChevronDown, Network, ExternalLink, Sparkles, Building, Trees } from 'lucide-react';

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
      <div className="bg-white border border-[#e6dfd3] rounded-md p-12 text-center shadow-xs">
        <Network className="w-8 h-8 text-[#828d7e] mx-auto mb-2 opacity-60" />
        <h3 className="text-sm font-semibold text-[#1f241d] font-serif-species">No Phylogenetic Records</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1">
          Your taxonomic tree will automatically populate with Kingdoms, Classes, Orders, and Families as you log species.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-md p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#2e4a36]" />
          <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">Taxonomic Tree</h2>
          <span className="text-[11px] text-[#6b7568] font-mono-tag">
            ({tree.size} Classes)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={expandAll}
            className="px-2 py-0.5 text-[#576054] hover:bg-[#f2ede4] rounded text-[11px]"
          >
            Expand All
          </button>
          <span className="text-[#d8d0c4]">|</span>
          <button
            onClick={collapseAll}
            className="px-2 py-0.5 text-[#576054] hover:bg-[#f2ede4] rounded text-[11px]"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="space-y-1.5 font-mono-tag text-xs">
        {Array.from(tree.entries()).map(([className, classNode]) => {
          const classOpen = expandedNodes.has(className);
          return (
            <div key={className} className="border border-[#eee9e0] rounded-sm bg-[#faf9f6] overflow-hidden">
              {/* Class header */}
              <div
                onClick={() => toggleNode(className)}
                className="flex items-center justify-between px-3 py-2 bg-[#f2ede4] hover:bg-[#ece5d9] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {classOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#576054]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#576054]" />}
                  <span className="font-bold text-[#1f241d] tracking-wide">
                    CLASS {className}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#576054]">
                  <span className="bg-white px-2 py-0.2 rounded border border-[#d8d0c4] font-semibold text-[#2e4a36]">
                    {classNode.speciesCount} species
                  </span>
                  <span>({classNode.count} logs)</span>
                </div>
              </div>

              {/* Order level */}
              {classOpen && (
                <div className="p-2 space-y-1 pl-4 bg-white">
                  {Array.from(classNode.children.entries()).map(([orderName, orderNode]) => {
                    const orderPath = `${className}/${orderName}`;
                    const orderOpen = expandedNodes.has(orderPath);
                    return (
                      <div key={orderName} className="border-l-2 border-[#d8d0c4] pl-2.5 py-1">
                        <div
                          onClick={() => toggleNode(orderPath)}
                          className="flex items-center justify-between hover:bg-[#f9f8f5] p-1 rounded cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            {orderOpen ? <ChevronDown className="w-3 h-3 text-[#828d7e]" /> : <ChevronRight className="w-3 h-3 text-[#828d7e]" />}
                            <span className="font-semibold text-[#2e4a36]">Order {orderName}</span>
                          </div>
                          <span className="text-[11px] text-[#828d7e]">
                            {orderNode.speciesCount} species ({orderNode.children.size} families)
                          </span>
                        </div>

                        {/* Family level */}
                        {orderOpen && (
                          <div className="pl-4 space-y-1 mt-1">
                            {Array.from(orderNode.children.entries()).map(([famName, famNode]) => {
                              const famPath = `${orderPath}/${famName}`;
                              const famOpen = expandedNodes.has(famPath);
                              return (
                                <div key={famName} className="border-l border-[#e6dfd3] pl-2 py-0.5">
                                  <div
                                    onClick={() => toggleNode(famPath)}
                                    className="flex items-center justify-between hover:bg-[#f9f8f5] p-1 rounded cursor-pointer text-[11px]"
                                  >
                                    <div className="flex items-center gap-1">
                                      {famOpen ? <ChevronDown className="w-2.5 h-2.5 text-[#828d7e]" /> : <ChevronRight className="w-2.5 h-2.5 text-[#828d7e]" />}
                                      <span className="font-medium text-[#1f241d]">Family {famName}</span>
                                    </div>
                                    <span className="text-[#828d7e]">
                                      {famNode.speciesCount} spp
                                    </span>
                                  </div>

                                  {/* Genus / Species level */}
                                  {famOpen && (
                                    <div className="pl-3.5 space-y-1 mt-1">
                                      {Array.from(famNode.children.entries()).map(([genName, genNode]) => (
                                        <div key={genName} className="bg-[#fcfbf9] p-1.5 rounded border border-[#f0eae0]">
                                          <div className="text-[11px] font-bold text-[#576054] mb-1 font-serif-species italic">
                                            Genus {genName}
                                          </div>
                                          <div className="space-y-1">
                                            {Array.from(genNode.children.entries()).map(([spName, spNode]) => {
                                              const representativeObs = spNode.observations[0];
                                              const isWild = representativeObs?.wildStatus === 'wild';
                                              return (
                                                <div
                                                  key={spName}
                                                  onClick={() => onSelectObservation(representativeObs)}
                                                  className="flex items-center justify-between p-1 hover:bg-[#eef3ed] rounded cursor-pointer group text-xs"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-serif-species italic font-medium text-[#1f241d]">
                                                      {spName}
                                                    </span>
                                                    <span className="text-[#6b7568] text-[11px]">
                                                      ({representativeObs?.vernacularName || 'Species'})
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 text-[10px]">
                                                    <span className={`px-1.5 py-0.2 rounded ${
                                                      isWild ? 'bg-[#eef3ed] text-[#2e4a36]' : 'bg-[#faf0e6] text-[#99582a]'
                                                    }`}>
                                                      {isWild ? 'Wild' : 'Zoo'}
                                                    </span>
                                                    <span className="text-[#828d7e]">
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
