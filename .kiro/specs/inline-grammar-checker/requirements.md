# Requirements Document

## Introduction

This feature adds real-time grammar and writing assistance to Scramble, providing inline suggestions similar to Grammarly. Users will see underlined text with issues, hover tooltips with suggestions, and a floating status indicator showing real-time error counts. The system will analyze text as users type in any text input field across websites.

## Requirements

### Requirement 1

**User Story:** As a user typing in any text field, I want to see grammar and writing issues highlighted in real-time, so that I can identify and fix problems as I write.

#### Acceptance Criteria

1. WHEN a user types in any text input field (textarea, contenteditable, input) THEN the system SHALL analyze the text for grammar, spelling, and writing issues
2. WHEN issues are detected THEN the system SHALL display colored underlines beneath problematic text segments
3. WHEN text is modified THEN the system SHALL re-analyze the content within 500ms of the last keystroke
4. WHEN the user focuses on a different text field THEN the system SHALL transfer analysis to the new field
5. IF the text field is not supported (password fields, etc.) THEN the system SHALL NOT activate analysis

### Requirement 2

**User Story:** As a user, I want to see specific suggestions when I hover over underlined text, so that I can understand what the issue is and how to fix it.

#### Acceptance Criteria

1. WHEN a user hovers over underlined text THEN the system SHALL display a tooltip popup with issue details
2. WHEN the tooltip is displayed THEN it SHALL show the issue type, explanation, and suggested corrections
3. WHEN multiple suggestions are available THEN the system SHALL display them as clickable options
4. WHEN a user clicks a suggestion THEN the system SHALL replace the original text with the selected suggestion
5. WHEN a user clicks "Ignore" THEN the system SHALL remove the underline for that specific issue
6. WHEN the user moves the mouse away THEN the tooltip SHALL disappear after 200ms delay

### Requirement 3

**User Story:** As a user, I want to see a floating status indicator, so that I know the extension is active and can see the current error count.

#### Acceptance Criteria

1. WHEN the extension is active on a page with text fields THEN the system SHALL display a floating status widget
2. WHEN issues are detected THEN the widget SHALL show the total count of grammar and spelling errors
3. WHEN the user clicks the status widget THEN it SHALL expand to show a breakdown of issue types
4. WHEN no issues are present THEN the widget SHALL display a green checkmark or "0 issues" message
5. WHEN analysis is in progress THEN the widget SHALL show a loading animation
6. WHEN the user scrolls or resizes the page THEN the widget SHALL remain in a fixed position

### Requirement 4

**User Story:** As a user, I want the inline checker to work with different types of text editors, so that I can get assistance across various websites and applications.

#### Acceptance Criteria

1. WHEN encountering standard HTML textarea elements THEN the system SHALL provide full inline checking functionality
2. WHEN encountering contenteditable elements THEN the system SHALL adapt to rich text editing capabilities
3. WHEN encountering input[type="text"] fields THEN the system SHALL provide basic inline checking
4. WHEN encountering popular rich text editors (TinyMCE, CKEditor, etc.) THEN the system SHALL integrate appropriately
5. IF a text editor uses shadow DOM or iframe THEN the system SHALL attempt to inject into those contexts
6. WHEN text formatting is present (bold, italic, etc.) THEN the system SHALL preserve formatting while adding underlines

### Requirement 5

**User Story:** As a user, I want to configure the inline checker behavior, so that I can customize it to my preferences and needs.

#### Acceptance Criteria

1. WHEN accessing extension options THEN the user SHALL be able to enable/disable inline checking
2. WHEN configuring settings THEN the user SHALL be able to choose which issue types to highlight (grammar, spelling, style, etc.)
3. WHEN setting preferences THEN the user SHALL be able to adjust the analysis delay (100ms to 2000ms)
4. WHEN customizing appearance THEN the user SHALL be able to choose underline colors for different issue types
5. WHEN managing providers THEN the user SHALL be able to select which LLM provider to use for analysis
6. WHEN saving settings THEN the changes SHALL apply immediately to all active tabs

### Requirement 6

**User Story:** As a developer, I want the inline checker to have minimal performance impact, so that it doesn't slow down the user's browsing experience.

#### Acceptance Criteria

1. WHEN analyzing text THEN the system SHALL debounce analysis requests to avoid excessive API calls
2. WHEN processing large text blocks THEN the system SHALL chunk analysis to prevent UI blocking
3. WHEN multiple text fields are present THEN the system SHALL only analyze the currently focused field
4. WHEN the user is inactive THEN the system SHALL reduce background processing
5. WHEN memory usage exceeds thresholds THEN the system SHALL clean up cached analysis results
6. WHEN API rate limits are reached THEN the system SHALL queue requests and show appropriate status

### Requirement 7

**User Story:** As a user, I want the inline suggestions to be contextually relevant, so that I receive appropriate corrections for my writing style and intent.

#### Acceptance Criteria

1. WHEN analyzing text THEN the system SHALL consider the context and writing style
2. WHEN providing suggestions THEN the system SHALL offer multiple alternatives when appropriate
3. WHEN detecting repeated mistakes THEN the system SHALL learn and prioritize relevant suggestions
4. WHEN the text is in a specific domain (technical, casual, formal) THEN suggestions SHALL match the appropriate tone
5. WHEN custom prompts are configured THEN the system SHALL use them for analysis
6. WHEN the user accepts/rejects suggestions THEN the system SHALL improve future recommendations