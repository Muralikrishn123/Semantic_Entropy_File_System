/**
 * FileExtractor - Multi-format Text Extraction
 * ===============================================
 * Extracts readable text content from various file formats:
 * - Plain text files (.txt, .md, .csv, .log)
 * - PDF files (.pdf) using pdf-parse
 * - HTML files (.html, .xml) with tag stripping
 * - JSON files (.json) with value extraction
 */

import fs from 'fs';
import path from 'path';

/**
 * Extract text content from a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Extracted text content
 */
export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);

  console.log(`[Extractor] Processing: ${name} (${ext})`);

  switch (ext) {
    case '.pdf':
      return await extractFromPDF(filePath);
    
    case '.html':
    case '.htm':
    case '.xml':
      return await extractFromHTML(filePath);
    
    case '.json':
      return await extractFromJSON(filePath);
    
    case '.csv':
      return await extractFromCSV(filePath);
    
    case '.txt':
    case '.md':
    case '.log':
    case '.rtf':
    case '.tex':
    default:
      return await extractFromText(filePath);
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractFromPDF(filePath) {
  try {
    // Dynamic import to handle if pdf-parse is not installed
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    
    const text = data.text
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[Extractor] PDF extracted: ${text.length} chars, ${data.numpages} pages`);
    
    if (text.length < 20) {
      // Fallback: use metadata
      return `PDF Document: ${path.basename(filePath)}. Pages: ${data.numpages}. ` +
        `This document contains ${data.numpages} pages of content. ` +
        (data.info?.Title ? `Title: ${data.info.Title}. ` : '') +
        (data.info?.Author ? `Author: ${data.info.Author}. ` : '') +
        (data.info?.Subject ? `Subject: ${data.info.Subject}. ` : '');
    }

    return text;
  } catch (err) {
    console.warn(`[Extractor] PDF parse failed for ${filePath}: ${err.message}`);
    
    // Fallback: try to read raw text content
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const cleaned = raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleaned.length > 50) return cleaned;
    } catch (_e) {
      // ignore
    }

    // Final fallback
    return `PDF Document: ${path.basename(filePath)}. ` +
      `The document name suggests it contains information about ` +
      `${path.basename(filePath, '.pdf').replace(/[-_]/g, ' ')}.`;
  }
}

/**
 * Extract text from HTML/XML by stripping tags
 */
async function extractFromHTML(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  
  // Remove script and style blocks
  let text = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  console.log(`[Extractor] HTML extracted: ${text.length} chars`);
  return text;
}

/**
 * Extract text content from JSON files
 */
async function extractFromJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const data = JSON.parse(raw);
    const texts = [];
    
    // Recursively extract string values
    function extractStrings(obj, depth = 0) {
      if (depth > 10) return;
      
      if (typeof obj === 'string' && obj.length > 3) {
        texts.push(obj);
      } else if (Array.isArray(obj)) {
        for (const item of obj) {
          extractStrings(item, depth + 1);
        }
      } else if (obj && typeof obj === 'object') {
        for (const value of Object.values(obj)) {
          extractStrings(value, depth + 1);
        }
      }
    }
    
    extractStrings(data);
    const text = texts.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log(`[Extractor] JSON extracted: ${text.length} chars`);
    return text;
  } catch (_e) {
    // If not valid JSON, treat as plain text
    return raw.replace(/[{}[\]",:]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Extract text from CSV files
 */
async function extractFromCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  
  // Replace commas and common delimiters with spaces, keep the text content
  const text = raw
    .replace(/,/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`[Extractor] CSV extracted: ${text.length} chars`);
  return text;
}

/**
 * Extract text from plain text files
 */
async function extractFromText(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`[Extractor] Text extracted: ${text.length} chars`);
  return text;
}
