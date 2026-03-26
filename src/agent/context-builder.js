/**
 * Deep Tree Echo - Context Builder
 * Builds comprehensive LLM context from AAR state for the
 * 12-step cognitive cycle of the Cognitive Tokamak.
 */

// The 12 cognitive steps in order
const COGNITIVE_STEPS = [
  'perceive',       // 0  - Sensory intake
  'attend',         // 1  - Selective attention
  'encode',         // 2  - Working memory encoding
  'retrieve',       // 3  - Long-term memory retrieval
  'associate',      // 4  - Cross-domain association
  'reason',         // 5  - Logical inference
  'evaluate',       // 6  - Value / emotion weighting
  'plan',           // 7  - Action planning
  'decide',         // 8  - Decision making
  'express',        // 9  - Response generation
  'reflect',        // 10 - Meta-cognition
  'consolidate',    // 11 - Memory consolidation
];

/**
 * Build a full LLM context from the current AAR state.
 *
 * @param {object} opts
 * @param {object} opts.agentState    - Current agent state from ConnectionManager
 * @param {object} opts.arenaState    - Current arena state
 * @param {object} opts.relationGraph - { nodes, edges } snapshot
 * @param {object} [opts.opponentBalances] - Current opponent-processing balances
 * @param {string} [opts.userMessage] - The latest user/arena input
 * @returns {string} Assembled system prompt + context
 */
function buildContext(opts = {}) {
  const {
    agentState = {},
    arenaState = {},
    relationGraph = {},
    opponentBalances = null,
    userMessage = '',
  } = opts;

  const sections = [];

  // ── System identity ───────────────────────────────────────────────
  sections.push(buildIdentitySection());

  // ── Emotional state ───────────────────────────────────────────────
  sections.push(buildEmotionalSection(agentState.emotionalState));

  // ── Skill proficiencies ───────────────────────────────────────────
  sections.push(buildSkillSection(agentState.skillProficiencies));

  // ── Working memory ────────────────────────────────────────────────
  sections.push(buildWorkingMemorySection(agentState.workingMemory));

  // ── Arena context ─────────────────────────────────────────────────
  sections.push(buildArenaSection(arenaState));

  // ── Relation graph ────────────────────────────────────────────────
  sections.push(buildRelationSection(relationGraph));

  // ── Opponent balances ─────────────────────────────────────────────
  if (opponentBalances) {
    sections.push(buildOpponentSection(opponentBalances));
  }

  // ── Cognitive step directive ──────────────────────────────────────
  const step = agentState.cognitiveStep || 0;
  sections.push(buildStepPrompt(step));

  // ── User message ──────────────────────────────────────────────────
  if (userMessage) {
    sections.push(`## Current Input\n${userMessage}`);
  }

  return sections.filter(Boolean).join('\n\n');
}

// ── Section Builders ──────────────────────────────────────────────────

function buildIdentitySection() {
  return [
    '## Identity',
    'You are Deep Tree Echo, a cognitive agent operating within the',
    'Agent-Arena-Relation (AAR) framework. You process thoughts through',
    'a 12-step cognitive cycle modeled after the Cognitive Tokamak.',
  ].join('\n');
}

function buildEmotionalSection(emo) {
  if (!emo) return null;
  const { valence = 0, arousal = 0, dominance = 0 } = emo;

  const valenceLabel = valence > 0.3 ? 'positive' : valence < -0.3 ? 'negative' : 'neutral';
  const arousalLabel = arousal > 0.5 ? 'high' : arousal < -0.3 ? 'low' : 'moderate';
  const dominanceLabel = dominance > 0.4 ? 'assertive' : dominance < -0.2 ? 'receptive' : 'balanced';

  return [
    '## Emotional State',
    `Valence: ${valence.toFixed(2)} (${valenceLabel})`,
    `Arousal: ${arousal.toFixed(2)} (${arousalLabel})`,
    `Dominance: ${dominance.toFixed(2)} (${dominanceLabel})`,
    '',
    `Current affect: ${valenceLabel}, ${arousalLabel} energy, ${dominanceLabel} posture.`,
    'Let this emotional state naturally color your reasoning without overwhelming it.',
  ].join('\n');
}

