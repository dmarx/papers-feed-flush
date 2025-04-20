// source-integration/custom-source.ts
// Custom source integration based on user-defined patterns

import { BaseSourceIntegration } from './base-source';
import { PaperMetadata } from '../papers/types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('custom-source');

/**
 * Source integration that uses user-defined patterns
 */
export class CustomSourceIntegration extends BaseSourceIntegration {
  // Override the default properties with custom values
  constructor(
    id: string,
    name: string,
    urlPatternString: string,
    private idRegexString: string
  ) {
    super();
    this.id = id;
    this.name = name;
    
    // Create RegExp from string patterns
    this.urlPatterns = [new RegExp(urlPatternString, 'i')];
    
    // Content script matches for all URLs
    this.contentScriptMatches = ['<all_urls>'];
    
    logger.debug(`Created custom source: ${id} with pattern: ${urlPatternString}`);
  }
  
  /**
   * Extract paper ID using the provided regex pattern
   */
  override extractPaperId(url: string): string | null {
    try {
      const idRegex = new RegExp(this.idRegexString, 'i');
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
