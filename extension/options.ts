// options.ts
// Paper tracker extension options page with full CRUD for URL patterns

import { loguru } from './utils/logger';

const logger = loguru.getLogger('options');

// Types for URL patterns
export interface SourcePattern {
  id: string;             // Unique identifier for this source
  name: string;           // Display name for this source
  urlPattern: string;     // Regex pattern to match URLs
  idRegex: string;        // Regex to extract paper ID
}

// Types for all settings
export interface Settings {
  githubRepo?: string;     // GitHub repository for storage
  githubToken?: string;    // GitHub access token
  sourcePatterns: SourcePattern[]; // URL patterns for paper detection
}

// Default URL patterns
const DEFAULT_PATTERNS: SourcePattern[] = [
  {
    id: 'arxiv',
    name: 'arXiv',
    urlPattern: 'arxiv\\.org\\/(abs|pdf)\\/([0-9]+\\.[0-9]+)',
    idRegex: 'arxiv\\.org\\/(abs|pdf)\\/([0-9]+\\.[0-9]+)'
  },
  {
    id: 'doi',
    name: 'DOI',
    urlPattern: 'doi\\.org\\/([\\w\\.\\-\\/]+)',
    idRegex: 'doi\\.org\\/([\\w\\.\\-\\/]+)'
  }
];

// Helper to set form values
function setFormValues(settings: Settings): void {
  // GitHub settings
  if (settings.githubRepo) {
    (document.getElementById('repo') as HTMLInputElement).value = settings.githubRepo;
  }
  if (settings.githubToken) {
    // Don't show the actual token, just indicate it's set
    (document.getElementById('token') as HTMLInputElement).placeholder = '••••••••••••••••••••••';
  }

  // Clear existing pattern containers
  const patternsContainer = document.getElementById('patterns-container');
  if (patternsContainer) {
    patternsContainer.innerHTML = '';
  }
  
  // Add URL patterns
  const patterns = settings.sourcePatterns || DEFAULT_PATTERNS;
  patterns.forEach((pattern, index) => {
    addPatternContainer(index, pattern);
  });
}

// Helper to create a new pattern container
function addPatternContainer(index: number, pattern?: SourcePattern): void {
  const patternsContainer = document.getElementById('patterns-container');
  if (!patternsContainer) return;
  
  // Get the template
  const template = document.getElementById('pattern-template') as HTMLTemplateElement;
  if (!template) return;
  
  // Clone the template
  const clone = document.importNode(template.content, true);
  
  // Set unique IDs and values
  const container = clone.querySelector('.pattern-container') as HTMLElement;
  if (!container) return;
  
  container.dataset.index = index.toString();
  
  // Find and set values for inputs
  const sourceIdInput = clone.querySelector(`#sourceId-$INDEX`) as HTMLInputElement;
  const sourceNameInput = clone.querySelector(`#sourceName-$INDEX`) as HTMLInputElement;
  const urlPatternInput = clone.querySelector(`#urlPattern-$INDEX`) as HTMLInputElement;
  const idRegexInput = clone.querySelector(`#idRegex-$INDEX`) as HTMLInputElement;
  
  if (!sourceIdInput || !sourceNameInput || !urlPatternInput || !idRegexInput) return;
  
  // Update IDs
  sourceIdInput.id = `sourceId-${index}`;
  sourceNameInput.id = `sourceName-${index}`;
  urlPatternInput.id = `urlPattern-${index}`;
  idRegexInput.id = `idRegex-${index}`;
  
  // Mark any existing patterns with data attribute
  if (pattern) {
    container.dataset.existing = 'true';
    
    // Store original ID for reference if pattern is edited
    container.dataset.originalId = pattern.id;
    
    // Set values
    sourceIdInput.value = pattern.id || '';
    sourceNameInput.value = pattern.name || '';
    urlPatternInput.value = pattern.urlPattern || '';
    idRegexInput.value = pattern.idRegex || '';
  }
  
  // Add remove button handler
  const removeButton = clone.querySelector('.remove-pattern') as HTMLButtonElement;
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      // If this is an existing pattern, confirm deletion
      if (container.dataset.existing === 'true') {
        if (confirm(`Are you sure you want to remove the "${sourceNameInput.value}" source?`)) {
          container.remove();
          updatePatternsDisplay();
        }
      } else {
        container.remove();
        updatePatternsDisplay();
      }
    });
  }
  
  // Add test button handlers
  const testUrlPatternButton = clone.querySelector('.test-url-pattern') as HTMLButtonElement;
  const urlPatternResult = clone.querySelector('.url-pattern-result') as HTMLElement;
  
  if (testUrlPatternButton && urlPatternResult) {
    testUrlPatternButton.addEventListener('click', () => {
      testUrlPattern(urlPatternInput.value, urlPatternResult);
    });
  }
  
  const testIdRegexButton = clone.querySelector('.test-id-regex') as HTMLButtonElement;
  const idRegexResult = clone.querySelector('.id-regex-result') as HTMLElement;
  
  if (testIdRegexButton && idRegexResult) {
    testIdRegexButton.addEventListener('click', () => {
      testIdRegex(idRegexInput.value, urlPatternInput.value, idRegexResult);
    });
  }
  
  // Append to container
  patternsContainer.appendChild(clone);
  
  // Update no patterns message
  updatePatternsDisplay();
}