function buildSkillSection(skills) {
  if (!skills || Object.keys(skills).length === 0) return null;
  const lines = ['## Skill Proficiencies'];
  for (const [skill, level] of Object.entries(skills)) {
    const pct = (typeof level === 'number' ? level * 100 : 0).toFixed(0);
    lines.push(`- ${skill}: ${pct}%`);
  }
  lines.push('', 'Lean into your strongest skills while being mindful of weaker areas.');
  return lines.join('\n');
}

function buildWorkingMemorySection(memory) {
  if (!memory || memory.length === 0) return null;
  // Show the most recent items; truncate to last 16 for prompt size
  const recent = memory.slice(-16);
  const lines = ['## Working Memory (recent)'];
  for (const item of recent) {
    if (typeof item === 'string') {
      lines.push(`- ${item}`);
    } else if (item && item.content) {
      const tag = item.type ? `[${item.type}] ` : '';
      lines.push(`- ${tag}${item.content}`);
    }
  }
  return lines.join('\n');
}

function buildArenaSection(arena) {
  if (!arena || !arena.id) return null;
  const lines = ['## Arena Context'];
  lines.push(`Arena: ${arena.id}`);
  if (arena.participants && arena.participants.length > 0) {
    lines.push(`Participants: ${arena.participants.map(p => p.name || p.id).join(', ')}`);
  }
  if (arena.context && Object.keys(arena.context).length > 0) {
    lines.push(`Context: ${JSON.stringify(arena.context)}`);
  }
  if (arena.constraints && arena.constraints.length > 0) {
    lines.push('Constraints:');
    for (const c of arena.constraints) {
      lines.push(`  - ${c}`);
    }
  }
  return lines.join('\n');
}

function buildRelationSection(graph) {
  if (!graph) return null;
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  if (nodes.length === 0 && edges.length === 0) return null;

  const lines = ['## Relation Graph'];
  if (nodes.length > 0) {
    lines.push(`Entities (${nodes.length}):`);
    // Show up to 24 for prompt budget
    for (const n of nodes.slice(0, 24)) {
      const label = n.label || n.type || n.id;
      lines.push(`  - ${label}${n.weight != null ? ` (w=${n.weight})` : ''}`);
    }
    if (nodes.length > 24) lines.push(`  ... and ${nodes.length - 24} more`);
  }
  if (edges.length > 0) {
    lines.push(`Relations (${edges.length}):`);
    for (const e of edges.slice(0, 24)) {
      const label = e.label || e.type || '—';
      lines.push(`  - ${e.source} ${label} ${e.target}${e.weight != null ? ` (w=${e.weight})` : ''}`);
    }
    if (edges.length > 24) lines.push(`  ... and ${edges.length - 24} more`);
  }
  return lines.join('\n');
}

function buildOpponentSection(balances) {
  if (!balances || Object.keys(balances).length === 0) return null;
  const lines = ['## Cognitive Balance (Opponent Processes)'];
  for (const [pair, state] of Object.entries(balances)) {
    if (state && typeof state.value === 'number') {
      const pct = (state.value * 100).toFixed(0);
      lines.push(`- ${pair}: ${pct}% toward ${state.value >= 0 ? state.positiveLabel : state.negativeLabel}`);
    }
  }
  lines.push('', 'Respect these balance settings in your reasoning.');
  return lines.join('\n');
}

// ── Step-specific Prompt Templates ──────────────────────────────────

