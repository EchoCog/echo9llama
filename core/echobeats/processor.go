package echobeats

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"time"
)

// IdeaSource is a language model that can propose an idea, an action, or an
// expected outcome for the processor. Every piece of cognitive content the
// processor emits is either real observed state or text written by this model;
// nothing is picked from a fixed list.
type IdeaSource interface {
	// Propose answers a short first-person prompt. An empty answer means the
	// model had nothing to offer this step.
	Propose(prompt string) (string, error)
}

// ActionExecutor carries out an action the model proposed and reports what
// actually happened. Without one, actions are recorded as not executed.
type ActionExecutor func(action string) (result string, err error)

// DefaultPhaseProcessor provides default implementations for all cognitive terms
type DefaultPhaseProcessor struct {
	perceptionBuffer []interface{}
	memoryStore      map[string]interface{}
	ideaQueue        []string
	actionSequence   []string
	balanceState     float64
	previousBalance  float64
	consciousnessRef interface{} // Reference to consciousness system
	ideaSource       IdeaSource
	actionExecutor   ActionExecutor
}

// SetIdeaSource wires the model that writes ideas, actions and outcome
// estimates for the processor.
func (dpp *DefaultPhaseProcessor) SetIdeaSource(src IdeaSource) {
	dpp.ideaSource = src
}

// SetActionExecutor wires the function that really performs proposed actions.
func (dpp *DefaultPhaseProcessor) SetActionExecutor(exec ActionExecutor) {
	dpp.actionExecutor = exec
}

// NewDefaultPhaseProcessor creates a new default processor
func NewDefaultPhaseProcessor() *DefaultPhaseProcessor {
	return &DefaultPhaseProcessor{
		perceptionBuffer: make([]interface{}, 0, 10),
		memoryStore:      make(map[string]interface{}),
		ideaQueue:        make([]string, 0, 10),
		actionSequence:   make([]string, 0, 10),
		balanceState:     0.5,
		previousBalance:  0.5,
	}
}

// ProcessT1Perception processes perception (need vs capacity assessment)
func (dpp *DefaultPhaseProcessor) ProcessT1Perception(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T1_Perception,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  0.7,
	}

	if mode == Reflective {
		// Reflective mode: Assess needs vs capacities
		needs := dpp.assessNeeds()
		capacity := dpp.assessCapacity()
		gap := needs - capacity

		content := map[string]interface{}{
			"needs":    needs,
			"capacity": capacity,
			"gap":      gap,
			"type":     "need_assessment",
		}

		if gap > 0.3 {
			content["status"] = "capacity_deficit"
			log.Printf("🔍 T1R: Capacity deficit detected (gap: %.2f)", gap)
		} else if gap < -0.3 {
			content["status"] = "capacity_surplus"
			log.Printf("🔍 T1R: Capacity surplus detected (gap: %.2f)", gap)
		} else {
			content["status"] = "balanced"
		}

		stream.Content = content
	} else {
		// Expressive mode: Direct perception processing
		perception := dpp.capturePerception()
		stream.Content = map[string]interface{}{
			"perception": perception,
			"type":       "direct_perception",
		}
		log.Printf("👁️ T1E: Direct perception captured")
	}

	return stream, nil
}

// ProcessT2IdeaFormation processes idea formation
func (dpp *DefaultPhaseProcessor) ProcessT2IdeaFormation(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T2_IdeaFormation,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  0.8,
	}

	if mode == Expressive {
		// Expressive mode: Generate new idea (written by the model)
		idea := dpp.generateIdea()
		if idea == "" {
			stream.Content = map[string]interface{}{
				"type":   "no_idea",
				"status": "no_model_output",
			}
		} else {
			dpp.ideaQueue = append(dpp.ideaQueue, idea)

			stream.Content = map[string]interface{}{
				"idea":       idea,
				"queue_size": len(dpp.ideaQueue),
				"type":       "new_idea",
			}
			log.Printf("💡 T2E: New idea generated: %s", idea)
		}
	} else {
		// Reflective mode: Simulate idea outcomes
		if len(dpp.ideaQueue) > 0 {
			idea := dpp.ideaQueue[len(dpp.ideaQueue)-1]
			content := map[string]interface{}{
				"idea": idea,
				"type": "idea_simulation",
			}
			if simulation := dpp.simulateIdeaOutcome(idea); simulation != "" {
				content["simulation"] = simulation
				log.Printf("🔮 T2R: Simulated outcome for idea: %s", idea)
			} else {
				content["status"] = "no_model_output"
			}
			stream.Content = content
		} else {
			stream.Content = map[string]interface{}{
				"type":   "no_ideas",
				"status": "idle",
			}
		}
	}

	return stream, nil
}

