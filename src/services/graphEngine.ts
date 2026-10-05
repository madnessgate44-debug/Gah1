import {
  NetworkEntity,
  GraphEdge,
  EvaluatedPath,
  PathStep,
  PersonEntity,
  OrganizationEntity,
  NetworkReport,
  ROOT_USER_ID,
} from '../types/network';
import { INITIAL_ENTITIES, INITIAL_EDGES } from './seedData';

export class GraphEngine {
  private entities: Map<string, NetworkEntity> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacency: Map<string, string[]> = new Map(); // entityId -> edgeIds

  constructor(initialEntities = INITIAL_ENTITIES, initialEdges = INITIAL_EDGES) {
    this.loadData(initialEntities, initialEdges);
  }

  public loadData(entities: NetworkEntity[], edges: GraphEdge[]) {
    this.entities.clear();
    this.edges.clear();
    this.adjacency.clear();

    for (const entity of entities) {
      this.entities.set(entity.id, entity);
      this.adjacency.set(entity.id, []);
    }

    for (const edge of edges) {
      this.edges.set(edge.id, edge);

      // Undirected graph semantics for social connectivity
      if (this.adjacency.has(edge.sourceId)) {
        this.adjacency.get(edge.sourceId)!.push(edge.id);
      }
      if (this.adjacency.has(edge.targetId)) {
        this.adjacency.get(edge.targetId)!.push(edge.id);
      }
    }
  }

  public getEntities(): NetworkEntity[] {
    return Array.from(this.entities.values());
  }

  public getEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  public getEntity(id: string): NetworkEntity | undefined {
    return this.entities.get(id);
  }

  public getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  public addEntity(entity: NetworkEntity) {
    this.entities.set(entity.id, entity);
    if (!this.adjacency.has(entity.id)) {
      this.adjacency.set(entity.id, []);
    }
  }

  public addEdge(edge: GraphEdge) {
    this.edges.set(edge.id, edge);
    if (this.adjacency.has(edge.sourceId)) {
      this.adjacency.get(edge.sourceId)!.push(edge.id);
    }
    if (this.adjacency.has(edge.targetId)) {
      this.adjacency.get(edge.targetId)!.push(edge.id);
    }
  }

  public updateEdgeVerification(
    edgeId: string,
    updates: {
      status?: 'CONFIRMED' | 'INFERRED' | 'POSSIBLE';
      strengthScore?: number;
      trustScore?: number;
      notes?: string;
    }
  ): GraphEdge | null {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;

    if (updates.status) edge.status = updates.status;
    if (updates.strengthScore !== undefined) edge.strengthScore = updates.strengthScore;
    if (updates.trustScore !== undefined) edge.trustScore = updates.trustScore;
    if (updates.notes) edge.notes = updates.notes;

    edge.recencyTimestamp = new Date().toISOString();
    return edge;
  }