// Test URL pattern against an example URL
function testUrlPattern(pattern: string, resultElement: HTMLElement): void {
  try {
    // Prompt for a test URL
    const testUrl = prompt('Enter a URL to test against this pattern:');
    if (!testUrl) return;
    
    // Create regex from pattern
    const regex = new RegExp(pattern);
    
    // Test the URL
    const match = regex.test(testUrl);
    
    // Display result
    if (match) {
      resultElement.textContent = `✅ URL matches pattern`;
      resultElement.className = 'validation-result valid';
    } else {
      resultElement.textContent = `❌ URL does not match pattern`;
      resultElement.className = 'validation-result invalid';
    }
  } catch (error) {
    resultElement.textContent = `❌ Invalid regex: ${error instanceof Error ? error.message : 'Unknown error'}`;
    resultElement.className = 'validation-result invalid';
  }
}

// Test ID regex against an example URL
function testIdRegex(idPattern: string, urlPattern: string, resultElement: HTMLElement): void {
  try {
    // Prompt for a test URL
    const testUrl = prompt('Enter a URL to test paper ID extraction:');
    if (!testUrl) return;
    
    // First check if URL matches the URL pattern
    let urlMatch = true;
    try {
      const urlRegex = new RegExp(urlPattern);
      urlMatch = urlRegex.test(testUrl);
    } catch (e) {
      urlMatch = false;
    }
    
    if (!urlMatch) {
      resultElement.textContent = `❌ URL doesn't match the URL pattern`;
      resultElement.className = 'validation-result invalid';
      return;
    }
    
    // Create regex from pattern
    const regex = new RegExp(idPattern);
    
    // Test the URL
    const match = testUrl.match(regex);
    
    // Display result
    if (match && match.length > 1) {
      resultElement.textContent = `✅ Extracted ID: "${match[1]}"`;
      resultElement.className = 'validation-result valid';
    } else if (match) {
      resultElement.textContent = `⚠️ Pattern matched but no capture group found. Add parentheses around the ID part.`;
      resultElement.className = 'validation-result invalid';
    } else {
      resultElement.textContent = `❌ URL does not match pattern`;
      resultElement.className = 'validation-result invalid';
    }
  } catch (error) {
    resultElement.textContent = `❌ Invalid regex: ${error instanceof Error ? error.message : 'Unknown error'}`;
    resultElement.className = 'validation-result invalid';
  }
}

// Update the no patterns message display
function updatePatternsDisplay(): void {
  const patternsContainer = document.getElementById('patterns-container');
  const noPatterns = document.getElementById('no-patterns');
  
  if (!patternsContainer || !noPatterns) return;
  
  const hasPatterns = patternsContainer.children.length > 0;
  
  noPatterns.style.display = hasPatterns ? 'none' : 'block';
}

// Helper to get form values
function getFormValues(): Settings {
  const githubRepo = (document.getElementById('repo') as HTMLInputElement).value.trim();
  const githubToken = (document.getElementById('token') as HTMLInputElement).value.trim();
  
  // Get all pattern containers
  const patternContainers = document.querySelectorAll('.pattern-container');
  const sourcePatterns: SourcePattern[] = [];
  
  patternContainers.forEach((container) => {
    const index = (container as HTMLElement).dataset.index;
    if (!index) return;
    
    const sourceId = (document.getElementById(`sourceId-${index}`) as HTMLInputElement).value.trim();
    const sourceName = (document.getElementById(`sourceName-${index}`) as HTMLInputElement).value.trim();
    const urlPattern = (document.getElementById(`urlPattern-${index}`) as HTMLInputElement).value.trim();
    const idRegex = (document.getElementById(`idRegex-${index}`) as HTMLInputElement).value.trim();
    
    if (sourceId && sourceName && urlPattern && idRegex) {
      sourcePatterns.push({
        id: sourceId,
        name: sourceName,
        urlPattern,
        idRegex
      });
    }
  });
  
  return {
    githubRepo: githubRepo || undefined,
    githubToken: githubToken || undefined,
    sourcePatterns: sourcePatterns.length > 0 ? sourcePatterns : DEFAULT_PATTERNS
  };
}