// ProcessT4SensoryInput processes sensory input
func (dpp *DefaultPhaseProcessor) ProcessT4SensoryInput(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T4_SensoryInput,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  0.9,
	}

	if mode == Expressive {
		// Expressive mode: Process immediate sensory input
		sensory := dpp.captureSensoryInput()
		dpp.perceptionBuffer = append(dpp.perceptionBuffer, sensory)

		// Keep buffer size manageable
		if len(dpp.perceptionBuffer) > 10 {
			dpp.perceptionBuffer = dpp.perceptionBuffer[1:]
		}

		stream.Content = map[string]interface{}{
			"sensory_input": sensory,
			"buffer_size":   len(dpp.perceptionBuffer),
			"type":          "immediate_sensory",
		}
		log.Printf("👂 T4E: Sensory input captured")
	} else {
		// Reflective mode: Anticipate sensory patterns
		if len(dpp.perceptionBuffer) > 0 {
			pattern := dpp.detectSensoryPattern()
			stream.Content = map[string]interface{}{
				"pattern":     pattern,
				"buffer_size": len(dpp.perceptionBuffer),
				"type":        "sensory_pattern",
			}
			log.Printf("🔍 T4R: Sensory pattern computed: %v", pattern)
		} else {
			stream.Content = map[string]interface{}{
				"type":   "no_sensory_data",
				"status": "waiting",
			}
		}
	}

	return stream, nil
}

// ProcessT5ActionSequence processes action sequences
func (dpp *DefaultPhaseProcessor) ProcessT5ActionSequence(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T5_ActionSequence,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  0.8,
	}

	if mode == Expressive {
		// Expressive mode: Execute action sequence
		if len(dpp.actionSequence) > 0 {
			action := dpp.actionSequence[0]
			dpp.actionSequence = dpp.actionSequence[1:]

			result, executed := dpp.executeAction(action)

			stream.Content = map[string]interface{}{
				"action":    action,
				"result":    result,
				"executed":  executed,
				"remaining": len(dpp.actionSequence),
				"type":      "action_execution",
			}
			log.Printf("⚡ T5E: Action %s (executed=%v)", action, executed)
		} else {
			// Generate new action if queue empty (proposed by the model)
			action := dpp.generateAction()
			if action == "" {
				stream.Content = map[string]interface{}{
					"type":   "no_action",
					"status": "no_model_output",
				}
			} else {
				result, executed := dpp.executeAction(action)

				stream.Content = map[string]interface{}{
					"action":   action,
					"result":   result,
					"executed": executed,
					"type":     "spontaneous_action",
				}
				log.Printf("⚡ T5E: Spontaneous action %s (executed=%v)", action, executed)
			}
		}
	} else {
		// Reflective mode: Plan action sequence
		sequence := dpp.planActionSequence()
		dpp.actionSequence = append(dpp.actionSequence, sequence...)

		stream.Content = map[string]interface{}{
			"planned_sequence": sequence,
			"queue_size":       len(dpp.actionSequence),
			"type":             "action_planning",
		}
		log.Printf("📋 T5R: Action sequence planned (%d actions)", len(sequence))
	}

	return stream, nil
}

// ProcessT7MemoryEncoding processes memory encoding/retrieval
func (dpp *DefaultPhaseProcessor) ProcessT7MemoryEncoding(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T7_MemoryEncoding,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  0.85,
	}

	if mode == Reflective {
		// Reflective mode: Retrieve and integrate memories
		memories := dpp.retrieveRelevantMemories()

		stream.Content = map[string]interface{}{
			"memories":     memories,
			"memory_count": len(memories),
			"type":         "memory_retrieval",
		}
		log.Printf("🧠 T7R: Retrieved %d relevant memories", len(memories))
	} else {
		// Expressive mode: Encode new memory
		if len(dpp.perceptionBuffer) > 0 {
			memory := dpp.encodeMemory(dpp.perceptionBuffer[len(dpp.perceptionBuffer)-1])
			key := fmt.Sprintf("mem_%d", time.Now().UnixNano())
			dpp.memoryStore[key] = memory

			stream.Content = map[string]interface{}{
				"memory":      memory,
				"memory_key":  key,
				"total_count": len(dpp.memoryStore),
				"type":        "memory_encoding",
			}
			log.Printf("💾 T7E: Memory encoded (total: %d)", len(dpp.memoryStore))
		} else {
			stream.Content = map[string]interface{}{
				"type":   "no_content_to_encode",
				"status": "idle",
			}
		}
	}

	return stream, nil
}