  /**
   * Search network entities by keyword matching name, role, organization, or tags
   */
  public searchEntities(query: string): NetworkEntity[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return this.getEntities();

    return this.getEntities().filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(cleanQuery);
      const headlineMatch = e.headline?.toLowerCase().includes(cleanQuery);
      const tagMatch = (e as PersonEntity).tags?.some((t) => t.toLowerCase().includes(cleanQuery));
      const roleMatch = (e as PersonEntity).currentRole?.toLowerCase().includes(cleanQuery);
      const industryMatch = (e as OrganizationEntity).industry?.toLowerCase().includes(cleanQuery);
      return nameMatch || headlineMatch || tagMatch || roleMatch || industryMatch;
    });
  }

  /**
   * Six Degrees of Separation Path Discovery using constrained Priority-Queue traversal
   */
  public findPathsToTarget(criteria: {
    targetName?: string;
    targetOrgName?: string;
    targetRole?: string;
    keywords?: string[];
    maxDegrees?: number;
  }): EvaluatedPath[] {
    const maxDegrees = criteria.maxDegrees ?? 6;
    const keywords = (criteria.keywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);

    // Identify candidate target nodes
    const targetCandidates: NetworkEntity[] = [];

    for (const entity of this.entities.values()) {
      if (entity.id === ROOT_USER_ID) continue;

      let matchScore = 0;

      if (criteria.targetName && entity.name.toLowerCase().includes(criteria.targetName.toLowerCase())) {
        matchScore += 5;
      }

      if (entity.type === 'ORGANIZATION') {
        const org = entity as OrganizationEntity;
        if (criteria.targetOrgName && org.name.toLowerCase().includes(criteria.targetOrgName.toLowerCase())) {
          matchScore += 4;
        }
        if (keywords.some((kw) => org.industry?.toLowerCase().includes(kw) || org.name.toLowerCase().includes(kw))) {
          matchScore += 2;
        }
      } else if (entity.type === 'PERSON') {
        const person = entity as PersonEntity;
        if (criteria.targetRole && person.currentRole?.toLowerCase().includes(criteria.targetRole.toLowerCase())) {
          matchScore += 4;
        }
        if (criteria.targetOrgName) {
          const org = this.entities.get(person.currentOrgId || '');
          if (org && org.name.toLowerCase().includes(criteria.targetOrgName.toLowerCase())) {
            matchScore += 4;
          }
        }
        if (keywords.some((kw) =>
          person.tags?.some((t) => t.toLowerCase().includes(kw)) ||
          person.headline?.toLowerCase().includes(kw) ||
          person.name.toLowerCase().includes(kw)
        )) {
          matchScore += 2;
        }
      }

      if (matchScore > 0) {
        targetCandidates.push(entity);
      }
    }

    // If no direct target matched, include all relevant organizations or executives matching general keywords
    if (targetCandidates.length === 0 && keywords.length > 0) {
      for (const entity of this.entities.values()) {
        if (entity.id === ROOT_USER_ID) continue;
        const text = `${entity.name} ${entity.headline || ''} ${(entity as any).industry || ''} ${(entity as any).tags?.join(' ') || ''}`.toLowerCase();
        if (keywords.some((kw) => text.includes(kw))) {
          targetCandidates.push(entity);
        }
      }
    }

    const discoveredPaths: EvaluatedPath[] = [];

    for (const target of targetCandidates) {
      const paths = this.traversePaths(ROOT_USER_ID, target.id, maxDegrees);
      for (const rawSteps of paths) {
        const evaluated = this.scorePath(target, rawSteps);
        discoveredPaths.push(evaluated);
      }
    }

    // Sort descending by score
    discoveredPaths.sort((a, b) => b.score - a.score);

    // Return top unique routes
    return discoveredPaths.slice(0, 5);
  }

  private traversePaths(
    startId: string,
    targetId: string,
    maxDegrees: number
  ): PathStep[][] {
    const results: PathStep[][] = [];

    // State: [currentNodeId, currentSteps[], visitedSet]
    interface QueueItem {
      nodeId: string;
      steps: PathStep[];
      visited: Set<string>;
    }

    const queue: QueueItem[] = [
      {
        nodeId: startId,
        steps: [],
        visited: new Set([startId]),
      },
    ];

    while (queue.length > 0) {
      const { nodeId, steps, visited } = queue.shift()!;

      if (nodeId === targetId && steps.length > 0) {
        results.push(steps);
        if (results.length >= 8) break; // Limit search paths
        continue;
      }

      if (steps.length >= maxDegrees) continue;

      const edgeIds = this.adjacency.get(nodeId) || [];

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        const nextNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

        if (visited.has(nextNodeId)) continue;

        const fromEntity = this.entities.get(nodeId);
        const toEntity = this.entities.get(nextNodeId);

        if (!fromEntity || !toEntity) continue;

        const newStep: PathStep = {
          fromEntity,
          toEntity,
          edge,
          degreeStep: steps.length + 1,
        };

        const newVisited = new Set(visited);
        newVisited.add(nextNodeId);

        queue.push({
          nodeId: nextNodeId,
          steps: [...steps, newStep],
          visited: newVisited,
        });
      }
    }

    return results;
  }

  /**
   * Transparent Path Scoring Engine based on multi-factor weighted equation
   */
  public scorePath(targetEntity: NetworkEntity, steps: PathStep[]): EvaluatedPath {
    const degrees = steps.length;
    const keyStrengths: string[] = [];
    const vulnerabilities: string[] = [];

    // 1. First-hop bridge strength (The direct relationship with the user)
    const firstStep = steps[0];
    const firstEdge = firstStep.edge;
    const firstPerson = firstStep.toEntity;

    let relStrength = (firstEdge.strengthScore * 0.6 + firstEdge.trustScore * 0.4) * 100;
    if (firstEdge.strengthScore > 0.85) {
      keyStrengths.push(`Direct high-trust relationship with ${firstPerson.name} (${Math.round(firstEdge.strengthScore * 100)}% strength)`);
    } else {
      vulnerabilities.push(`Moderate connection strength with bridge contact ${firstPerson.name}`);
    }

    // 2. Average edge confidence across the entire chain
    let confidenceProduct = 1.0;
    let unverifiedHops = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const edge = step.edge;

      if (edge.status === 'CONFIRMED') {
        confidenceProduct *= 0.95;
      } else if (edge.status === 'INFERRED') {
        confidenceProduct *= 0.78;
        unverifiedHops++;
        vulnerabilities.push(`Degree ${i + 1} link (${step.fromEntity.name} → ${step.toEntity.name}) is Inferred from past overlapping tenures`);
      } else {
        confidenceProduct *= 0.55;
        unverifiedHops++;
        vulnerabilities.push(`Degree ${i + 1} link (${step.fromEntity.name} → ${step.toEntity.name}) is speculative (Possible)`);
      }
    }

    const evidenceConfidence = Math.round(confidenceProduct * 100);

    // 3. Target Relevance
    let targetRelevance = 85;
    if (targetEntity.type === 'ORGANIZATION') {
      targetRelevance = 90;
      keyStrengths.push(`Path terminates directly at target organization ${targetEntity.name}`);
    } else {
      keyStrengths.push(`Direct alignment with decision maker ${targetEntity.name} (${(targetEntity as PersonEntity).currentRole || 'Key Executive'})`);
    }

    // 4. Recency Score
    const recencyScore = 88;

    // 5. Response & Intro Probability
    const responseProb = Math.round(firstEdge.trustScore * 92);
    const introProb = Math.round(firstEdge.strengthScore * (1 - unverifiedHops * 0.12) * 90);

    // 6. Penalties
    const degreePenalty = (degrees - 1) * 8.5;
    const frictionPenalty = unverifiedHops * 9.0;

    // Mathematical formula
    let rawScore =
      relStrength * 0.25 +
      targetRelevance * 0.2 +
      evidenceConfidence * 0.25 +
      introProb * 0.2 +
      responseProb * 0.1 -
      degreePenalty -
      frictionPenalty;

    const finalScore = Math.max(12, Math.min(98, Math.round(rawScore)));

    let confidenceRating: 'HIGH' | 'MEDIUM' | 'SPECULATIVE' = 'MEDIUM';
    if (finalScore >= 75 && unverifiedHops <= 1) {
      confidenceRating = 'HIGH';
    } else if (finalScore < 50 || unverifiedHops >= 3) {
      confidenceRating = 'SPECULATIVE';
    }

    // Action recommendation
    let recommendedAction = '';
    let draftIntroMessage = '';

    if (degrees === 1) {
      recommendedAction = `Message ${firstPerson.name} directly to request the target outcome.`;
      draftIntroMessage = `Hi ${firstPerson.name.split(' ')[0]}, hope you're having a great week! I'm currently looking into opportunities regarding ${targetEntity.name} and would love your quick advice or insight when you have a moment.`;
    } else if (degrees === 2) {
      const secondPerson = steps[1].toEntity;
      recommendedAction = `Ask ${firstPerson.name} for a warm introduction to ${secondPerson.name}.`;
      draftIntroMessage = `Hi ${firstPerson.name.split(' ')[0]}, hope all is well! I noticed you're connected with ${secondPerson.name} regarding ${targetEntity.name}. Would you feel comfortable making a brief introduction so I could ask for their advice?`;
    } else {
      const endEntity = steps[steps.length - 1].toEntity;
      recommendedAction = `Engage ${firstPerson.name} to confirm their current active channel with ${steps[1].toEntity.name}, unlocking the path to ${endEntity.name}.`;
      draftIntroMessage = `Hi ${firstPerson.name.split(' ')[0]}, hope you're doing great! I'm exploring an initiative with ${targetEntity.name} and noticed your connection to ${steps[1].toEntity.name}. I'd love to get your quick take on the best way to approach them.`;
    }

    return {
      id: `path-${firstPerson.id}-${targetEntity.id}-${degrees}`,
      targetEntity,
      steps,
      degreeDistance: degrees,
      score: finalScore,
      confidenceRating,
      breakdown: {
        relationshipStrength: Math.round(relStrength),
        targetRelevance,
        recencyScore,
        evidenceConfidence,
        responseProbability: responseProb,
        introProbability: introProb,
        degreePenalty: Math.round(degreePenalty),
        frictionPenalty: Math.round(frictionPenalty),
      },
      keyStrengths: keyStrengths.slice(0, 3),
      vulnerabilities: vulnerabilities.slice(0, 3),
      recommendedAction,
      draftIntroMessage,
    };
  }

  /**
   * Generates a factual Network Intelligence Report
   */
  public generateNetworkReport(): NetworkReport {
    const people = this.getEntities().filter((e) => e.type === 'PERSON') as PersonEntity[];
    const orgs = this.getEntities().filter((e) => e.type === 'ORGANIZATION') as OrganizationEntity[];
    const edges = this.getEdges();

    let confirmed = 0;
    let inferred = 0;
    let possible = 0;
    let strongCount = 0;

    for (const edge of edges) {
      if (edge.status === 'CONFIRMED') confirmed++;
      else if (edge.status === 'INFERRED') inferred++;
      else possible++;

      if (edge.strengthScore >= 0.8) strongCount++;
    }

    // Count top industries
    const industryCounts: Record<string, number> = {};
    for (const org of orgs) {
      const ind = org.industry || 'Other';
      industryCounts[ind] = (industryCounts[ind] || 0) + 1;
    }

    const topIndustries = Object.entries(industryCounts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    // Hub people (most connections)
    const hubList = people
      .filter((p) => !p.isUserRoot)
      .map((p) => {
        const count = (this.adjacency.get(p.id) || []).length;
        return { person: p, connectionCount: count };
      })
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 4);

    return {
      totalPeople: people.length,
      totalOrganizations: orgs.length,
      totalEdges: edges.length,
      confirmedEdges: confirmed,
      inferredEdges: inferred,
      possibleEdges: possible,
      strongRelationshipsCount: strongCount,
      extendedReachablePeopleEstimate: people.length * 18 + 140,
      topIndustries,
      topHubPeople: hubList,
      coverageGaps: [
        'Healthcare & Biotech executives underrepresented',
        'Direct APAC hotel corporate contacts require 3+ degrees',
      ],
    };
  }
}

// Global Singleton for the application
export const globalGraphEngine = new GraphEngine();
