# FIX V6

## Audio
- English playback now prioritizes a natural US English female neural/device voice when available (Microsoft Jenny/Aria Natural), then remote Google TTS MP3, then Google Dictionary MP3, then Free Dictionary API/device fallback.
- Vietnamese playback now uses remote Google TTS MP3 first, with chunking for long text, then device `vi-VN` fallback.
- Note: a static GitHub Pages site cannot guarantee a speaker's literal age (e.g. exactly 30 years old) or force ChatGPT's internal voice. The app therefore encodes the requested target as a preference for a natural adult female US voice, prioritizing Jenny/Aria Neural when the device exposes it.

## Vocabulary List
- List pages show only the currently selected class.
- The previous all-10-class display has been removed from the class list view.
- Grid cards use larger illustrations.
- Long/list rows keep compact illustrations.
- Tapping a vocabulary item opens a large centered detail popup.
- Popup stays open until the user taps outside the popup.
- Detail popup includes English and Vietnamese audio buttons.

## Curriculum note
The MOET English curriculum specifies vocabulary totals by educational level rather than an exact number for every individual grade:
- Primary: approximately 600–700 words.
- Lower secondary: approximately 800–1000 additional words, excluding primary vocabulary.
The current project's 100-word dataset should therefore be treated as an MVP content set, not as a claim of full MOET coverage. Do not label it as meeting the official totals until the vocabulary dataset is expanded and curated against the curriculum/textbooks.
