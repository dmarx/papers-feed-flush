// utils/logger.ts
// Logging utility wrapping loguru
/**
 * Logger class for consistent logging throughout the extension
 */
class Logger {
    constructor(module) {
        this.module = module;
    }
    /**
     * Log debug message
     */
    debug(message, data) {
        console.debug(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log info message
     */
    info(message, data) {
        console.info(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log warning message
     */
    warning(message, data) {
        console.warn(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log error message
     */
    error(message, data) {
        console.error(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
}
/**
 * Loguru mock for browser extension use
 */
class LoguruMock {
    /**
     * Get logger for a module
     */
    getLogger(module) {
        return new Logger(module);
    }
}
// Export singleton instance
const loguru = new LoguruMock();

// options.ts
const logger = loguru.getLogger('options');
// Default URL patterns
const DEFAULT_PATTERNS = [
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
// Current state
let currentPatterns = [];
let editingIndex = null;
// Helper to set form values
function setFormValues(settings) {
    // GitHub settings
    if (settings.githubRepo) {
        document.getElementById('repo').value = settings.githubRepo;
    }
    if (settings.githubToken) {
        // Don't show the actual token, just indicate it's set
        document.getElementById('token').placeholder = '••••••••••••••••••••••';
    }
    // Store patterns and populate table
    currentPatterns = settings.sourcePatterns || DEFAULT_PATTERNS;
    refreshPatternsTable();
}
// Helper to refresh the patterns table
function refreshPatternsTable() {
    const tbody = document.getElementById('patterns-tbody');
    const noPatterns = document.getElementById('no-patterns');
    const patternsTable = document.getElementById('patterns-table');
    if (!tbody || !noPatterns || !patternsTable)
        return;
    // Clear the table
    tbody.innerHTML = '';
    // Show/hide "no patterns" message
    if (currentPatterns.length === 0) {
        noPatterns.style.display = 'block';
        patternsTable.style.display = 'none';
    }
    else {
        noPatterns.style.display = 'none';
        patternsTable.style.display = 'table';
        // Add each pattern to the table
        currentPatterns.forEach((pattern, index) => {
            const row = document.createElement('tr');
            // Source ID
            const idCell = document.createElement('td');
            idCell.textContent = pattern.id;
            row.appendChild(idCell);
            // Source Name
            const nameCell = document.createElement('td');
            nameCell.textContent = pattern.name;
            row.appendChild(nameCell);
            // URL Pattern
            const urlPatternCell = document.createElement('td');
            urlPatternCell.textContent = pattern.urlPattern;
            row.appendChild(urlPatternCell);
            // Paper ID Regex
            const idRegexCell = document.createElement('td');
            idRegexCell.textContent = pattern.idRegex;
            row.appendChild(idRegexCell);
            // Actions
            const actionsCell = document.createElement('td');
            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'action-btn';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any form submission
                editPattern(index);
            });
            actionsCell.appendChild(editButton);
            // Space
            actionsCell.appendChild(document.createTextNode(' '));
            // Remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'action-btn';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any form submission
                removePattern(index);
            });
            actionsCell.appendChild(removeButton);
            row.appendChild(actionsCell);
            tbody.appendChild(row);
        });
    }
}
// Function to edit a pattern
function editPattern(index) {
    const pattern = currentPatterns[index];
    // Populate form with pattern values
    document.getElementById('sourceId').value = pattern.id;
    document.getElementById('sourceName').value = pattern.name;
    document.getElementById('urlPattern').value = pattern.urlPattern;
    document.getElementById('idRegex').value = pattern.idRegex;
    // Set editing state
    editingIndex = index;
    // Change add button to save
    const addButton = document.getElementById('add-pattern');
    if (addButton) {
        addButton.textContent = 'Save Changes';
    }
}
// Function to remove a pattern
function removePattern(index) {
    if (confirm(`Are you sure you want to remove "${currentPatterns[index].name}"?`)) {
        // Remove the pattern from the array
        currentPatterns.splice(index, 1);
        // Refresh the table
        refreshPatternsTable();
        // Clear form if we were editing this pattern
        if (editingIndex === index) {
            clearPatternForm();
        }
        else if (editingIndex !== null && editingIndex > index) {
            // Adjust editingIndex when a pattern before the current one is removed
            editingIndex--;
        }
        showStatus(`Pattern removed successfully`);
    }
}
// Function to add or update a pattern
function addOrUpdatePattern() {
    // Get values from form
    const sourceId = document.getElementById('sourceId').value.trim();
    const sourceName = document.getElementById('sourceName').value.trim();
    const urlPattern = document.getElementById('urlPattern').value.trim();
    const idRegex = document.getElementById('idRegex').value.trim();
    // Validate input
    if (!sourceId || !sourceName || !urlPattern || !idRegex) {
        showStatus('All fields are required', true);
        return;
    }
    // Try to create RegExp objects to validate patterns
    try {
        new RegExp(urlPattern);
        new RegExp(idRegex);
    }
    catch (e) {
        showStatus(`Invalid regular expression: ${e instanceof Error ? e.message : 'Unknown error'}`, true);
        return;
    }
    // Check for duplicate ID (except when editing)
    const hasDuplicate = currentPatterns.some((pattern, index) => pattern.id === sourceId && index !== editingIndex);
    if (hasDuplicate) {
        showStatus(`Source ID "${sourceId}" is already used. IDs must be unique.`, true);
        return;
    }
    // Create pattern object
    const pattern = {
        id: sourceId,
        name: sourceName,
        urlPattern,
        idRegex
    };
    // Add or update
    if (editingIndex !== null) {
        // Update existing
        currentPatterns[editingIndex] = pattern;
        // Reset editing state
        editingIndex = null;
        // Reset button text
        const addButton = document.getElementById('add-pattern');
        if (addButton) {
            addButton.textContent = 'Add Pattern';
        }
        showStatus(`Pattern "${sourceName}" updated`);
    }
    else {
        // Add new
        currentPatterns.push(pattern);
        showStatus(`Pattern "${sourceName}" added`);
    }
    // Refresh table and clear form
    refreshPatternsTable();
    clearPatternForm();
}
// Clear the pattern form
function clearPatternForm() {
    document.getElementById('sourceId').value = '';
    document.getElementById('sourceName').value = '';
    document.getElementById('urlPattern').value = '';
    document.getElementById('idRegex').value = '';
    // Reset editing state
    editingIndex = null;
    // Reset button text
    const addButton = document.getElementById('add-pattern');
    if (addButton) {
        addButton.textContent = 'Add Pattern';
    }
}
// Helper to get form values
function getFormValues() {
    const githubRepo = document.getElementById('repo').value.trim();
    const githubToken = document.getElementById('token').value.trim();
    return {
        githubRepo: githubRepo || undefined,
        githubToken: githubToken || undefined,
        sourcePatterns: currentPatterns.length > 0 ? currentPatterns : DEFAULT_PATTERNS
    };
}
// Display status message
function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    if (!status)
        return;
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
async function validateSettings(settings) {
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
    const idSet = new Set();
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
        }
        catch (e) {
            throw new Error(`Invalid regular expression: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
}
// Save settings
async function saveSettings(settings) {
    try {
        await chrome.storage.sync.set({
            githubRepo: settings.githubRepo,
            githubToken: settings.githubToken,
            sourcePatterns: settings.sourcePatterns
        });
        logger.info('Settings saved successfully');
    }
    catch (error) {
        logger.error('Error saving settings', error);
        throw error;
    }
}
// Load settings
async function loadSettings() {
    try {
        const items = await chrome.storage.sync.get(['githubRepo', 'githubToken', 'sourcePatterns']);
        return {
            githubRepo: items.githubRepo,
            githubToken: items.githubToken,
            sourcePatterns: items.sourcePatterns || DEFAULT_PATTERNS
        };
    }
    catch (error) {
        logger.error('Error loading settings', error);
        return { sourcePatterns: DEFAULT_PATTERNS };
    }
}
// Export settings to JSON file
function exportSettings() {
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
    }
    catch (error) {
        showStatus(`Error exporting settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
}
// Import settings from JSON file
function importSettings() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            // Validate imported settings
            await validateSettings(settings);
            // Update current patterns and refresh table
            currentPatterns = settings.sourcePatterns;
            refreshPatternsTable();
            // Apply GitHub settings
            if (settings.githubRepo) {
                document.getElementById('repo').value = settings.githubRepo;
            }
            if (settings.githubToken) {
                document.getElementById('token').value = settings.githubToken;
            }
            showStatus('Settings imported successfully! Click Save to apply changes.');
        }
        catch (error) {
            showStatus(`Error importing settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
        }
    });
    // Trigger file selection
    input.click();
}
// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load current settings
        const settings = await loadSettings();
        // Apply settings to form
        setFormValues(settings);
        // Set up add/edit pattern button
        const addButton = document.getElementById('add-pattern');
        if (addButton) {
            addButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any form submission
                addOrUpdatePattern();
            });
        }
        // Add save button handler
        const saveButton = document.getElementById('save');
        if (saveButton) {
            saveButton.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent any form submission
                try {
                    const settings = getFormValues();
                    await validateSettings(settings);
                    await saveSettings(settings);
                    showStatus('Settings saved successfully!');
                }
                catch (error) {
                    showStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
                }
            });
        }
        // Add export/import buttons
        const exportButton = document.getElementById('export-settings');
        if (exportButton) {
            exportButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any form submission
                exportSettings();
            });
        }
        const importButton = document.getElementById('import-settings');
        if (importButton) {
            importButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any form submission
                importSettings();
            });
        }
    }
    catch (error) {
        showStatus(`Error loading settings: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
//# sourceMappingURL=options.bundle.js.map