// Display status message
function showStatus(message: string, isError = false): void {
  const status = document.getElementById('status');
  if (!status) return;
  
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;

  // Clear status after 3 seconds if it's a success message
  if (!isError) {
    setTimeout(() => {
      if (status) {
        status.textContent = '';
        status.className = 'status';
      }
    }, 3000);
  }
}

// Validate settings before saving
async function validateSettings(settings: Settings): Promise<void> {
  // Validate repository format if provided
  if (settings.githubRepo && !/^[\w-]+\/[\w-]+$/.test(settings.githubRepo)) {
    throw new Error('Invalid repository format. Use username/repository');
  }

  // Validate the token by making a test API call if both token and repo are provided
  if (settings.githubRepo && settings.githubToken) {
    const response = await fetch(`https://api.github.com/repos/${settings.githubRepo}`, {
      headers: {
        'Authorization': `token ${settings.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!response.ok) {
      throw new Error('Invalid token or repository. Please check your credentials.');
    }
  }

  // Validate URL patterns
  if (settings.sourcePatterns.length === 0) {
    throw new Error('At least one URL pattern is required.');
  }
  
  // Check for duplicate IDs
  const idSet = new Set<string>();
  for (const pattern of settings.sourcePatterns) {
    if (idSet.has(pattern.id)) {
      throw new Error(`Duplicate source ID: ${pattern.id}. Each source must have a unique ID.`);
    }
    idSet.add(pattern.id);
  }
  
  // Validate each pattern
  for (const pattern of settings.sourcePatterns) {
    if (!pattern.id) {
      throw new Error('Each pattern must have a source ID.');
    }
    if (!pattern.name) {
      throw new Error('Each pattern must have a source name.');
    }
    if (!pattern.urlPattern) {
      throw new Error('Each pattern must have a URL pattern.');
    }
    if (!pattern.idRegex) {
      throw new Error('Each pattern must have a paper ID regex.');
    }
    
    // Check that patterns are valid regex
    try {
      new RegExp(pattern.urlPattern);
      new RegExp(pattern.idRegex);
    } catch (e) {
      throw new Error(`Invalid regular expression: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}

// Save settings
async function saveSettings(settings: Settings): Promise<void> {
  try {
    await chrome.storage.sync.set({
      githubRepo: settings.githubRepo,
      githubToken: settings.githubToken,
      sourcePatterns: settings.sourcePatterns
    });
    logger.info('Settings saved successfully');
  } catch (error) {
    logger.error('Error saving settings', error);
    throw error;
  }
}

// Load settings
async function loadSettings(): Promise<Settings> {
  try {
    const items = await chrome.storage.sync.get(['githubRepo', 'githubToken', 'sourcePatterns']);
    return {
      githubRepo: items.githubRepo,
      githubToken: items.githubToken,
      sourcePatterns: items.sourcePatterns || DEFAULT_PATTERNS
    };
  } catch (error) {
    logger.error('Error loading settings', error);
    return { sourcePatterns: DEFAULT_PATTERNS };
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load current settings
    const settings = await loadSettings();
    
    // Apply settings to form
    setFormValues(settings);
    
    // Update no patterns message
    updatePatternsDisplay();
    
    // Set up add pattern button
    const addPatternButton = document.getElementById('add-pattern');
    if (addPatternButton) {
      addPatternButton.addEventListener('click', () => {
        const index = document.querySelectorAll('.pattern-container').length;
        addPatternContainer(index);
      });
    }

    // Add save button handler
    const saveButton = document.getElementById('save');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        try {
          const settings = getFormValues();
          await validateSettings(settings);
          await saveSettings(settings);
          showStatus('Settings saved successfully!');
        } catch (error) {
          showStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
        }
      });
    }
    
    // Add export/import buttons
    const exportButton = document.getElementById('export-settings');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        exportSettings();
      });
    }
    
    const importButton = document.getElementById('import-settings');
    if (importButton) {
      importButton.addEventListener('click', () => {
        importSettings();
      });
    }
  } catch (error) {
    showStatus(`Error loading settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
});

// Export settings to JSON file
function exportSettings(): void {
  try {
    const settings = getFormValues();
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper-tracker-settings.json';
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    showStatus('Settings exported successfully!');
  } catch (error) {
    showStatus(`Error exporting settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
}

// Import settings from JSON file
function importSettings(): void {
  // Create file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const settings = JSON.parse(text) as Settings;
      
      // Validate imported settings
      await validateSettings(settings);
      
      // Apply settings to form
      setFormValues(settings);
      
      showStatus('Settings imported successfully! Click Save to apply changes.');
    } catch (error) {
      showStatus(`Error importing settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  });
  
  // Trigger file selection
  input.click();
}
