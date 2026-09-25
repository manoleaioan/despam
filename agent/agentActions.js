const AGENT_ACTIONS = {
  CLICK: 'click',
  TYPE: 'type',
  SELECT: 'select',
  CHECK: 'check',
  UNCHECK: 'uncheck',
  WAIT: 'wait',
  DONE: 'done'
};

const MAX_WAIT_MS = 10000;
const MAX_TYPE_LENGTH = 1000;
const invalidAction = (reason) => ({ valid: false, reason });
const findElement = (snapshot, id) => snapshot?.elements?.find((element) => element.id === id);

const validateAgentAction = (candidate, snapshot) => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return invalidAction('action_must_be_an_object');
  const action = typeof candidate.action === 'string' ? candidate.action.toLowerCase() : null;
  if (!Object.values(AGENT_ACTIONS).includes(action)) return invalidAction('unsupported_action');

  if (action === AGENT_ACTIONS.DONE) {
    if (candidate.status !== undefined && candidate.status !== 'failed') return invalidAction('invalid_done_status');
    if (candidate.reason !== undefined && typeof candidate.reason !== 'string') return invalidAction('invalid_done_reason');
    return { valid: true, action: candidate.status === 'failed' ? { action, status: 'failed', reason: candidate.reason || 'agent_failed' } : { action } };
  }

  if (action === AGENT_ACTIONS.WAIT) {
    if (!Number.isInteger(candidate.ms) || candidate.ms < 1 || candidate.ms > MAX_WAIT_MS) return invalidAction('invalid_wait_duration');
    return { valid: true, action: { action, ms: candidate.ms } };
  }

  if (!Number.isInteger(candidate.id)) return invalidAction('invalid_element_id');
  const element = findElement(snapshot, candidate.id);
  if (!element) return invalidAction('element_not_in_snapshot');
  if (element.disabled) return invalidAction('element_is_disabled');

  if (action === AGENT_ACTIONS.CLICK) {
    if (element.tag === 'select' || element.type === 'checkbox') return invalidAction('click_requires_non_select_non_checkbox');
    return { valid: true, action: { action, id: candidate.id } };
  }
  if (action === AGENT_ACTIONS.CHECK || action === AGENT_ACTIONS.UNCHECK) {
    if (element.type !== 'checkbox') return invalidAction('checkbox_action_requires_checkbox');
    if ((action === AGENT_ACTIONS.CHECK && element.checked) || (action === AGENT_ACTIONS.UNCHECK && !element.checked)) return invalidAction('checkbox_already_in_requested_state');
    return { valid: true, action: { action, id: candidate.id } };
  }
  if (action === AGENT_ACTIONS.SELECT) {
    if (element.tag !== 'select' || typeof candidate.value !== 'string') return invalidAction('invalid_select_action');
    if (!element.options?.some((option) => option.value === candidate.value)) return invalidAction('select_value_not_in_snapshot');
    return { valid: true, action: { action, id: candidate.id, value: candidate.value } };
  }
  if (action === AGENT_ACTIONS.TYPE) {
    const allowedInput = element.tag === 'textarea' || (element.tag === 'input' && ['text', 'email', 'search', 'url', 'tel', ''].includes(element.type || ''));
    if (!allowedInput || typeof candidate.text !== 'string' || candidate.text.length > MAX_TYPE_LENGTH) return invalidAction('invalid_type_action');
    return { valid: true, action: { action, id: candidate.id, text: candidate.text } };
  }
  return invalidAction('unsupported_action');
};

module.exports = { AGENT_ACTIONS, MAX_WAIT_MS, validateAgentAction };
