/* global db, ObjectId */

const libreChatDb = db.getSiblingDB('LibreChat');

const MANAGED_AGENT_IDS = ['agent_01', 'agent_02', 'agent_03'];
const PROMPTS_DIRECTORY = 'prompts';

// Keep the agent catalog deliberately scoped to AREX skills rather than exposing every deployment skill.

const AREX_SKILL_IDS = {
  fundamentals: '6dbcc0886e3e82a68fabf569',
  markets: '36bfa4453f56c63b88027f08',
  commercialAccess: '1d5500a56eeacb9c86cdb2f0',
  pricing: '22b5aad8bf03a8fc37ba826e',
  complianceRisks: 'ca09b33ed4fb091d751757af',
};

const AREX_STANDARD_SKILLS = Object.values(AREX_SKILL_IDS);

function readPrompt(agentId) {
  const promptPath = `${PROMPTS_DIRECTORY}/${agentId}.txt`;

  try {
    return require('fs').readFileSync(promptPath, 'utf8').trimEnd();
  } catch (error) {
    throw new Error(
      `Unable to load the prompt for ${agentId} from ${promptPath}: ${error.message}`,
    );
  }
}

const owner = libreChatDb.users.findOne({}, { _id: 1 });

if (owner == null) {
  throw new Error('Create a LibreChat user before running this seed.');
}

/**
 * Keep an id forever once an agent is published. Re-running this script updates
 * that same MongoDB document rather than deleting and recreating it, so its
 * ObjectId, ACL references, conversations and agent links remain valid.
 */
const agents = [
  {
    id: 'agent_01',
    name: 'Agent Basic',
    description: 'Basic agent for lightweight queries.',
    instructions: readPrompt('agent_01'),
    model: 'gemini-3.5-flash-lite',
    provider: 'google',
    model_parameters: {
      thinking: true,
      thinkingLevel: 'medium',
    },
    tools: [
      /* 'mcp_tool_basica' */
    ],
    skills_enabled: true,
    skills_scope: 'selected',
    skills: [AREX_SKILL_IDS.fundamentals],
  },
  {
    id: 'agent_02',
    name: 'Agent Standard',
    description: 'Balanced agent for analysis and complex tasks.',
    instructions: readPrompt('agent_02'),
    model: 'gemini-3.5-flash',
    provider: 'google',
    model_parameters: {
      thinking: true,
      thinkingLevel: 'medium',
    },
    tools: [
      /* 'mcp_tool_basica', 'mcp_tool_avanzada' */
    ],
    skills_enabled: true,
    skills_scope: 'selected',
    skills: AREX_STANDARD_SKILLS,
  },
  // To publish a third managed agent, uncomment it. Its stable id must not be
  // changed after its first deployment.
  // {
  //   id: 'agent_03',
  //   name: 'Agent Pro',
  //   description: 'Advanced high-performance agent.',
  //   instructions:  readPrompt('agent_03'),
  //   model: 'gemini-2.5-pro',
  //   provider: 'google',
  //   model_parameters: {},
  //   tools: [/* 'mcp_tool_basica', 'mcp_tool_avanzada', 'mcp_tool_pro' */],
  // },
];

const now = new Date();
const publishedIds = agents.map((agent) => agent.id);
let created = 0;
let updated = 0;
let unchanged = 0;

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

for (const definition of agents) {
  // Supports the old `agent_id` field too, without creating a duplicate when
  // migrating an earlier version of this seed.
  const existing = libreChatDb.agents.findOne({
    $or: [{ id: definition.id }, { agent_id: definition.id }],
  });
  const managedFields = {
    ...definition,
    category: 'general',
    edges: [],
    conversation_starters: [],
    tool_resources: {},
    is_promoted: true,
  };

  if (existing == null) {
    const inserted = {
      _id: new ObjectId(),
      ...managedFields,
      author: owner._id,
      createdAt: now,
      updatedAt: now,
    };
    libreChatDb.agents.insertOne(inserted);
    created += 1;

    libreChatDb.aclentries.updateOne(
      {
        principalType: 'public',
        resourceType: 'agent',
        resourceId: inserted._id,
      },
      {
        $set: {
          permBits: 1, // VIEW: LibreChat grants use through this permission.
          grantedBy: owner._id,
          grantedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    continue;
  }

  const hasChanged = Object.keys(managedFields).some(
    (field) => !sameValue(existing[field], managedFields[field]),
  );

  if (hasChanged) {
    libreChatDb.agents.updateOne(
      { _id: existing._id },
      { $set: { ...managedFields, updatedAt: now } },
    );
    updated += 1;
  } else {
    unchanged += 1;
  }

  // Always repair the public VIEW ACL. This does not grant edit, delete, or
  // create rights, and it keeps the seed resilient to a manually removed ACL.
  libreChatDb.aclentries.updateOne(
    {
      principalType: 'public',
      resourceType: 'agent',
      resourceId: existing._id,
    },
    {
      $set: {
        permBits: 1,
        grantedBy: owner._id,
        grantedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

// A definition removed from the catalogue is unpublished, never deleted. Its
// ObjectId and old conversations remain intact, but new users cannot select it.
const retiredIds = MANAGED_AGENT_IDS.filter((id) => !publishedIds.includes(id));
if (retiredIds.length > 0) {
  const retiredAgents = libreChatDb.agents
    .find({ $or: [{ id: { $in: retiredIds } }, { agent_id: { $in: retiredIds } }] }, { _id: 1 })
    .toArray();
  const retiredObjectIds = retiredAgents.map((agent) => agent._id);

  if (retiredObjectIds.length > 0) {
    libreChatDb.agents.updateMany(
      { _id: { $in: retiredObjectIds } },
      { $set: { is_promoted: false, updatedAt: now } },
    );
    libreChatDb.aclentries.deleteMany({
      principalType: 'public',
      resourceType: 'agent',
      resourceId: { $in: retiredObjectIds },
    });
  }
}

print(
  `Managed agents synchronized: ${created} created, ${updated} updated, ${unchanged} unchanged.`,
);