// ProcessT8BalancedResponse processes balanced response integration
func (dpp *DefaultPhaseProcessor) ProcessT8BalancedResponse(mode Mode) (*CognitiveStream, error) {
	stream := &CognitiveStream{
		Term:      T8_BalancedResponse,
		Mode:      mode,
		Timestamp: time.Now(),
		Strength:  1.0, // Highest strength for integration
	}

	if mode == Expressive {
		// Expressive mode: Execute balanced integration
		balance := dpp.computeBalance()
		response := dpp.generateBalancedResponse(balance)

		dpp.previousBalance = dpp.balanceState
		dpp.balanceState = balance

		stream.Content = map[string]interface{}{
			"balance":       balance,
			"balance_level": response,
			"type":          "balanced_integration",
		}
		log.Printf("⚖️ T8E: Balanced response (balance: %.2f, level: %s)", balance, response)
	} else {
		// Reflective mode: Anticipate balance needs
		predictedBalance := dpp.predictBalanceNeeds()

		stream.Content = map[string]interface{}{
			"current_balance":   dpp.balanceState,
			"predicted_balance": predictedBalance,
			"adjustment_needed": predictedBalance - dpp.balanceState,
			"type":              "balance_prediction",
		}
		log.Printf("🔮 T8R: Balance prediction: %.2f → %.2f", dpp.balanceState, predictedBalance)
	}

	return stream, nil
}

// Helper methods
//
// Every helper below either reports real processor state or asks the wired
// model. None of them chooses from a fixed list of phrases, and none claims an
// action ran when it did not.

func (dpp *DefaultPhaseProcessor) assessNeeds() float64 {
	// Need rises with the amount of pending cognitive work.
	ideaNeed := float64(len(dpp.ideaQueue)) / 10.0
	actionNeed := float64(len(dpp.actionSequence)) / 10.0
	return (ideaNeed + actionNeed) / 2.0
}

func (dpp *DefaultPhaseProcessor) assessCapacity() float64 {
	// Capacity is the headroom left in the perception buffer.
	return 1.0 - float64(len(dpp.perceptionBuffer))/10.0
}

// propose asks the model for a short answer; "" when no model is wired or it
// produced nothing.
func (dpp *DefaultPhaseProcessor) propose(prompt string) string {
	if dpp.ideaSource == nil {
		return ""
	}
	answer, err := dpp.ideaSource.Propose(prompt)
	if err != nil {
		log.Printf("⚠️  idea source error: %v", err)
		return ""
	}
	return strings.TrimSpace(answer)
}

// stateSummary describes the processor's real state for the model.
func (dpp *DefaultPhaseProcessor) stateSummary() string {
	return fmt.Sprintf("pending ideas: %v; pending actions: %v; perception buffer: %d items; balance: %.2f",
		dpp.ideaQueue, dpp.actionSequence, len(dpp.perceptionBuffer), dpp.balanceState)
}

func (dpp *DefaultPhaseProcessor) capturePerception() map[string]interface{} {
	// A snapshot of what is actually observable right now.
	return map[string]interface{}{
		"perception_buffer": len(dpp.perceptionBuffer),
		"idea_queue":        len(dpp.ideaQueue),
		"action_queue":      len(dpp.actionSequence),
		"memory_count":      len(dpp.memoryStore),
		"balance":           dpp.balanceState,
		"observed_at":       time.Now(),
	}
}

func (dpp *DefaultPhaseProcessor) generateIdea() string {
	return dpp.propose(fmt.Sprintf(
		"Given my current state (%s), propose one new idea worth pursuing, in a single short phrase.",
		dpp.stateSummary()))
}

func (dpp *DefaultPhaseProcessor) simulateIdeaOutcome(idea string) string {
	return dpp.propose(fmt.Sprintf(
		"Given my current state (%s), what is the likely outcome of pursuing the idea %q? Answer in one short sentence.",
		dpp.stateSummary(), idea))
}

