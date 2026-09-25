const { buildAgentPrompt } = require('./agentPrompt');

class AgentOutputError extends Error {
  constructor(reason, rawOutput) {
    super(reason);
    this.name = 'AgentOutputError';
    this.reason = reason;
    this.rawOutput = rawOutput;
  }
}

const runAgentStep = async (snapshot, previousAction, previousSnapshot) => {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3.5:27b', messages: [{ role: 'user', content: buildAgentPrompt(snapshot, previousAction, previousSnapshot) }], stream: false, think: false })
  });
  if (!response.ok) throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  const data = await response.json();
  const rawOutput = data?.message?.content;
  if (typeof rawOutput !== 'string') throw new AgentOutputError('missing_agent_output', rawOutput);
  try {
    return JSON.parse(rawOutput);
  } catch (error) {
    console.error('INVALID OLLAMA OUTPUT:', rawOutput);
    throw new AgentOutputError('invalid_json', rawOutput);
  }
};

module.exports = { AgentOutputError, runAgentStep };
