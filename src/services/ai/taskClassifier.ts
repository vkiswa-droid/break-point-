import { TaskType, PrivacyLevel } from '../../types';

export interface TaskClassificationResult {
  taskType: TaskType;
  privacyLevel: PrivacyLevel;
  confidence: number;
  isDeterministic: boolean;
  deterministicResult?: string;
  detectedSensitiveKeywords?: string[];
}

export class TaskClassifier {
  /**
   * Classify user input into specific TaskType and PrivacyLevel.
   * If a deterministic answer can be computed immediately, produces deterministicResult.
   */
  classify(text: string): TaskClassificationResult {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Secret & Privacy Scan
    const privacy = this.evaluatePrivacy(trimmed);

    // 2. Deterministic Math & Calculation Detection
    const mathResult = this.tryEvaluateMath(trimmed);
    if (mathResult !== null) {
      return {
        taskType: 'calculation',
        privacyLevel: privacy.level,
        confidence: 0.98,
        isDeterministic: true,
        deterministicResult: mathResult,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 3. Deterministic System Commands (Time, Date, Status)
    const timeMatch = lower.match(/^(what\s*(is\s*the)?\s*time(\s*is\s*it)?|current\s*time|time\s*now|what\s*day\s*is\s*it|current\s*date|what('s| is) today('s)? date)\??$/i);
    if (timeMatch) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        taskType: 'simple_command',
        privacyLevel: 'public',
        confidence: 0.99,
        isDeterministic: true,
        deterministicResult: `The current system time is ${timeStr} on ${dateStr}, sir.`,
        detectedSensitiveKeywords: []
      };
    }

    // 4. Stock Market & Financial Inquiries
    if (
      lower.includes('stock') ||
      lower.includes('ticker') ||
      lower.includes('nasdaq') ||
      lower.includes('nyse') ||
      lower.includes('market price') ||
      lower.includes('market cap') ||
      lower.includes('pe ratio') ||
      lower.includes('earnings report') ||
      lower.includes('backtest') ||
      lower.includes('trading strategy')
    ) {
      return {
        taskType: 'stock_market',
        privacyLevel: privacy.level,
        confidence: 0.92,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 5. Idea Simulation & Scenarios
    if (
      lower.includes('simulate') ||
      lower.includes('what-if') ||
      lower.includes('scenario') ||
      lower.includes('premortem') ||
      lower.includes('hypothesis') ||
      lower.includes('decision analysis') ||
      lower.includes('best-case') ||
      lower.includes('worst-case')
    ) {
      return {
        taskType: 'idea_simulation',
        privacyLevel: privacy.level,
        confidence: 0.90,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 6. Coding & Debugging
    if (
      lower.includes('function') ||
      lower.includes('code') ||
      lower.includes('typescript') ||
      lower.includes('javascript') ||
      lower.includes('python') ||
      lower.includes('bug') ||
      lower.includes('debug') ||
      lower.includes('refactor') ||
      lower.includes('syntax') ||
      lower.includes('algorithm') ||
      lower.includes('api endpoint') ||
      trimmed.includes('{') && trimmed.includes('}') ||
      trimmed.includes('const ') ||
      trimmed.includes('def ')
    ) {
      return {
        taskType: 'coding',
        privacyLevel: privacy.level,
        confidence: 0.88,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 7. Web Research
    if (
      lower.includes('search web') ||
      lower.includes('look up') ||
      lower.includes('latest news') ||
      lower.includes('find articles') ||
      lower.includes('who is') ||
      lower.includes('what happened') ||
      lower.includes('research')
    ) {
      return {
        taskType: 'web_research',
        privacyLevel: privacy.level,
        confidence: 0.85,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 8. Document & File Analysis
    if (
      lower.includes('read file') ||
      lower.includes('analyze document') ||
      lower.includes('summarize pdf') ||
      lower.includes('parse csv') ||
      lower.includes('spreadsheet') ||
      lower.includes('.pdf') ||
      lower.includes('.docx') ||
      lower.includes('.csv') ||
      lower.includes('.json')
    ) {
      return {
        taskType: 'document_analysis',
        privacyLevel: privacy.level,
        confidence: 0.89,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 9. Complex Multi-Step Reasoning
    if (
      lower.includes('why') ||
      lower.includes('explain the relationship') ||
      lower.includes('compare and contrast') ||
      lower.includes('strategic plan') ||
      lower.includes('architecture review') ||
      trimmed.length > 200
    ) {
      return {
        taskType: 'complex_reasoning',
        privacyLevel: privacy.level,
        confidence: 0.82,
        isDeterministic: false,
        detectedSensitiveKeywords: privacy.detectedKeywords
      };
    }

    // 10. Voice / Casual Conversation (Default)
    return {
      taskType: 'casual_conversation',
      privacyLevel: privacy.level,
      confidence: 0.80,
      isDeterministic: false,
      detectedSensitiveKeywords: privacy.detectedKeywords
    };
  }

  private evaluatePrivacy(text: string): { level: PrivacyLevel; detectedKeywords: string[] } {
    const detected: string[] = [];

    // Check for explicit API keys or secrets
    if (/AIza[0-9A-Za-z-_]{20,50}/.test(text) || /sk-[0-9A-Za-z-_]{20,60}/.test(text) || /gsk_[0-9A-Za-z-_]{20,60}/.test(text)) {
      detected.push('api_key');
      return { level: 'secret_bearing', detectedKeywords: detected };
    }

    if (/\b(password|passwd|secret_key|private_key|token|auth_token)\b/i.test(text)) {
      detected.push('credential_keyword');
      return { level: 'secret_bearing', detectedKeywords: detected };
    }

    // Sensitive personal information
    if (/\b(ssn|credit card|bank account|passport|pin code)\b/i.test(text)) {
      detected.push('financial_or_identity_id');
      return { level: 'sensitive', detectedKeywords: detected };
    }

    if (/\b(my address|my phone number|email address|salary|medical)\b/i.test(text)) {
      detected.push('personal_data');
      return { level: 'personal', detectedKeywords: detected };
    }

    return { level: 'public', detectedKeywords: [] };
  }

  private tryEvaluateMath(text: string): string | null {
    // Look for explicit math expressions like "what is 25 * 40?", "calc 1024 / 8", "15% of 800"
    let expr = text
      .replace(/^(what is|calculate|calc|compute|evaluate)\s+/i, '')
      .replace(/\?$/, '')
      .trim();

    // Check for percentage calculation (e.g. "15% of 800")
    const pctMatch = expr.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)$/i);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      const val = parseFloat(pctMatch[2]);
      const res = (pct / 100) * val;
      return `${pct}% of ${val} = ${res}`;
    }

    // Check if the expression contains only safe math characters
    // e.g. digits, whitespace, +, -, *, /, %, (, ), ^, .
    if (!/^[0-9+\-*/().\s^%]+$/.test(expr)) {
      return null;
    }

    // Avoid standalone numbers
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return null;
    }

    try {
      // Safe deterministic evaluation without using eval()
      const sanitized = expr.replace(/\^/g, '**');
      // Validate arithmetic token sequence
      const func = new Function(`return (${sanitized});`);
      const val = func();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return `Deterministic calculation result:\n${expr} = ${val}`;
      }
    } catch {
      // Not a valid standalone math formula
    }

    return null;
  }
}

export const taskClassifier = new TaskClassifier();
