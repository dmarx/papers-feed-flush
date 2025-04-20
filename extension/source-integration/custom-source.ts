// source-integration/custom-source.ts
// Custom source integration based on user-defined patterns

import { BaseSourceIntegration } from './base-source';
import { PaperMetadata } from '../papers/types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('custom-source');

/**
 * Source integration that uses user-defined patterns
 * We need to create a class that extends BaseSourceIntegration but allows
 * modifying the properties that are read-only in the base class
 */
export class CustomSourceIntegration extends BaseSourceIntegration {
  // Store the pattern strings
  private readonly _urlPatternString: string;
  private readonly _idRegexString: string;
  
  // Override the default properties with custom values
  constructor(
    sourceId: string,
    sourceName: string,
    urlPatternString: string,
    idRegexString: string
  ) {
    super();
    
    // Store our pattern strings
    this._urlPatternString = urlPatternString;
    this._idRegexString = idRegexString;
    
    // Create a new object to bypass readonly properties
    // We need to use Object.defineProperties to set readonly properties
    Object.defineProperties(this, {
      id: { value: sourceId },
      name: { value: sourceName },
      urlPatterns: { value: [new RegExp(urlPatternString, 'i')] },
      contentScriptMatches: { value: ['<all_urls>'] }
    });
    
    logger.debug(`Created custom source: ${sourceId} with pattern: ${urlPatternString}`);
  }
  
  /**
   * Extract paper ID using the provided regex pattern
   */
  override extractPaperId(url: string): string | null {
    try {
      const idRegex = new RegExp(this._idRegexString, 'i');
      const match = url.match(idRegex);
      
      if (match && match.length > 1) {
        // Use the first capture group as the paper ID
        return match[1];
      }
    } catch (error) {
      logger.error(`Error extracting paper ID for ${this.id}`, error);
    }
    
    // Fall back to the default implementation
    return super.extractPaperId(url);
  }
  
  /**
   * Extract metadata with some source-specific touches
   */
  override async extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null> {
    // First use the base extractor
    const baseMetadata = await super.extractMetadata(document, paperId);
    
    // If we got metadata, add source-specific info
    if (baseMetadata) {
      // Add source name to tags if not present
      if (!baseMetadata.tags.includes(this.name)) {
        baseMetadata.tags.push(this.name);
      }
      
      logger.debug(`Extracted metadata for ${this.id}:${paperId}`);
      return baseMetadata;
    }
    
    return null;
  }
}