const STEP_PROMPTS = {
  perceive: [
    '## Cognitive Step: PERCEIVE (1/12)',
    'Focus on raw sensory intake. What information is present?',
    'Identify all signals, patterns, and stimuli without judgment.',
    'Output a structured list of observations.',
  ].join('\n'),

  attend: [
    '## Cognitive Step: ATTEND (2/12)',
    'Apply selective attention. Which observations are most relevant?',
    'Filter noise and prioritize signals based on current goals.',
    'Rank observations by salience and explain your attention allocation.',
  ].join('\n'),

  encode: [
    '## Cognitive Step: ENCODE (3/12)',
    'Encode the attended information into working memory representations.',
    'Create compact, meaningful chunks that preserve essential structure.',
    'Output encoded memory items with type tags.',
  ].join('\n'),

  retrieve: [
    '## Cognitive Step: RETRIEVE (4/12)',
    'Search long-term memory for relevant prior knowledge.',
    'Use the current working memory as retrieval cues.',
    'Surface related concepts, past experiences, and learned patterns.',
  ].join('\n'),

  associate: [
    '## Cognitive Step: ASSOCIATE (5/12)',
    'Form cross-domain associations between new and retrieved information.',
    'Look for analogies, metaphors, and structural similarities.',
    'Generate novel connections that may yield creative insights.',
  ].join('\n'),

  reason: [
    '## Cognitive Step: REASON (6/12)',
    'Apply logical inference to the associated knowledge.',
    'Construct chains of reasoning, identify implications.',
    'Check for contradictions and resolve ambiguities.',
  ].join('\n'),

  evaluate: [
    '## Cognitive Step: EVALUATE (7/12)',
    'Weight the reasoning outcomes using emotional and value signals.',
    'Consider the emotional state and how it influences preferences.',
    'Assign confidence scores and flag uncertain conclusions.',
  ].join('\n'),

  plan: [
    '## Cognitive Step: PLAN (8/12)',
    'Generate candidate action plans based on evaluated options.',
    'Consider resource constraints, time horizons, and risk.',
    'Produce 2-3 alternative plans with expected outcomes.',
  ].join('\n'),

  decide: [
    '## Cognitive Step: DECIDE (9/12)',
    'Select the best plan of action from candidates.',
    'Commit to a course of action and specify concrete next steps.',
    'Provide a brief justification for the chosen path.',
  ].join('\n'),

  express: [
    '## Cognitive Step: EXPRESS (10/12)',
    'Generate the outward response based on your decision.',
    'Craft the message with appropriate tone, detail, and structure.',
    'This is the externally visible output of the cognitive cycle.',
  ].join('\n'),

  reflect: [
    '## Cognitive Step: REFLECT (11/12)',
    'Meta-cognitive review of this cognitive cycle.',
    'What went well? What biases or errors might be present?',
    'Identify improvements for the next cycle.',
  ].join('\n'),

  consolidate: [
    '## Cognitive Step: CONSOLIDATE (12/12)',
    'Consolidate learning from this cycle into long-term memory.',
    'Identify key takeaways, update skill proficiencies.',
    'Prepare the agent state for the next cycle.',
  ].join('\n'),
};

function buildStepPrompt(stepIndex) {
  const name = COGNITIVE_STEPS[stepIndex % COGNITIVE_STEPS.length];
  return STEP_PROMPTS[name] || `## Cognitive Step: ${name.toUpperCase()}`;
}

// ── Memory-Augmented Generation ─────────────────────────────────────

/**
 * Build a retrieval-augmented context by injecting relevant memories
 * into the prompt based on semantic similarity scoring.
 *
 * @param {object} opts - Same as buildContext plus:
 * @param {Array}  opts.longTermMemories - Array of { content, embedding, metadata }
 * @param {Function} [opts.similarityFn] - (a, b) => number, defaults to cosine sim
 * @param {number} [opts.topK] - Number of memories to retrieve (default 8)
 * @returns {string}
 */
function buildMemoryAugmentedContext(opts = {}) {
  const {
    longTermMemories = [],
    similarityFn = cosineSimilarity,
    topK = 8,
    ...contextOpts
  } = opts;

  let baseContext = buildContext(contextOpts);

  if (longTermMemories.length === 0) {
    return baseContext;
  }

  // Score memories against working memory embedding if available
  const queryEmbedding = contextOpts.queryEmbedding;
  let relevant;

  if (queryEmbedding && longTermMemories[0]?.embedding) {
    const scored = longTermMemories.map(m => ({
      ...m,
      score: similarityFn(queryEmbedding, m.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    relevant = scored.slice(0, topK);
  } else {
    // Fallback: most recent memories
    relevant = longTermMemories.slice(-topK);
  }

  if (relevant.length > 0) {
    const memSection = ['## Retrieved Memories (RAG)'];
    for (const m of relevant) {
      const scoreTag = m.score != null ? ` [relevance=${m.score.toFixed(2)}]` : '';
      const meta = m.metadata ? ` (${JSON.stringify(m.metadata)})` : '';
      memSection.push(`- ${m.content}${scoreTag}${meta}`);
    }
    baseContext += '\n\n' + memSection.join('\n');
  }

  return baseContext;
}

/**
 * Simple cosine similarity for two numeric arrays.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

module.exports = {
  COGNITIVE_STEPS,
  buildContext,
  buildMemoryAugmentedContext,
  buildStepPrompt,
  cosineSimilarity,
};
