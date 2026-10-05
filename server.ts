import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { globalGraphEngine } from './src/services/graphEngine';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// ----------------------------------------------------
// 1. REST API ENDPOINTS FOR THE NETWORK GRAPH
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Network Vital Summary & Intelligence Report
app.get('/api/network/summary', (req, res) => {
  try {
    const report = globalGraphEngine.generateNetworkReport();
    res.json({
      success: true,
      report,
      entities: globalGraphEngine.getEntities(),
      edges: globalGraphEngine.getEdges(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search entities
app.get('/api/network/search', (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const results = globalGraphEngine.searchEntities(q);
    res.json({ success: true, count: results.length, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Find 6-Degree Paths
app.post('/api/paths/find', (req, res) => {
  try {
    const { targetName, targetOrgName, targetRole, keywords, maxDegrees } = req.body;
    const paths = globalGraphEngine.findPathsToTarget({
      targetName,
      targetOrgName,
      targetRole,
      keywords,
      maxDegrees: maxDegrees || 6,
    });
    res.json({ success: true, count: paths.length, paths });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify / Calibrate Edge
app.post('/api/edge/verify', (req, res) => {
  try {
    const { edgeId, status, strengthScore, trustScore, notes } = req.body;
    const updated = globalGraphEngine.updateEdgeVerification(edgeId, {
      status,
      strengthScore,
      trustScore,
      notes,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Edge not found' });
    }
    res.json({ success: true, edge: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ingest new contact / entity
app.post('/api/network/ingest', (req, res) => {
  try {
    const { entity, edge } = req.body;
    if (entity) {
      globalGraphEngine.addEntity(entity);
    }
    if (edge) {
      globalGraphEngine.addEdge(edge);
    }
    res.json({ success: true, report: globalGraphEngine.generateNetworkReport() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// 2. GEMINI AI INVESTIGATION ENGINE
// ----------------------------------------------------

const toolSearchNetwork: FunctionDeclaration = {
  name: 'search_network',
  description: 'Searches the user authorized personal network and connected organizations for matching names, roles, or domains.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Keywords to search across people, companies, or tags (e.g. "Four Seasons", "Stripe", "Hospitality", "Recruiter")',
      },
    },
    required: ['query'],
  },
};

const toolFindConnectionPaths: FunctionDeclaration = {
  name: 'find_connection_paths',
  description: 'Executes the deterministic Six-Degree graph engine to discover multi-hop relationship chains between the user and a target person or company.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetName: { type: Type.STRING, description: 'Specific target person name if known' },
      targetOrgName: { type: Type.STRING, description: 'Target company, hotel, or institution' },
      targetRole: { type: Type.STRING, description: 'Target role or executive department (e.g. General Manager, Hiring Lead)' },
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Relevant domain tags (e.g. ["hospitality", "discounts", "engineering"])',
      },
    },
  },
};

app.post('/api/mission/investigate', async (req, res) => {
  const { prompt, conversationHistory = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Pre-search network to immediately supply real graph findings
  const autoKeywords = prompt.split(/\s+/).filter((w: string) => w.length > 3);
  const discoveredPaths = globalGraphEngine.findPathsToTarget({
    keywords: autoKeywords,
    maxDegrees: 6,
  });

  const gemini = getGeminiClient();

  if (!gemini) {
    // Graceful Offline Deterministic Investigator Fallback
    const topPath = discoveredPaths[0];
    let responseText = '';
    let questionPrompt: any = null;

    if (discoveredPaths.length > 0 && topPath) {
      const bridgePerson = topPath.steps[0].toEntity.name;
      const targetName = topPath.targetEntity.name;

      responseText = `I investigated your network graph across ${topPath.degreeDistance} degrees of separation. I found a strong viable path to **${targetName}** routed through your contact **${bridgePerson}**.\n\n` +
        `• **Degree Path:** You → ${topPath.steps.map((s) => s.toEntity.name).join(' → ')}\n` +
        `• **Calculated Score:** ${topPath.score}/100 (${topPath.confidenceRating} confidence)\n` +
        `• **Key Advantage:** ${topPath.keyStrengths[0] || 'Direct organizational overlap'}`;

      // Add a calibration question if there is an unverified or inferred link
      const unverifiedStep = topPath.steps.find((s) => s.edge.status === 'INFERRED' || s.edge.status === 'POSSIBLE');
      if (unverifiedStep) {
        questionPrompt = {
          id: `q-${Date.now()}`,
          type: 'VERIFY',
          question: `I noticed ${unverifiedStep.fromEntity.name} and ${unverifiedStep.toEntity.name} have an inferred connection from past shared tenure. Do you know if they are still in regular touch?`,
          contextEdgeId: unverifiedStep.edge.id,
          suggestedAnswers: [
            'Yes, they speak often',
            'I believe so, but not 100% sure',
            'No, they lost touch',
          ],
        };
      } else {
        questionPrompt = {
          id: `q-${Date.now()}`,
          type: 'ACTION',
          question: `Would you like me to prepare a personalized warm introduction outreach draft to ${bridgePerson}?`,
          suggestedAnswers: [
            'Yes, prepare the introduction script',
            'Explore alternative routes first',
          ],
        };
      }
    } else {
      responseText = `I searched your current network graph for connections matching "${prompt}". No direct 1st or 2nd-degree links were immediately found in the active index. However, expanding the search into extended alumni and corporate alumni clusters may reveal hidden bridge nodes.`;
      questionPrompt = {
        id: `q-${Date.now()}`,
        type: 'EXPLORE',
        question: 'Do you have past colleagues, conference contacts, or alumni from related industries we can connect to this search?',
        suggestedAnswers: [
          'Import more contacts from vCard / CSV',
          'Connect Google Contacts',
          'Search hospitality alumni',
        ],
      };
    }

    return res.json({
      success: true,
      text: responseText,
      paths: discoveredPaths,
      questionPrompt,
      investigationFindings: {
        searchedEntitiesCount: globalGraphEngine.getEntities().length,
        pathsDiscovered: discoveredPaths.length,
        topPathId: topPath?.id,
      },
    });
  }

  // GEMINI POWERED ACTIVE INVESTIGATOR
  try {
    const systemInstruction = `You are GAHIZ, an autonomous personal network intelligence system built around Six Degrees of Separation.
You are NOT a simple chatbot or passive assistant.
You proactively investigate the user's network graph, find multi-hop relationship chains (Degree 1 to 6), evaluate path feasibility, and ask targeted human-calibration questions when context is needed.

CRITICAL RULES:
1. Always distinguish CONFIRMED vs INFERRED vs POSSIBLE. Never claim an inference is a verified fact.
2. The shortest path is not always best. A 4-degree high-trust path is superior to a 2-degree cold/weak path.
3. Be concise, sharp, and objective. Show the degrees of separation clearly (You → Contact A → Contact B → Target).
4. If you identify a gap or uncertainty in relationship recency/trust, formulate an explicit calibration inquiry.`;

    const model = 'models/gemini-2.5-flash';

    const entitiesSummary = globalGraphEngine.getEntities().map((e) => `${e.name} (${e.type}, ${e.headline || (e as any).industry || ''})`).join(', ');

    const promptContext = `USER MISSION: "${prompt}"
AVAILABLE NETWORK NODES IN GRAPH: ${entitiesSummary}
DISCOVERED 6-DEGREE PATHS:
${discoveredPaths.map((p, i) => `[Path ${i + 1}] Score: ${p.score}/100, Degrees: ${p.degreeDistance}, Chain: You → ${p.steps.map((s) => s.toEntity.name).join(' → ')}, Strengths: ${p.keyStrengths.join('; ')}`).join('\n')}

Based on the mission and discovered network paths, respond as GAHIZ.
Provide your investigative finding, state the strongest discovered route, and formulate one high-leverage calibration or action question for the user.`;

    const response = await gemini.models.generateContent({
      model,
      contents: promptContext,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const aiText = response.text || `Investigated your network and identified ${discoveredPaths.length} multi-degree routes to your target.`;

    const topPath = discoveredPaths[0];
    let questionPrompt: any = null;

    if (topPath) {
      questionPrompt = {
        id: `q-${Date.now()}`,
        type: 'VERIFY',
        question: `How comfortable would you feel reaching out to ${topPath.steps[0].toEntity.name} to initiate this connection?`,
        suggestedAnswers: [
          'Very comfortable - we are close',
          'Somewhat comfortable with the right intro note',
          'Let’s check an alternative route first',
        ],
      };
    }

    res.json({
      success: true,
      text: aiText,
      paths: discoveredPaths,
      questionPrompt,
      investigationFindings: {
        searchedEntitiesCount: globalGraphEngine.getEntities().length,
        pathsDiscovered: discoveredPaths.length,
        topPathId: topPath?.id,
      },
    });
  } catch (error: any) {
    console.error('Gemini Investigation Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// 3. VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GAHIZ Network Engine running on http://localhost:${PORT}`);
  });
}

startServer();
