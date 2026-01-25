/**
 * Document Chunker
 * Split documents into semantically meaningful chunks for embedding
 */

export interface Chunk {
  id: string;
  content: string;
  index: number;
  totalChunks: number;
  metadata: {
    sourceId: string;
    startChar: number;
    endChar: number;
    type: 'paragraph' | 'section' | 'sentence';
  };
}

export interface ChunkerOptions {
  maxChunkSize?: number;      // Maximum characters per chunk (default: 1000)
  minChunkSize?: number;      // Minimum characters per chunk (default: 100)
  overlap?: number;           // Character overlap between chunks (default: 100)
  strategy?: 'paragraph' | 'sentence' | 'fixed'; // Chunking strategy
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  maxChunkSize: 1000,
  minChunkSize: 100,
  overlap: 100,
  strategy: 'paragraph',
};

/**
 * Split text into chunks based on strategy
 */
export function chunkText(
  text: string,
  sourceId: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  switch (opts.strategy) {
    case 'paragraph':
      return chunkByParagraph(text, sourceId, opts);
    case 'sentence':
      return chunkBySentence(text, sourceId, opts);
    case 'fixed':
      return chunkByFixedSize(text, sourceId, opts);
    default:
      return chunkByParagraph(text, sourceId, opts);
  }
}

/**
 * Chunk markdown documents with header awareness
 */
export function chunkMarkdown(
  markdown: string,
  sourceId: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];
  
  // Split by headers (## or ###)
  const sections = markdown.split(/(?=^#{2,3}\s)/m);
  let currentPosition = 0;
  
  for (const section of sections) {
    if (section.trim().length < opts.minChunkSize) {
      currentPosition += section.length;
      continue;
    }
    
    // If section is too large, split further by paragraphs
    if (section.length > opts.maxChunkSize) {
      const subChunks = chunkByParagraph(section, sourceId, opts);
      for (const subChunk of subChunks) {
        subChunk.metadata.startChar += currentPosition;
        subChunk.metadata.endChar += currentPosition;
        chunks.push(subChunk);
      }
    } else {
      chunks.push({
        id: `${sourceId}-chunk-${chunks.length}`,
        content: section.trim(),
        index: chunks.length,
        totalChunks: 0, // Will be updated later
        metadata: {
          sourceId,
          startChar: currentPosition,
          endChar: currentPosition + section.length,
          type: 'section',
        },
      });
    }
    
    currentPosition += section.length;
  }
  
  // Update total chunks count
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }
  
  return chunks;
}

/**
 * Chunk JSON documents by extracting text fields
 */
export function chunkJSON(
  json: Record<string, unknown>,
  sourceId: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const textContent = extractTextFromJSON(json);
  return chunkText(textContent, sourceId, options);
}

/**
 * Extract all text content from a JSON object
 */
function extractTextFromJSON(obj: unknown, path = ''): string {
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, index) => extractTextFromJSON(item, `${path}[${index}]`)).join('\n');
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const text = extractTextFromJSON(value, `${path}.${key}`);
      if (text.trim()) {
        parts.push(text);
      }
    }
    return parts.join('\n');
  }
  
  return '';
}

/**
 * Chunk by paragraphs (double newlines)
 */
function chunkByParagraph(
  text: string,
  sourceId: string,
  opts: Required<ChunkerOptions>
): Chunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let currentStart = 0;
  let position = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      position += paragraph.length + 2; // +2 for \n\n
      continue;
    }
    
    if (currentChunk.length + trimmed.length + 2 <= opts.maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    } else {
      // Save current chunk if it meets minimum size
      if (currentChunk.length >= opts.minChunkSize) {
        chunks.push({
          id: `${sourceId}-chunk-${chunks.length}`,
          content: currentChunk,
          index: chunks.length,
          totalChunks: 0,
          metadata: {
            sourceId,
            startChar: currentStart,
            endChar: position,
            type: 'paragraph',
          },
        });
      }
      
      currentChunk = trimmed;
      currentStart = position;
    }
    
    position += paragraph.length + 2;
  }
  
  // Don't forget the last chunk
  if (currentChunk.length >= opts.minChunkSize) {
    chunks.push({
      id: `${sourceId}-chunk-${chunks.length}`,
      content: currentChunk,
      index: chunks.length,
      totalChunks: 0,
      metadata: {
        sourceId,
        startChar: currentStart,
        endChar: position,
        type: 'paragraph',
      },
    });
  }
  
  // Update total chunks count
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }
  
  return chunks;
}

/**
 * Chunk by sentences
 */
function chunkBySentence(
  text: string,
  sourceId: string,
  opts: Required<ChunkerOptions>
): Chunk[] {
  // Split by sentence-ending punctuation followed by space or newline
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let currentStart = 0;
  let position = 0;
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      position += sentence.length + 1;
      continue;
    }
    
    if (currentChunk.length + trimmed.length + 1 <= opts.maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    } else {
      if (currentChunk.length >= opts.minChunkSize) {
        chunks.push({
          id: `${sourceId}-chunk-${chunks.length}`,
          content: currentChunk,
          index: chunks.length,
          totalChunks: 0,
          metadata: {
            sourceId,
            startChar: currentStart,
            endChar: position,
            type: 'sentence',
          },
        });
      }
      
      currentChunk = trimmed;
      currentStart = position;
    }
    
    position += sentence.length + 1;
  }
  
  if (currentChunk.length >= opts.minChunkSize) {
    chunks.push({
      id: `${sourceId}-chunk-${chunks.length}`,
      content: currentChunk,
      index: chunks.length,
      totalChunks: 0,
      metadata: {
        sourceId,
        startChar: currentStart,
        endChar: position,
        type: 'sentence',
      },
    });
  }
  
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }
  
  return chunks;
}

/**
 * Chunk by fixed size with overlap
 */
function chunkByFixedSize(
  text: string,
  sourceId: string,
  opts: Required<ChunkerOptions>
): Chunk[] {
  const chunks: Chunk[] = [];
  let position = 0;
  
  while (position < text.length) {
    const end = Math.min(position + opts.maxChunkSize, text.length);
    const content = text.slice(position, end).trim();
    
    if (content.length >= opts.minChunkSize) {
      chunks.push({
        id: `${sourceId}-chunk-${chunks.length}`,
        content,
        index: chunks.length,
        totalChunks: 0,
        metadata: {
          sourceId,
          startChar: position,
          endChar: end,
          type: 'paragraph',
        },
      });
    }
    
    position = end - opts.overlap;
    if (position >= text.length - opts.minChunkSize) {
      break;
    }
  }
  
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }
  
  return chunks;
}

export default {
  chunkText,
  chunkMarkdown,
  chunkJSON,
};