func (dpp *DefaultPhaseProcessor) captureSensoryInput() map[string]interface{} {
	// The only sensory data the default processor has is its own state change.
	return map[string]interface{}{
		"balance_delta": dpp.balanceState - dpp.previousBalance,
		"queue_total":   len(dpp.ideaQueue) + len(dpp.actionSequence),
		"captured_at":   time.Now(),
	}
}

func (dpp *DefaultPhaseProcessor) detectSensoryPattern() map[string]interface{} {
	// Pattern statistics computed from the real buffer contents.
	deltas := make([]float64, 0, len(dpp.perceptionBuffer))
	for _, item := range dpp.perceptionBuffer {
		if m, ok := item.(map[string]interface{}); ok {
			if d, ok := m["balance_delta"].(float64); ok {
				deltas = append(deltas, d)
			}
		}
	}
	rising, falling := 0, 0
	for _, d := range deltas {
		switch {
		case d > 0:
			rising++
		case d < 0:
			falling++
		}
	}
	return map[string]interface{}{
		"samples": len(deltas),
		"rising":  rising,
		"falling": falling,
		"steady":  len(deltas) - rising - falling,
	}
}

func (dpp *DefaultPhaseProcessor) generateAction() string {
	return dpp.propose(fmt.Sprintf(
		"Given my current state (%s), name one concrete action I should take next, in a single short phrase.",
		dpp.stateSummary()))
}

// executeAction performs the action through the wired executor. It never
// pretends an action ran: without an executor the result is empty and
// executed is false.
func (dpp *DefaultPhaseProcessor) executeAction(action string) (string, bool) {
	if dpp.actionExecutor == nil {
		return "", false
	}
	result, err := dpp.actionExecutor(action)
	if err != nil {
		return fmt.Sprintf("error: %v", err), false
	}
	return result, true
}

func (dpp *DefaultPhaseProcessor) planActionSequence() []string {
	// Plan from the ideas actually queued; the model orders them.
	if len(dpp.ideaQueue) == 0 {
		return nil
	}
	answer := dpp.propose(fmt.Sprintf(
		"Given my current state (%s), turn these ideas into an ordered list of concrete actions, one per line, no numbering: %s",
		dpp.stateSummary(), strings.Join(dpp.ideaQueue, "; ")))
	if answer == "" {
		return nil
	}
	sequence := make([]string, 0)
	for _, line := range strings.Split(answer, "\n") {
		line = strings.TrimSpace(strings.TrimLeft(line, "-*0123456789. "))
		if line != "" {
			sequence = append(sequence, line)
		}
	}
	return sequence
}

func (dpp *DefaultPhaseProcessor) retrieveRelevantMemories() []string {
	// The most recent memories that were really stored.
	keys := make([]string, 0, len(dpp.memoryStore))
	for key := range dpp.memoryStore {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	if len(keys) > 4 {
		keys = keys[len(keys)-4:]
	}
	return keys
}

func (dpp *DefaultPhaseProcessor) encodeMemory(content interface{}) map[string]interface{} {
	return map[string]interface{}{
		"content":    content,
		"timestamp":  time.Now(),
		"importance": dpp.balanceState,
	}
}

func (dpp *DefaultPhaseProcessor) computeBalance() float64 {
	// Compute balance based on various factors
	perceptionLoad := float64(len(dpp.perceptionBuffer)) / 10.0
	ideaLoad := float64(len(dpp.ideaQueue)) / 10.0
	actionLoad := float64(len(dpp.actionSequence)) / 10.0

	totalLoad := (perceptionLoad + ideaLoad + actionLoad) / 3.0

	// Balance is inverse of load (lower load = higher balance)
	return 1.0 - totalLoad
}

// generateBalancedResponse classifies the computed balance; it is a data
// label, not a sentence spoken on anyone's behalf.
func (dpp *DefaultPhaseProcessor) generateBalancedResponse(balance float64) string {
	if balance > 0.7 {
		return "high"
	} else if balance > 0.4 {
		return "moderate"
	}
	return "low"
}

func (dpp *DefaultPhaseProcessor) predictBalanceNeeds() float64 {
	// Extrapolate the observed trend rather than inventing one.
	trend := dpp.balanceState - dpp.previousBalance
	predicted := dpp.balanceState + trend

	// Clamp to [0, 1]
	if predicted < 0 {
		predicted = 0
	} else if predicted > 1 {
		predicted = 1
	}

	return predicted
}
