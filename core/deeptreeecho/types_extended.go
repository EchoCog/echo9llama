package deeptreeecho

// Extended thought types for the integrated system
// These extend the original ThoughtType enum

const (
	// Original types (from autonomous.go)
	// ThoughtPerception, ThoughtReflection, ThoughtQuestion, ThoughtInsight,
	// ThoughtPlan, ThoughtMemory, ThoughtImagination

	// Extended types for 12-step EchoBeats integration
	ThoughtTypeReflective  = ThoughtReflection
	ThoughtTypeExploratory = ThoughtQuestion
	ThoughtTypeAnalytical  = ThoughtInsight
	ThoughtTypeCreative    = ThoughtImagination
	ThoughtTypeIntentional = ThoughtPlan
	ThoughtTypePredictive  = ThoughtPlan       // Maps to planning
	ThoughtTypeEmotional   = ThoughtPerception // Maps to perception
)

// CognitiveMode names the processing mode a thought was produced in. It is
// shared by the default build and the integrated-consciousness layer.
type CognitiveMode string

const (
	CognitiveModeExpressive CognitiveMode = "expressive"
	CognitiveModeReflective CognitiveMode = "reflective"
	CognitiveModeMeta       CognitiveMode = "meta"
)

func (cm CognitiveMode) String() string {
	return string(cm)
}

// Extended Thought fields via embedding
// Add EmotionalValence and Mode fields to existing Thought struct

type ExtendedThought struct {
	Thought
	EmotionalValence float64
	Mode             CognitiveMode
	Context          interface{} // Can hold ThoughtContext
}

// ConvertToExtended converts a basic Thought to ExtendedThought
func ConvertToExtended(t Thought) ExtendedThought {
	return ExtendedThought{
		Thought:          t,
		EmotionalValence: 0.0,
		Mode:             CognitiveModeExpressive,
	}
}

// ConvertToBasic converts ExtendedThought back to basic Thought
func ConvertToBasic(et ExtendedThought) Thought {
	return et.Thought
}
