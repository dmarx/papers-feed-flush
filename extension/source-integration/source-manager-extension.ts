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
  
  // We need to maintain our own map of sources since we can't access the private property
  private customSources: Map<string, SourceIntegration> = new Map();
  
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
    // Unregister all custom sources
    for (const sourceId of this.customSourceIds) {
      this.customSources.delete(sourceId);
      // We can't directly remove from the parent's private sources map,
      // but we can override it with a null handler in the next step
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
      this.customSources.set(pattern.id, source);
      
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
  
  /**
   * Override getAllSources to combine built-in and custom sources
   */
  override getAllSources(): SourceIntegration[] {
    // Get parent sources
    const parentSources = super.getAllSources();
    
    // Filter out any sources that were overridden by custom ones
    const filteredSources = parentSources.filter(source => 
      !this.customSourceIds.has(source.id)
    );
    
    // Combine with our custom sources
    return [...filteredSources, ...this.customSources.values()];
  }
}
