// options.ts
// Paper tracker extension options page with direct JSON editing

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

// Load settings and populate the form
async function loadSettingsIntoForm(): Promise<void> {
  try {
    const settings = await loadSettings();
    
    // Set GitHub fields
    if (settings.githubRepo) {
      (document.getElementById('repo') as HTMLInputElement).value = settings.githubRepo;
    }
    
    if (settings.githubToken) {
      // Just set the placeholder to indicate a token is set
      (document.getElementById('token') as HTMLInputElement).placeholder = '••••••••••••••••••••••';
    }
    
    // Set patterns JSON
    const patternsElem = document.getElementById('patterns') as HTMLTextAreaElement;
    if (patternsElem) {
      patternsElem.value = JSON.stringify(settings.sourcePatterns, null, 2);
    }
    
    logger.debug('Settings loaded into form');
  } catch (error) {
    showStatus(`Error loading settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
}

// Save settings from the form
async function saveSettingsFromForm(): Promise<void> {
  try {
    // Get GitHub settings
    const githubRepo = (document.getElementById('repo') as HTMLInputElement).value.trim();
    const githubToken = (document.getElementById('token') as HTMLInputElement).value.trim();
    
    // Get patterns JSON
    const patternsText = (document.getElementById('patterns') as HTMLTextAreaElement).value.trim();
    let sourcePatterns: SourcePattern[] = [];
    
    try {
      // Parse patterns JSON
      sourcePatterns = JSON.parse(patternsText) as SourcePattern[];
    } catch (error) {
      throw new Error(`Invalid JSON format for patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Create settings object
    const settings: Settings = {
      githubRepo: githubRepo || undefined,
      githubToken: githubToken || undefined,
      sourcePatterns: sourcePatterns.length > 0 ? sourcePatterns : DEFAULT_PATTERNS
    };
    
    // Validate settings
    await validateSettings(settings);
    
    // Save settings
    await saveSettings(settings);
    
    showStatus('Settings saved successfully!');
  } catch (error) {
    showStatus(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
}

// Load settings from storage
async function loadSettings(): Promise<Settings> {
  try {
    const items = await chrome.storage.sync.get(['githubRepo', 'githubToken', 'sourcePatterns']);
    
    return {
      githubRepo: items.githubRepo,
      githubToken: items.githubToken,
      sourcePatterns: items.sourcePatterns || DEFAULT_PATTERNS
    };
  } catch (error) {
    logger.error('Error loading settings from storage', error);
    return { sourcePatterns: DEFAULT_PATTERNS };
  }
}

// Save settings to storage
async function saveSettings(settings: Settings): Promise<void> {
  try {
    await chrome.storage.sync.set({
      githubRepo: settings.githubRepo,
      githubToken: settings.githubToken,
      sourcePatterns: settings.sourcePatterns
    });
    
    logger.info('Settings saved to storage successfully');
  } catch (error) {
    logger.error('Error saving settings to storage', error);
    throw error;
  }
}

// Validate settings
async function validateSettings(settings: Settings): Promise<void> {
  // Validate GitHub repo format
  if (settings.githubRepo && !/^[\w-]+\/[\w-]+$/.test(settings.githubRepo)) {
    throw new Error('Invalid repository format. Use username/repository');
  }
  
  // Validate GitHub token by testing API if both token and repo are provided
  if (settings.githubRepo && settings.githubToken) {
    try {
      const response = await fetch(`https://api.github.com/repos/${settings.githubRepo}`, {
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Invalid GitHub token or repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Validate source patterns
  if (!Array.isArray(settings.sourcePatterns) || settings.sourcePatterns.length === 0) {
    throw new Error('At least one URL pattern is required');
  }
  
  // Check for duplicate IDs
  const idSet = new Set<string>();
  
  for (const pattern of settings.sourcePatterns) {
    // Check required fields
    if (!pattern.id) {
      throw new Error('Each pattern must have an ID');
    }
    if (!pattern.name) {
      throw new Error('Each pattern must have a name');
    }
    if (!pattern.urlPattern) {
      throw new Error('Each pattern must have a URL pattern');
    }
    if (!pattern.idRegex) {
      throw new Error('Each pattern must have a paper ID regex');
    }
    
    // Check for duplicate IDs
    if (idSet.has(pattern.id)) {
      throw new Error(`Duplicate source ID: ${pattern.id}. Each source must have a unique ID.`);
    }
    idSet.add(pattern.id);
    
    // Validate regex patterns
    try {
      new RegExp(pattern.urlPattern);
    } catch (error) {
      throw new Error(`Invalid URL pattern for ${pattern.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      new RegExp(pattern.idRegex);
    } catch (error) {
      throw new Error(`Invalid paper ID regex for ${pattern.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Show status message
function showStatus(message: string, isError = false): void {
  const status = document.getElementById('status');
  if (!status) return;
  
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  
  // Clear message after 3 seconds if it's a success
  if (!isError) {
    setTimeout(() => {
      if (status) {
        status.textContent = '';
        status.className = 'status';
      }
    }, 3000);
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettingsIntoForm();
  
  // Set up save button handler
  document.getElementById('save')?.addEventListener('click', saveSettingsFromForm);
});
