
import unittest
from backend.ml_engine.agent_orchestrator import AgentOrchestrator
from backend.api.voice import clean_text_for_speech

class TestCleaning(unittest.TestCase):
    def setUp(self):
        self.orchestrator = AgentOrchestrator()

    def test_orchestrator_cleaning(self):
        raw_report = "<think>I need to analyze revenue.</think>## Strategic Analysis\nRevenue is up by 10%."
        cleaned = self.orchestrator._clean_response(raw_report)
        self.assertEqual(cleaned, "## Strategic Analysis\nRevenue is up by 10%.")

        raw_cut_off = "Partial advice.<think>I am thinking..."
        cleaned_cut_off = self.orchestrator._clean_response(raw_cut_off)
        self.assertEqual(cleaned_cut_off, "Partial advice.")

    def test_voice_cleaning(self):
        # Text with markdown and thinking tags
        text = "### Growth Plan\n**Step 1:** <think>Reasoning here</think> Buy more stock. [[TAB:DATA]]"
        cleaned = clean_text_for_speech(text)
        
        # 1. Heading '### ' -> '. ' or removed
        # 2. Bold '**' -> removed
        # 3. Thinking '<think>' -> removed
        # 4. Nav Tags '[[' -> removed
        
        self.assertNotIn("<think>", cleaned)
        self.assertNotIn("Reasoning", cleaned)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("[[", cleaned)
        print(f"Cleaned for speech: {cleaned}")

if __name__ == '__main__':
    unittest.main()
