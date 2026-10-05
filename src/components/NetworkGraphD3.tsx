import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  EvaluatedPath,
  NetworkEntity,
  GraphEdge,
  PersonEntity,
  OrganizationEntity,
  ROOT_USER_ID,
} from '../types/network';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Building2,
  User,
  Search,
  X,
} from 'lucide-react';

interface NetworkGraphD3Props {
  activePath: EvaluatedPath | null;
  allPaths?: EvaluatedPath[];
  allEntities?: NetworkEntity[];
  allEdges?: GraphEdge[];
  onCalibrateEdge?: (edgeId: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'ROLE' | 'LOCATION' | 'DOMAIN' | 'EVENT';
  entity: NetworkEntity;
  degree?: number;
  isRoot?: boolean;
  isTarget?: boolean;
  isOnActivePath?: boolean;
  roleOrIndustry?: string;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  source: D3Node | string;
  target: D3Node | string;
  edge: GraphEdge;
  status: 'CONFIRMED' | 'INFERRED' | 'POSSIBLE' | 'UNKNOWN';
  strengthScore: number;
  trustScore: number;
  isOnActivePath?: boolean;
  activePathDegree?: number;
}

export const NetworkGraphD3: React.FC<NetworkGraphD3Props> = ({
  activePath,
  allPaths = [],
  allEntities = [],
  allEdges = [],
  onCalibrateEdge,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // UI state
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'path-focused'>('path-focused');
  const [isSimulating, setIsSimulating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CONFIRMED' | 'INFERRED' | 'PATH_ONLY'>('ALL');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'node' | 'edge';
    node?: D3Node;
    link?: D3Link;
  } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{
    type: 'node' | 'edge';
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    extra: string;
    x: number;
    y: number;
  } | null>(null);

  // Construct nodes and links based on active path and network context
  const graphData = useMemo(() => {
    const nodeMap = new Map<string, D3Node>();
    const linkMap = new Map<string, D3Link>();

    const pathNodeIds = new Set<string>();
    const pathEdgeIds = new Set<string>();
    const nodeDegrees = new Map<string, number>();

    if (activePath) {
      pathNodeIds.add(ROOT_USER_ID);
      nodeDegrees.set(ROOT_USER_ID, 0);

      activePath.steps.forEach((step) => {
        pathNodeIds.add(step.fromEntity.id);
        pathNodeIds.add(step.toEntity.id);
        pathEdgeIds.add(step.edge.id);
        nodeDegrees.set(step.toEntity.id, step.degreeStep);
      });
    }

    // Determine target ID
    const targetId = activePath?.targetEntity?.id;

    // Collect candidate entities
    const candidateEntities = new Map<string, NetworkEntity>();

    if (layoutMode === 'path-focused' || filterType === 'PATH_ONLY') {
      // In path-focused mode, include path nodes + their direct 1st-degree neighbors
      if (activePath) {
        activePath.steps.forEach((step) => {
          candidateEntities.set(step.fromEntity.id, step.fromEntity);
          candidateEntities.set(step.toEntity.id, step.toEntity);
        });
      }

      // Add direct neighbors from allEdges if available
      allEdges.forEach((edge) => {
        if (pathNodeIds.has(edge.sourceId) || pathNodeIds.has(edge.targetId)) {
          const src = allEntities.find((e) => e.id === edge.sourceId);
          const tgt = allEntities.find((e) => e.id === edge.targetId);
          if (src) candidateEntities.set(src.id, src);
          if (tgt) candidateEntities.set(tgt.id, tgt);
        }
      });
    } else {
      // Full graph mode
      allEntities.forEach((ent) => candidateEntities.set(ent.id, ent));
      if (activePath) {
        activePath.steps.forEach((step) => {
          candidateEntities.set(step.fromEntity.id, step.fromEntity);
          candidateEntities.set(step.toEntity.id, step.toEntity);
        });
      }
    }

    // Build D3 nodes
    candidateEntities.forEach((entity) => {
      const isRoot = entity.id === ROOT_USER_ID || (entity as PersonEntity).isUserRoot;
      const isTarget = entity.id === targetId;
      const isOnActivePath = pathNodeIds.has(entity.id);
      const degree = nodeDegrees.get(entity.id) ?? (isRoot ? 0 : 3);

      const roleOrIndustry =
        entity.type === 'PERSON'
          ? (entity as PersonEntity).currentRole || (entity as PersonEntity).headline || 'Person'
          : (entity as OrganizationEntity).industry || (entity as OrganizationEntity).domain || 'Organization';

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = entity.name.toLowerCase().includes(query);
        const matchesRole = roleOrIndustry.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !isOnActivePath) {
          return;
        }
      }

      nodeMap.set(entity.id, {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        entity,
        degree,
        isRoot,
        isTarget,
        isOnActivePath,
        roleOrIndustry,
      });
    });

    // Ensure root node exists
    if (!nodeMap.has(ROOT_USER_ID) && activePath?.steps[0]?.fromEntity) {
      const rootEnt = activePath.steps[0].fromEntity;
      nodeMap.set(ROOT_USER_ID, {
        id: ROOT_USER_ID,
        name: rootEnt.name || 'YOU (Root)',
        type: 'PERSON',
        entity: rootEnt,
        degree: 0,
        isRoot: true,
        isTarget: false,
        isOnActivePath: true,
        roleOrIndustry: 'Primary Network Base',
      });
    }

    // Build candidate edges
    const candidateEdges = new Map<string, GraphEdge>();

    // Always include path edges
    if (activePath) {
      activePath.steps.forEach((step) => {
        candidateEdges.set(step.edge.id, step.edge);
      });
    }

    if (filterType !== 'PATH_ONLY') {
      allEdges.forEach((edge) => {
        if (nodeMap.has(edge.sourceId) && nodeMap.has(edge.targetId)) {
          candidateEdges.set(edge.id, edge);
        }
      });
    }

    candidateEdges.forEach((edge) => {
      if (filterType === 'CONFIRMED' && edge.status !== 'CONFIRMED') return;
      if (filterType === 'INFERRED' && edge.status !== 'INFERRED') return;

      if (nodeMap.has(edge.sourceId) && nodeMap.has(edge.targetId)) {
        const isOnActivePath = pathEdgeIds.has(edge.id);
        const step = activePath?.steps.find((s) => s.edge.id === edge.id);

        linkMap.set(edge.id, {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          edge,
          status: edge.status,
          strengthScore: edge.strengthScore,
          trustScore: edge.trustScore,
          isOnActivePath,
          activePathDegree: step?.degreeStep,
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    };
  }, [activePath, allEntities, allEdges, layoutMode, filterType, searchQuery]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean previous render

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Define defs (gradients, glows, arrowheads, patterns)
    const defs = svg.append('defs');

    // Glow filter for active path
    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Marker for directed path arrows
    defs
      .append('marker')
      .attr('id', 'arrow-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#6366F1');

    // Background Container
    const g = svg.append('g').attr('class', 'main-layer');

    // Add subtle background grid
    const gridPattern = defs
      .append('pattern')
      .attr('id', 'd3-grid')
      .attr('width', 32)
      .attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse');

    gridPattern
      .append('circle')
      .attr('cx', 2)
      .attr('cy', 2)
      .attr('r', 1)
      .attr('fill', '#334155')
      .attr('opacity', 0.35);

    g.append('rect')
      .attr('width', width * 3)
      .attr('height', height * 3)
      .attr('x', -width)
      .attr('y', -height)
      .attr('fill', 'url(#d3-grid)')
      .attr('pointer-events', 'none');

    // Concentric Degree Orbit Rings Layer (for radial layout)
    const orbitLayer = g.append('g').attr('class', 'orbit-layer');
    if (layoutMode === 'radial') {
      const radii = [100, 180, 260, 340, 420];
      radii.forEach((r, idx) => {
        orbitLayer
          .append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', '#1E293B')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4');

        orbitLayer
          .append('text')
          .attr('x', width / 2 + r + 6)
          .attr('y', height / 2 - 4)
          .attr('fill', '#475569')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text(`Degree ${idx + 1}`);
      });
    }

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Simulation setup
    const nodes: D3Node[] = graphData.nodes.map((d) => ({ ...d }));
    const links: D3Link[] = graphData.links.map((d) => ({ ...d }));

    // Custom force positioning based on layout mode
    let simulation: d3.Simulation<D3Node, D3Link>;

    if (layoutMode === 'radial') {
      simulation = d3
        .forceSimulation<D3Node, D3Link>(nodes)
        .force(
          'link',
          d3
            .forceLink<D3Node, D3Link>(links)
            .id((d) => d.id)
            .distance((l) => (l.isOnActivePath ? 90 : 130))
            .strength(0.6)
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force(
          'r',
          d3
            .forceRadial<D3Node>(
              (d: D3Node) => (d.isRoot ? 0 : (d.degree || 2) * 85),
              width / 2,
              height / 2
            )
            .strength(0.8)
        )
        .force('collision', d3.forceCollide().radius(35));
    } else if (layoutMode === 'path-focused') {
      // Arrange active path in a clean, undulating horizontal flow
      nodes.forEach((node) => {
        if (node.isRoot) {
          node.fx = width * 0.15;
          node.fy = height * 0.5;
        } else if (node.isTarget) {
          node.fx = width * 0.85;
          node.fy = height * 0.5;
        } else if (node.isOnActivePath && node.degree) {
          const stepFrac = node.degree / ((activePath?.degreeDistance || 3) + 1);
          node.fx = width * (0.15 + stepFrac * 0.7);
          node.fy = height * 0.5 + (node.degree % 2 === 1 ? -40 : 40);
        }
      });

      simulation = d3
        .forceSimulation<D3Node, D3Link>(nodes)
        .force(
          'link',
          d3
            .forceLink<D3Node, D3Link>(links)
            .id((d) => d.id)
            .distance((l) => (l.isOnActivePath ? 110 : 90))
            .strength(0.7)
        )
        .force('charge', d3.forceManyBody().strength(-220))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(35));
    } else {
      // General force-directed
      simulation = d3
        .forceSimulation<D3Node, D3Link>(nodes)
        .force(
          'link',
          d3
            .forceLink<D3Node, D3Link>(links)
            .id((d) => d.id)
            .distance(100)
            .strength(0.4)
        )
        .force('charge', d3.forceManyBody().strength(-260))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(32));
    }

    simulationRef.current = simulation;

    // Link Elements
    const linkGroup = g.append('g').attr('class', 'links-layer');

    const link = linkGroup
      .selectAll<SVGLineElement, D3Link>('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: D3Link) => {
        if (d.isOnActivePath) return '#6366F1';
        if (d.status === 'CONFIRMED') return '#10B981';
        if (d.status === 'INFERRED') return '#F59E0B';
        return '#8B5CF6';
      })
      .attr('stroke-width', (d: D3Link) => (d.isOnActivePath ? 3.5 : Math.max(1.5, d.strengthScore * 3)))
      .attr('stroke-dasharray', (d: D3Link) => {
        if (d.isOnActivePath) return 'none';
        if (d.status === 'INFERRED') return '5 3';
        if (d.status === 'POSSIBLE') return '3 3';
        return 'none';
      })
      .attr('stroke-opacity', (d: D3Link) => (d.isOnActivePath ? 0.95 : 0.45))
      .attr('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: D3Link) => {
        if (!containerRef.current) return;
        const [x, y] = d3.pointer(event, containerRef.current);
        const srcName = typeof d.source === 'object' ? (d.source as D3Node).name : d.source;
        const tgtName = typeof d.target === 'object' ? (d.target as D3Node).name : d.target;

        setHoveredItem({
          type: 'edge',
          title: `${srcName} ➔ ${tgtName}`,
          subtitle: `Relation: ${d.edge.relationshipType.replace('_', ' ')}`,
          badge: `${d.status} (${Math.round(d.strengthScore * 100)}% Strength)`,
          badgeColor:
            d.status === 'CONFIRMED' ? 'text-emerald-400' : d.status === 'INFERRED' ? 'text-amber-400' : 'text-purple-400',
          extra: `Trust: ${Math.round(d.trustScore * 100)}% | Evidence: ${d.edge.evidence.length} logs`,
          x,
          y,
        });
      })
      .on('mouseleave', () => setHoveredItem(null))
      .on('click', (event: MouseEvent, d: D3Link) => {
        event.stopPropagation();
        setSelectedItem({ type: 'edge', link: d });
      });

    // Particle flow animation on active path links
    const activeLinks = links.filter((l) => l.isOnActivePath);
    const particleGroup = g.append('g').attr('class', 'particles-layer');

    const particles = particleGroup
      .selectAll<SVGCircleElement, D3Link>('circle')
      .data(activeLinks)
      .join('circle')
      .attr('r', 3.5)
      .attr('fill', '#A5B4FC')
      .attr('filter', 'url(#glow)');

    // Node Elements
    const nodeGroup = g.append('g').attr('class', 'nodes-layer');

    const dragBehavior = d3
      .drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        if (layoutMode !== 'path-focused') {
          d.fx = null;
          d.fy = null;
        }
      });

