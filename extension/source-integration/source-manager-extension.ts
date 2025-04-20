// source-integration/source-manager-extension.ts
// Extension to SourceIntegrationManager to support user-defined patterns

import { SourceIntegrationManager } from './source-manager';
import { SourceIntegration } from './types';
import { loguru } from '../utils/logger';
import { CustomSourceIntegration } from './custom-source';

const logger = loguru.getLogger('source-manager-extension');

// Source pattern definition from settings
export interface SourcePattern {
  id: string;             // Unique identifier for this source
  name: string;           // Display name for this source
  urlPattern: string;     // Regex pattern to match URLs
  idRegex: string;        // Regex to extract paper ID
}

/**
 * Extends SourceIntegrationManager with user-defined pattern support
 */
export class ExtendedSourceManager extends SourceIntegrationManager {
  // Default patterns to use if none are saved
  private defaultPatterns: SourcePattern[] = [];
  
  // Track which sources are custom (user-defined)
  private customSourceIds: Set<string> = new Set();
  
  constructor(defaultPatterns: SourcePattern[] = []) {
    super();
    this.defaultPatterns = defaultPatterns;
    logger.info('Extended source manager initialized');
  }
  
  /**
   * Load patterns from storage and register them
   */
  async loadPatternsFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get('sourcePatterns');
      const patterns = result.sourcePatterns || this.defaultPatterns;
      
      // Clear existing custom sources
      this.clearCustomSources();
      
      // Register all patterns
      for (const pattern of patterns) {
        this.registerCustomSource(pattern);
      }
      
      logger.info(`Loaded ${patterns.length} patterns from storage`);
    } catch (error) {
      logger.error('Error loading patterns from storage', error);
      
      // Register default patterns as fallback
      for (const pattern of this.defaultPatterns) {
        this.registerCustomSource(pattern);
      }
    }
  }
  
  /**
   * Clear all custom sources
   */
  clearCustomSources(): void {
    // Remove all custom sources from registry
    for (const sourceId of this.customSourceIds) {
      this.sources.delete(sourceId);
      logger.debug(`Removed custom source: ${sourceId}`);
    }
    
    // Clear the set
    this.customSourceIds.clear();
  }
  
  /**
   * Register a custom source from a pattern
   */
  registerCustomSource(pattern: SourcePattern): void {
    try {
      // Create a source integration from pattern
      const source = new CustomSourceIntegration(
        pattern.id,
        pattern.name,
        pattern.urlPattern,
        pattern.idRegex
      );
      
      // Track this as a custom source
      this.customSourceIds.add(pattern.id);
      
      // Register the source
      this.registerSource(source);
      logger.debug(`Registered custom source: ${pattern.id}`);
    } catch (error) {
      logger.error(`Failed to register custom source: ${pattern.id}`, error);
    }
  }
  
  /**
   * Handle storage changes
   */
  async handleStorageChanges(changes: { [key: string]: chrome.storage.StorageChange }): Promise<void> {
    if (changes.sourcePatterns) {
      logger.info('Source patterns changed, updating sources');
      
      // Clear existing custom sources
      this.clearCustomSources();
      
      // Register new patterns
      const patterns = changes.sourcePatterns.newValue || [];
      for (const pattern of patterns) {
        this.registerCustomSource(pattern);
      }
      
      logger.info(`Updated ${patterns.length} source patterns`);
    }
  }
}
