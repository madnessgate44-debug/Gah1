export type EntityType = 'PERSON' | 'ORGANIZATION' | 'ROLE' | 'LOCATION' | 'DOMAIN' | 'EVENT';

export type VerificationStatus = 'CONFIRMED' | 'INFERRED' | 'POSSIBLE' | 'UNKNOWN';

export type RelationshipType =
  | 'KNOWS'
  | 'WORKED_WITH'
  | 'WORKS_AT'
  | 'FORMER_COLLEAGUE'
  | 'FRIEND_OF'
  | 'STUDIED_WITH'
  | 'CONNECTED_TO'
  | 'INTRODUCED_BY'
  | 'INTERACTED_WITH'
  | 'MEMBER_OF'
  | 'PARTNER_WITH';

export interface EvidenceRecord {
  id: string;
  sourceType: 'IMPORT_VCARD' | 'GOOGLE_CONTACTS' | 'LINKEDIN_EXPORT' | 'USER_CONFIRMATION' | 'INFERRED_OVERLAP' | 'PUBLIC_DIRECTORY';
  rawSnippet?: string;
  timestamp: string;
  confidenceWeight: number; // 0.0 to 1.0
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  avatarUrl?: string;
  headline?: string;
  location?: string;
  identifiers: {
    emails?: string[];
    phones?: string[];
    linkedInHandle?: string;
    domain?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const ROOT_USER_ID = 'user-root';

export interface PersonEntity extends BaseEntity {
  type: 'PERSON';
  currentRole?: string;
  currentOrgId?: string;
  pastOrgIds?: string[];
  skills?: string[];
  tags?: string[];
  isUserRoot?: boolean;
}

export interface OrganizationEntity extends BaseEntity {
  type: 'ORGANIZATION';
  industry?: string;
  domain?: string;
  headquarters?: string;
  sizeRange?: string;
}

export type NetworkEntity = PersonEntity | OrganizationEntity;

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  status: VerificationStatus;
  strengthScore: number; // 0.0 to 1.0
  trustScore: number; // 0.0 to 1.0 (comfort level asking for an intro)
  recencyTimestamp: string;
  evidence: EvidenceRecord[];
  notes?: string;
}

export interface PathStep {
  fromEntity: NetworkEntity;
  toEntity: NetworkEntity;
  edge: GraphEdge;
  degreeStep: number;
}

export interface EvaluatedPath {
  id: string;
  targetEntity: NetworkEntity;
  steps: PathStep[];
  degreeDistance: number; // e.g. 1 to 6
  score: number; // 0 to 100
  confidenceRating: 'HIGH' | 'MEDIUM' | 'SPECULATIVE';
  breakdown: {
    relationshipStrength: number;
    targetRelevance: number;
    recencyScore: number;
    evidenceConfidence: number;
    responseProbability: number;
    introProbability: number;
    degreePenalty: number;
    frictionPenalty: number;
  };
  keyStrengths: string[];
  vulnerabilities: string[];
  recommendedAction: string;
  draftIntroMessage?: string;
}

export interface CalibrationQuestion {
  id: string;
  type: 'EXPLORE' | 'CLARIFY' | 'VERIFY' | 'RELATIONSHIP_STRENGTH' | 'TRUST' | 'PATH_DISCOVERY' | 'CHALLENGE' | 'PRIORITIZE' | 'ACTION';
  question: string;
  contextEntityIds?: string[];
  contextEdgeId?: string;
  suggestedAnswers?: string[];
  answered?: boolean;
  userAnswer?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gahiz' | 'system';
  text: string;
  timestamp: string;
  investigationFindings?: {
    searchedEntitiesCount?: number;
    pathsDiscovered?: number;
    topPathId?: string;
  };
  questionPrompt?: CalibrationQuestion;
  actionCard?: {
    type: 'PATH_HIGHLIGHT' | 'OUTREACH_STRATEGY' | 'EVIDENCE_AUDIT';
    pathId?: string;
    title: string;
    description: string;
  };
}

export interface Mission {
  id: string;
  title: string;
  rawPrompt: string;
  category: 'INTRODUCTION' | 'DISCOUNT_PERK' | 'HIRING_REACH' | 'BUSINESS_DEV' | 'ACCESS' | 'GENERAL';
  targetCriteria: {
    targetName?: string;
    organizationName?: string;
    targetRole?: string;
    location?: string;
    keywords: string[];
  };
  status: 'ANALYZING' | 'WAITING_ON_USER' | 'PATHS_FOUND' | 'NO_PATH_FOUND' | 'RESOLVED';
  evaluatedPaths: EvaluatedPath[];
  activeQuestions: CalibrationQuestion[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkReport {
  totalPeople: number;
  totalOrganizations: number;
  totalEdges: number;
  confirmedEdges: number;
  inferredEdges: number;
  possibleEdges: number;
  strongRelationshipsCount: number;
  extendedReachablePeopleEstimate: number;
  topIndustries: { industry: string; count: number }[];
  topHubPeople: { person: PersonEntity; connectionCount: number }[];
  coverageGaps: string[];
}
