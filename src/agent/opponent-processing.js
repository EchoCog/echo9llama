/**
 * Deep Tree Echo - Opponent Processing
 * Implements cognitive balance pairs inspired by opponent-process theory.
 * Each pair represents two competing tendencies that must be dynamically
 * balanced based on context and performance feedback.
 */

const { EventEmitter } = require('events');

// Default balance pairs with descriptive labels
const DEFAULT_BALANCE_PAIRS = {
  exploration_exploitation: {
    positiveLabel: 'exploration',
    negativeLabel: 'exploitation',
    value: 0,          // -1.0 (full exploitation) to +1.0 (full exploration)
    momentum: 0,       // rate of change
    decayRate: 0.05,   // how fast the balance drifts toward 0
  },
  breadth_depth: {
    positiveLabel: 'breadth',
    negativeLabel: 'depth',
    value: 0,
    momentum: 0,
    decayRate: 0.04,
  },
  stability_flexibility: {
    positiveLabel: 'flexibility',
    negativeLabel: 'stability',
    value: 0,
    momentum: 0,
    decayRate: 0.03,
  },
};

class OpponentProcessor extends EventEmitter {
  /**
   * @param {object} [config]
   * @param {object} [config.pairs] - Override default balance pairs
   * @param {number} [config.maxHistory] - Max history entries per pair (default 256)
   * @param {number} [config.momentumDecay] - Momentum friction factor (default 0.9)
   */
  constructor(config = {}) {
    super();

    this.pairs = {};
    const pairDefs = config.pairs || DEFAULT_BALANCE_PAIRS;
    for (const [key, def] of Object.entries(pairDefs)) {
      this.pairs[key] = { ...def };
    }

    this.maxHistory = config.maxHistory || 256;
    this.momentumDecay = config.momentumDecay || 0.9;

    // History: array of { timestamp, pairKey, value, trigger }
    this.history = [];
  }

  // ── Core Balance Adjustment ───────────────────────────────────────

  /**
   * Nudge a balance pair toward one side.
   *
   * @param {string} pairKey - e.g. 'exploration_exploitation'
   * @param {number} delta   - Positive pushes toward positiveLabel, negative toward negativeLabel
   * @param {string} [trigger] - What caused this adjustment (for auditing)
   * @returns {object} Updated pair state
   */
  adjust(pairKey, delta, trigger = 'manual') {
    const pair = this.pairs[pairKey];
    if (!pair) {
      throw new Error(`Unknown balance pair: ${pairKey}`);
    }

    pair.momentum += delta;
    pair.value = clamp(pair.value + delta, -1, 1);

    this._recordHistory(pairKey, pair.value, trigger);
    this.emit('adjust', { pairKey, value: pair.value, delta, trigger });

    return { ...pair };
  }

  /**
   * Apply dynamic balance adjustment based on context signals.
   * This is the main integration hook for the cognitive cycle.
   *
   * @param {object} context
   * @param {number} [context.novelty]       - 0-1, how novel the current input is
   * @param {number} [context.complexity]     - 0-1, how complex the current task is
   * @param {number} [context.uncertainty]    - 0-1, epistemic uncertainty
   * @param {number} [context.timeConstraint] - 0-1, how time-pressed the agent is
   * @param {number} [context.arousal]        - -1 to 1, emotional arousal
   * @returns {object} All updated pair states
   */
  adjustFromContext(context = {}) {
    const {
      novelty = 0.5,
      complexity = 0.5,
      uncertainty = 0.5,
      timeConstraint = 0.5,
      arousal = 0,
    } = context;

    // Exploration/Exploitation: high novelty/uncertainty favors exploration
    const exploreSignal = (novelty * 0.4 + uncertainty * 0.4 + (1 - timeConstraint) * 0.2) - 0.5;
    this.adjust('exploration_exploitation', exploreSignal * 0.15, 'context');

    // Breadth/Depth: high complexity favors depth; high novelty favors breadth
    const breadthSignal = (novelty * 0.5 - complexity * 0.3 + (1 - timeConstraint) * 0.2) - 0.2;
    this.adjust('breadth_depth', breadthSignal * 0.12, 'context');

    // Stability/Flexibility: high uncertainty + arousal favors flexibility
    const flexSignal = (uncertainty * 0.4 + Math.abs(arousal) * 0.3 + novelty * 0.3) - 0.5;
    this.adjust('stability_flexibility', flexSignal * 0.1, 'context');

    return this.getBalances();
  }