    const node = nodeGroup
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(dragBehavior)
      .on('mouseenter', (event: MouseEvent, d: D3Node) => {
        if (!containerRef.current) return;
        const [x, y] = d3.pointer(event, containerRef.current);
        setHoveredItem({
          type: 'node',
          title: d.name,
          subtitle: d.roleOrIndustry || (d.type === 'PERSON' ? 'Person' : 'Organization'),
          badge: d.isRoot ? 'YOU (ROOT)' : d.isTarget ? 'TARGET NODE' : d.type,
          badgeColor: d.isRoot ? 'text-amber-400' : d.isTarget ? 'text-indigo-400' : 'text-slate-300',
          extra: `${d.degree !== undefined ? `Degree: ${d.degree}° separation` : ''} | ${d.isOnActivePath ? '★ Active Path' : 'Surrounding Network'}`,
          x,
          y,
        });
      })
      .on('mouseleave', () => setHoveredItem(null))
      .on('click', (event: MouseEvent, d: D3Node) => {
        event.stopPropagation();
        setSelectedItem({ type: 'node', node: d });
        if (onSelectNode) onSelectNode(d.id);
      });

    // Node outer halos
    node
      .filter((d: D3Node) => !!d.isOnActivePath)
      .append('circle')
      .attr('r', (d: D3Node) => (d.isRoot || d.isTarget ? 24 : 20))
      .attr('fill', 'none')
      .attr('stroke', (d: D3Node) => (d.isRoot ? '#F59E0B' : d.isTarget ? '#6366F1' : '#10B981'))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.75)
      .attr('filter', 'url(#glow)');

    // Node main body
    node.each(function (d: D3Node) {
      const el = d3.select(this);
      const isOrg = d.type === 'ORGANIZATION';
      const size = d.isRoot || d.isTarget ? 38 : 30;

      if (isOrg) {
        // Hexagon / Rounded box for Organization
        el.append('rect')
          .attr('x', -size / 2)
          .attr('y', -size / 2)
          .attr('width', size)
          .attr('height', size)
          .attr('rx', 6)
          .attr('fill', '#0F172A')
          .attr('stroke', d.isOnActivePath ? '#6366F1' : '#334155')
          .attr('stroke-width', d.isOnActivePath ? 2.5 : 1.5);
      } else {
        // Circle for Person
        el.append('circle')
          .attr('r', size / 2)
          .attr('fill', d.isRoot ? '#1E1B4B' : '#0F172A')
          .attr('stroke', d.isRoot ? '#F59E0B' : d.isTarget ? '#6366F1' : d.isOnActivePath ? '#10B981' : '#334155')
          .attr('stroke-width', d.isRoot || d.isTarget || d.isOnActivePath ? 2.5 : 1.5);
      }

      // Center Icon or Text
      if (d.isRoot) {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '4px')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#FBBF24')
          .attr('font-family', 'sans-serif')
          .text('YOU');
      } else if (d.isTarget) {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '3.5px')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('fill', '#A5B4FC')
          .attr('font-family', 'sans-serif')
          .text('AIM');
      } else if (isOrg) {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '3.5px')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('fill', '#94A3B8')
          .attr('font-family', 'sans-serif')
          .text('ORG');
      } else {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '3.5px')
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('fill', '#CBD5E1')
          .attr('font-family', 'sans-serif')
          .text(d.name.slice(0, 2).toUpperCase());
      }

      // Name Label beneath node
      el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', size / 2 + 12)
        .attr('font-size', '10px')
        .attr('font-weight', d.isOnActivePath ? 'bold' : 'normal')
        .attr('fill', d.isOnActivePath ? '#F8FAFC' : '#94A3B8')
        .attr('font-family', 'sans-serif')
        .text(d.name.length > 14 ? `${d.name.slice(0, 13)}…` : d.name);

      // Degree Tag badge for active path
      if (d.isOnActivePath && !d.isRoot) {
        el.append('rect')
          .attr('x', size / 2 - 4)
          .attr('y', -size / 2 - 4)
          .attr('width', 16)
          .attr('height', 14)
          .attr('rx', 3)
          .attr('fill', '#10B981');

        el.append('text')
          .attr('x', size / 2 + 4)
          .attr('y', -size / 2 + 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('font-weight', 'bold')
          .attr('fill', '#064E3B')
          .attr('font-family', 'monospace')
          .text(`${d.degree || 1}°`);
      }
    });

    // Animate flow particles along active links
    let particleOffset = 0;
    const timer = d3.timer(() => {
      particleOffset = (particleOffset + 0.008) % 1;

      particles.each(function (d: D3Link) {
        const src = typeof d.source === 'object' ? (d.source as D3Node) : null;
        const tgt = typeof d.target === 'object' ? (d.target as D3Node) : null;
        if (src && tgt && src.x !== undefined && src.y !== undefined && tgt.x !== undefined && tgt.y !== undefined) {
          const px = src.x + (tgt.x - src.x) * particleOffset;
          const py = src.y + (tgt.y - src.y) * particleOffset;
          d3.select(this).attr('cx', px).attr('cy', py);
        }
      });
    });

    // Simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d: D3Link) => (typeof d.source === 'object' ? (d.source as D3Node).x || 0 : 0))
        .attr('y1', (d: D3Link) => (typeof d.source === 'object' ? (d.source as D3Node).y || 0 : 0))
        .attr('x2', (d: D3Link) => (typeof d.target === 'object' ? (d.target as D3Node).x || 0 : 0))
        .attr('y2', (d: D3Link) => (typeof d.target === 'object' ? (d.target as D3Node).y || 0 : 0));

      node.attr('transform', (d: D3Node) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Deselect on canvas background click
    svg.on('click', () => {
      setSelectedItem(null);
    });

    return () => {
      simulation.stop();
      timer.stop();
    };
  }, [graphData, layoutMode]);

  // Zoom control helper functions
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleToggleSimulation = () => {
    if (!simulationRef.current) return;
    if (isSimulating) {
      simulationRef.current.stop();
      setIsSimulating(false);
    } else {
      simulationRef.current.alpha(0.3).restart();
      setIsSimulating(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] relative overflow-hidden select-none" ref={containerRef}>
      {/* Top Interactive Graph Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-[#1E293B] bg-[#0B0E14]/90 z-20 shrink-0">
        {/* Layout Mode Selector */}
        <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded border border-[#1E293B]">
          <button
            onClick={() => setLayoutMode('path-focused')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
              layoutMode === 'path-focused' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Focus along the active 6-Degree route"
          >
            6° Path Flow
          </button>
          <button
            onClick={() => setLayoutMode('radial')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
              layoutMode === 'radial' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Concentric Degree Orbit View"
          >
            Degree Orbits
          </button>
          <button
            onClick={() => setLayoutMode('force')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
              layoutMode === 'force' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Full Force-Directed Constellation"
          >
            Constellation
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded border border-[#1E293B]">
          <span className="text-[9px] font-mono text-slate-500 px-1.5 uppercase">Links:</span>
          {(['ALL', 'CONFIRMED', 'INFERRED', 'PATH_ONLY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterType(mode)}
              className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors cursor-pointer ${
                filterType === mode
                  ? 'bg-[#1E293B] text-indigo-400 font-bold border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Search Input & Zoom Tools */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] rounded pl-6 pr-2 py-1 text-[11px] text-white placeholder:text-slate-500 w-36 sm:w-44 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-0.5 bg-[#0F172A] border border-[#1E293B] rounded p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleSimulation}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              title={isSimulating ? 'Pause physics simulation' : 'Resume physics'}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Canvas */}
      <div className="flex-1 w-full h-full relative">
        <svg ref={svgRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Hover Tooltip Overlay */}
        {hoveredItem && (
          <div
            className="absolute z-30 pointer-events-none p-2.5 rounded-lg bg-[#0B0E14]/95 border border-[#334155] shadow-2xl text-xs backdrop-blur-sm max-w-xs transition-transform duration-75"
            style={{
              left: Math.min(hoveredItem.x + 15, (containerRef.current?.clientWidth || 600) - 220),
              top: Math.max(10, hoveredItem.y - 45),
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${hoveredItem.badgeColor}`}>
                {hoveredItem.badge}
              </span>
              <span className="text-[8px] font-mono text-slate-500">D3 GRAPH</span>
            </div>
            <div className="text-white font-bold text-xs truncate">{hoveredItem.title}</div>
            <div className="text-slate-400 text-[11px] truncate">{hoveredItem.subtitle}</div>
            <div className="mt-1 pt-1 border-t border-[#1E293B] text-[10px] font-mono text-slate-400">
              {hoveredItem.extra}
            </div>
          </div>
        )}

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-3 bg-[#0B0E14]/90 border border-[#1E293B] px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400 backdrop-blur-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E1B4B] border border-amber-400"></span>
            <span className="text-amber-300">You (0°)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A] border border-emerald-400"></span>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A] border border-amber-400"></span>
            <span>Inferred</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0F172A] border border-indigo-400"></span>
            <span>Org</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] bg-indigo-500"></span>
            <span className="text-indigo-400 font-bold">Active Path</span>
          </div>
        </div>

        {/* Selected Entity / Edge Deep Inspection Drawer */}
        {selectedItem && (
          <div className="absolute top-3 right-3 bottom-3 w-72 sm:w-80 bg-[#0B0E14]/95 border border-[#1E293B] rounded-xl shadow-2xl p-4 flex flex-col z-30 backdrop-blur-md overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Inspection Detail</span>
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedItem.type === 'node' && selectedItem.node && (
              <div className="space-y-3.5 flex-1 flex flex-col">
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#334155] flex items-center justify-center text-white shrink-0">
                    {selectedItem.node.type === 'ORGANIZATION' ? (
                      <Building2 className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <User className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {selectedItem.node.name}
                    </h4>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {selectedItem.node.roleOrIndustry}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">Node Type</span>
                    <span className="font-mono text-white font-bold">{selectedItem.node.type}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">Separation</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {selectedItem.node.degree !== undefined ? `${selectedItem.node.degree}° Degree` : 'Graph Node'}
                    </span>
                  </div>
                </div>

                {selectedItem.node.entity.type === 'PERSON' && (
                  <div className="space-y-2 text-xs">
                    {(selectedItem.node.entity as PersonEntity).skills && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Key Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {(selectedItem.node.entity as PersonEntity).skills?.map((sk, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-[#1E293B] text-slate-300 text-[10px] font-mono">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedItem.node.entity as PersonEntity).identifiers?.linkedInHandle && (
                      <div className="p-2 rounded bg-[#0F172A] border border-[#1E293B] text-[11px] text-slate-400 font-mono">
                        <span className="text-slate-500 block text-[9px]">LINKEDIN HANDLE</span>
                        {(selectedItem.node.entity as PersonEntity).identifiers.linkedInHandle}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-[#1E293B]">
                  <div className="text-[10px] text-slate-500 font-mono">
                    Provenance: Indexed in Graph Engine
                  </div>
                </div>
              </div>
            )}

            {selectedItem.type === 'edge' && selectedItem.link && (
              <div className="space-y-3.5 flex-1 flex flex-col">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Relationship Edge</span>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {selectedItem.link.edge.relationshipType.replace('_', ' ')}
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-slate-400">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        selectedItem.link.status === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {selectedItem.link.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-slate-400">Connection Strength</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {Math.round(selectedItem.link.strengthScore * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-slate-400">Ask / Trust Comfort</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {Math.round(selectedItem.link.trustScore * 100)}%
                    </span>
                  </div>
                </div>

                {selectedItem.link.edge.evidence && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Evidence Provenance</span>
                    {selectedItem.link.edge.evidence.map((ev, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#1E293B]/60 border border-[#334155]/60 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-mono text-[9px] text-indigo-300 font-bold">
                          <span>{ev.sourceType}</span>
                          <span>{Math.round(ev.confidenceWeight * 100)}% conf</span>
                        </div>
                        {ev.rawSnippet && <p className="text-slate-400 italic text-[10px]">{ev.rawSnippet}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-[#1E293B]">
                  <button
                    onClick={() => {
                      if (onCalibrateEdge && selectedItem.link) {
                        onCalibrateEdge(selectedItem.link.edge.id);
                      }
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Calibrate This Edge</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
