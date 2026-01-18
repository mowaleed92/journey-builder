import type { Condition, ConditionGroup, Facts, Edge } from '../types/database';

function evaluateCondition(condition: Condition, facts: Facts): boolean {
  const factValue = facts[condition.fact];
  const targetValue = condition.value;

  switch (condition.op) {
    case 'eq':
      return factValue === targetValue;
    case 'neq':
      return factValue !== targetValue;
    case 'gt':
      return typeof factValue === 'number' && typeof targetValue === 'number' && factValue > targetValue;
    case 'gte':
      return typeof factValue === 'number' && typeof targetValue === 'number' && factValue >= targetValue;
    case 'lt':
      return typeof factValue === 'number' && typeof targetValue === 'number' && factValue < targetValue;
    case 'lte':
      return typeof factValue === 'number' && typeof targetValue === 'number' && factValue <= targetValue;
    case 'contains':
      if (Array.isArray(factValue)) {
        return factValue.includes(targetValue);
      }
      if (typeof factValue === 'string' && typeof targetValue === 'string') {
        return factValue.includes(targetValue);
      }
      return false;
    case 'in':
      if (Array.isArray(targetValue)) {
        return targetValue.includes(factValue);
      }
      return false;
    default:
      return false;
  }
}

function evaluateConditionGroup(group: ConditionGroup, facts: Facts): boolean {
  if (group.all) {
    return group.all.every((item) => {
      if ('fact' in item) {
        return evaluateCondition(item as Condition, facts);
      }
      return evaluateConditionGroup(item as ConditionGroup, facts);
    });
  }

  if (group.any) {
    return group.any.some((item) => {
      if ('fact' in item) {
        return evaluateCondition(item as Condition, facts);
      }
      return evaluateConditionGroup(item as ConditionGroup, facts);
    });
  }

  return true;
}

export function evaluateEdgeCondition(edge: Edge, facts: Facts): boolean {
  if (!edge.condition) {
    return true;
  }
  return evaluateConditionGroup(edge.condition, facts);
}

export function findNextBlock(
  currentBlockId: string,
  edges: Edge[],
  facts: Facts
): string | null {
  const outgoingEdges = edges
    .filter((edge) => edge.from === currentBlockId)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const edge of outgoingEdges) {
    if (evaluateEdgeCondition(edge, facts)) {
      return edge.to;
    }
  }

  const defaultEdge = outgoingEdges.find((edge) => !edge.condition);
  return defaultEdge?.to ?? null;
}

export function buildFactsFromBlockState(
  blockState: {
    score?: number | null;
    weak_topics?: string[];
    attempts_count?: number;
    time_spent_seconds?: number;
    status?: string;
    output_json?: Record<string, unknown>;
  },
  quizContent?: {
    questions?: { id: string }[];
  }
): Facts {
  const facts: Facts = {};

  if (blockState.score !== undefined && blockState.score !== null) {
    facts['quiz.scorePercent'] = blockState.score;
  }

  if (blockState.weak_topics && blockState.weak_topics.length > 0) {
    facts['quiz.weakTopics'] = blockState.weak_topics;
  }

  if (quizContent?.questions) {
    const totalCount = quizContent.questions.length;
    facts['quiz.totalCount'] = totalCount;
    if (blockState.score !== undefined && blockState.score !== null) {
      facts['quiz.correctCount'] = Math.round((blockState.score / 100) * totalCount);
    }
  }

  if (blockState.attempts_count !== undefined) {
    facts['block.attemptsCount'] = blockState.attempts_count;
  }

  if (blockState.time_spent_seconds !== undefined) {
    facts['block.timeSpentSeconds'] = blockState.time_spent_seconds;
  }

  if (blockState.status) {
    facts['block.status'] = blockState.status;
  }

  if (blockState.output_json) {
    Object.entries(blockState.output_json).forEach(([key, value]) => {
      facts[`output.${key}`] = value;
    });
  }

  return facts;
}