  // ── Decay / Tick ──────────────────────────────────────────────────

  /**
   * Apply natural decay: balances drift toward 0, momentum decays.
   * Call this once per cognitive cycle.
   */
  tick() {
    for (const [key, pair] of Object.entries(this.pairs)) {
      // Apply momentum
      pair.value = clamp(pair.value + pair.momentum * 0.1, -1, 1);

      // Decay toward equilibrium
      if (Math.abs(pair.value) > 0.01) {
        pair.value -= Math.sign(pair.value) * pair.decayRate;
        // Prevent overshoot past zero
        if (Math.abs(pair.value) < pair.decayRate) {
          pair.value = 0;
        }
      }

      // Friction on momentum
      pair.momentum *= this.momentumDecay;
    }

    this.emit('tick', this.getBalances());
  }

  // ── State Access ──────────────────────────────────────────────────

  /**
   * Get all current balance values as a plain object.
   */
  getBalances() {
    const result = {};
    for (const [key, pair] of Object.entries(this.pairs)) {
      result[key] = { ...pair };
    }
    return result;
  }

  /**
   * Get a single pair's state.
   */
  getBalance(pairKey) {
    const pair = this.pairs[pairKey];
    if (!pair) return null;
    return { ...pair };
  }

  // ── Integration Hooks for Thought Generation ──────────────────────

  /**
   * Returns directives for the LLM based on current balances.
   * Use this to influence thought generation without hard constraints.
   *
   * @returns {string[]} Array of natural-language directives
   */
  getThoughtDirectives() {
    const directives = [];

    const ee = this.pairs.exploration_exploitation;
    if (ee) {
      if (ee.value > 0.3) {
        directives.push('Favor exploring novel approaches and unconventional ideas.');
      } else if (ee.value < -0.3) {
        directives.push('Favor exploiting known effective strategies and refining existing solutions.');
      }
    }

    const bd = this.pairs.breadth_depth;
    if (bd) {
      if (bd.value > 0.3) {
        directives.push('Cast a wide net: consider many options and perspectives before narrowing.');
      } else if (bd.value < -0.3) {
        directives.push('Go deep: thoroughly analyze the most promising direction rather than spreading attention.');
      }
    }

    const sf = this.pairs.stability_flexibility;
    if (sf) {
      if (sf.value > 0.3) {
        directives.push('Be flexible: adapt readily to new information and revise your approach.');
      } else if (sf.value < -0.3) {
        directives.push('Maintain stability: stick with the current approach unless strong evidence warrants change.');
      }
    }

    return directives;
  }

  // ── History ───────────────────────────────────────────────────────

  _recordHistory(pairKey, value, trigger) {
    this.history.push({
      timestamp: Date.now(),
      pairKey,
      value,
      trigger,
    });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Get history for a specific pair, optionally filtered by time range.
   *
   * @param {string} pairKey
   * @param {object} [opts]
   * @param {number} [opts.since] - Timestamp lower bound
   * @param {number} [opts.limit] - Max entries to return
   * @returns {Array}
   */
  getHistory(pairKey, opts = {}) {
    let entries = this.history.filter(e => e.pairKey === pairKey);
    if (opts.since) {
      entries = entries.filter(e => e.timestamp >= opts.since);
    }
    if (opts.limit) {
      entries = entries.slice(-opts.limit);
    }
    return entries;
  }

  /**
   * Register a custom balance pair at runtime.
   *
   * @param {string} key
   * @param {object} definition - { positiveLabel, negativeLabel, value?, decayRate? }
   */
  registerPair(key, definition) {
    this.pairs[key] = {
      value: 0,
      momentum: 0,
      decayRate: 0.05,
      ...definition,
    };
    this.emit('pair_registered', { key, definition: this.pairs[key] });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { OpponentProcessor, DEFAULT_BALANCE_PAIRS };
