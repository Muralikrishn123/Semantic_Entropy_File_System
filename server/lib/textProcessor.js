/**
 * TextProcessor - NLP & Semantic Analysis Engine
 * ================================================
 * Handles tokenization, TF-IDF computation, category detection,
 * and text summarization for the SEFS backend.
 */

// Comprehensive English stop words
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours',
  'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they',
  'them', 'their', 'theirs', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
  'above', 'after', 'again', 'also', 'am', 'any', 'because', 'before', 'below', 'between',
  'during', 'into', 'itself', 'let', 'like', 'make', 'much', 'must', 'new', 'now', 'off',
  'once', 'one', 'over', 'per', 're', 'said', 'say', 'still', 'take', 'then', 'there',
  'through', 'under', 'until', 'up', 'upon', 'want', 'well', 'while', 'yet', 'get', 'got',
  'go', 'going', 'know', 'need', 'use', 'used', 'using', 'way', 'even', 'find', 'first',
  'give', 'here', 'keep', 'last', 'long', 'look', 'many', 'never', 'next', 'old', 'open',
  'part', 'put', 'read', 'run', 'see', 'seem', 'set', 'show', 'side', 'small', 'think',
  'three', 'turn', 'two', 'work', 'also', 'back', 'call', 'come', 'down', 'end', 'good',
  'great', 'hand', 'help', 'high', 'home', 'house', 'large', 'line', 'little', 'man',
  'move', 'much', 'name', 'number', 'off', 'order', 'people', 'place', 'point', 'right',
  'say', 'tell', 'thing', 'time', 'try', 'water', 'word', 'world', 'write', 'year',
  'as', 'if', 'else', 'then', 'however', 'although', 'though', 'since', 'unless', 'whether',
  'rather', 'already', 'around', 'away', 'another', 'became', 'become', 'becomes',
  'began', 'begin', 'best', 'better', 'big', 'certain', 'change', 'changes', 'clear',
  'close', 'common', 'complete', 'day', 'days', 'different', 'early', 'enough', 'face',
  'fact', 'far', 'form', 'full', 'further', 'general', 'given', 'group', 'head', 'important',
  'include', 'including', 'increase', 'interest', 'kind', 'known', 'later', 'least',
  'less', 'level', 'life', 'likely', 'live', 'local', 'made', 'major', 'matter', 'means',
  'might', 'mind', 'mr', 'mrs', 'national', 'necessary', 'need', 'often', 'old', 'others',
  'own', 'particular', 'per', 'perhaps', 'play', 'possible', 'present', 'problem',
  'public', 'quite', 'real', 'result', 'room', 'second', 'service', 'several', 'short',
  'show', 'side', 'simple', 'since', 'small', 'social', 'special', 'start', 'state',
  'still', 'sure', 'system', 'taken', 'thought', 'together', 'toward', 'towards',
  'turned', 'united', 'upon', 'us', 'usually', 'var', 'want', 'white', 'whole', 'without',
  'young', 'able', 'across', 'almost', 'among', 'ask', 'asked', 'area', 'business'
]);

// Category keyword dictionaries
const CATEGORY_KEYWORDS = {
  'Technology': [
    'software', 'hardware', 'computer', 'programming', 'code', 'algorithm',
    'data', 'digital', 'internet', 'web', 'app', 'application', 'server',
    'database', 'network', 'cloud', 'api', 'framework', 'developer', 'tech',
    'machine', 'learning', 'artificial', 'intelligence', 'neural', 'blockchain',
    'crypto', 'cybersecurity', 'devops', 'frontend', 'backend', 'python',
    'javascript', 'typescript', 'react', 'node', 'docker', 'kubernetes',
    'microservices', 'agile', 'deployment', 'virtualization', 'automation'
  ],
  'Science': [
    'research', 'experiment', 'hypothesis', 'theory', 'quantum', 'physics',
    'chemistry', 'biology', 'molecule', 'atom', 'cell', 'dna', 'gene',
    'evolution', 'species', 'climate', 'environment', 'ecology', 'astronomy',
    'planet', 'universe', 'energy', 'particle', 'electron', 'neutron',
    'proton', 'scientific', 'laboratory', 'observation', 'telescope',
    'photon', 'wavelength', 'spectrum', 'thermodynamics', 'relativity'
  ],
  'Business': [
    'revenue', 'profit', 'loss', 'market', 'stock', 'investment', 'finance',
    'banking', 'economy', 'trade', 'strategy', 'management', 'leadership',
    'startup', 'entrepreneur', 'venture', 'capital', 'budget', 'forecast',
    'growth', 'sales', 'marketing', 'brand', 'customer', 'client', 'contract',
    'partnership', 'acquisition', 'merger', 'roi', 'stakeholder', 'supply',
    'demand', 'competitive', 'innovation', 'disruption', 'scalability'
  ],
  'Health': [
    'medical', 'health', 'disease', 'treatment', 'patient', 'doctor',
    'hospital', 'surgery', 'diagnosis', 'symptom', 'therapy', 'medicine',
    'pharmaceutical', 'clinical', 'trial', 'vaccine', 'immune', 'virus',
    'bacteria', 'infection', 'nutrition', 'exercise', 'mental', 'wellness',
    'chronic', 'acute', 'cancer', 'diabetes', 'cardiac', 'pathology',
    'anatomy', 'physiology', 'prescription', 'dosage', 'rehabilitation'
  ],
  'Education': [
    'learning', 'teaching', 'student', 'teacher', 'curriculum', 'classroom',
    'academic', 'university', 'college', 'degree', 'course', 'lecture',
    'exam', 'grade', 'assessment', 'pedagogy', 'instruction', 'literacy',
    'skill', 'knowledge', 'training', 'workshop', 'seminar', 'tutorial',
    'certification', 'scholarship', 'syllabus', 'enrollment', 'accreditation'
  ],
  'Legal': [
    'law', 'legal', 'court', 'judge', 'attorney', 'lawyer', 'plaintiff',
    'defendant', 'contract', 'regulation', 'compliance', 'statute',
    'jurisdiction', 'litigation', 'arbitration', 'rights', 'amendment',
    'constitution', 'legislation', 'policy', 'enforcement', 'prosecution',
    'verdict', 'appeal', 'testimony', 'tort', 'felony', 'misdemeanor'
  ],
  'Arts': [
    'art', 'music', 'painting', 'sculpture', 'gallery', 'museum', 'creative',
    'design', 'aesthetic', 'composition', 'exhibition', 'performance',
    'theater', 'cinema', 'film', 'photography', 'literature', 'poetry',
    'novel', 'fiction', 'drama', 'dance', 'orchestra', 'symphony', 'cultural',
    'canvas', 'portrait', 'abstract', 'contemporary', 'renaissance'
  ],
  'Environment': [
    'climate', 'sustainability', 'renewable', 'solar', 'wind', 'carbon',
    'emission', 'pollution', 'conservation', 'biodiversity', 'ecosystem',
    'deforestation', 'recycling', 'waste', 'ocean', 'atmosphere', 'greenhouse',
    'fossil', 'fuel', 'organic', 'habitat', 'endangered', 'wildlife',
    'environmental', 'ozone', 'reforestation', 'permafrost', 'drought'
  ]
};

export class TextProcessor {
  /**
   * Tokenize text into cleaned word tokens
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  }

  /**
   * Calculate term frequency for a set of tokens
   * Returns { term: normalizedFrequency }
   */
  termFrequency(tokens) {
    const tf = {};
    const total = tokens.length;

    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    // Normalize by total tokens
    for (const term in tf) {
      tf[term] = tf[term] / total;
    }

    return tf;
  }

  /**
   * Compute Inverse Document Frequency across all documents
   * @param {Object[]} allTerms - Array of term frequency objects
   * @returns {Object} IDF values for each term
   */
  computeIDF(allTerms) {
    const idf = {};
    const N = allTerms.length;
    const allUniqueTerms = new Set();

    for (const docTerms of allTerms) {
      for (const term of Object.keys(docTerms)) {
        allUniqueTerms.add(term);
      }
    }

    for (const term of allUniqueTerms) {
      let docCount = 0;
      for (const docTerms of allTerms) {
        if (docTerms[term]) docCount++;
      }
      idf[term] = Math.log((N + 1) / (docCount + 1)) + 1;
    }

    return idf;
  }

  /**
   * Compute TF-IDF for a single document
   */
  computeTFIDF(tf, idf) {
    const tfidf = {};
    for (const [term, freq] of Object.entries(tf)) {
      const idfVal = idf[term] || 1;
      tfidf[term] = freq * idfVal;
    }
    return tfidf;
  }

  /**
   * Compute cosine similarity between two TF-IDF vectors
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allTerms = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const term of allTerms) {
      const valA = a[term] || 0;
      const valB = b[term] || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Detect category from tokens using keyword matching
   */
  detectCategory(tokens) {
    const tokenSet = new Set(tokens);
    const scores = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      scores[category] = 0;
      for (const keyword of keywords) {
        if (tokenSet.has(keyword)) {
          scores[category]++;
        }
      }
    }

    let maxScore = 0;
    let bestCategory = 'General';
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return {
      bestCategory: maxScore >= 2 ? bestCategory : 'General',
      scores
    };
  }

  /**
   * Generate a summary from content
   */
  generateSummary(content, maxLength = 150) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return content.substring(0, maxLength) + '...';
    const summary = sentences[0].trim();
    return summary.length > maxLength
      ? summary.substring(0, maxLength) + '...'
      : summary;
  }

  /**
   * Full document analysis pipeline
   * @param {string} content - Raw text content
   * @returns {Object} Analysis results
   */
  analyzeDocument(content) {
    const tokens = this.tokenize(content);
    const terms = this.termFrequency(tokens);
    const { bestCategory, scores } = this.detectCategory(tokens);
    const summary = this.generateSummary(content);

    // Get top terms by frequency
    const sortedTerms = Object.entries(terms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);

    return {
      terms,
      category: bestCategory,
      categoryScores: scores,
      summary,
      wordCount: tokens.length,
      topTerms: sortedTerms,
      tokenCount: tokens.length,
      uniqueTerms: Object.keys(terms).length
    };
  }

  /**
   * Build similarity matrix for a set of documents
   * @param {Object[]} documents - Array of documents with tfidf property
   * @returns {number[][]} Similarity matrix
   */
  buildSimilarityMatrix(documents) {
    const n = documents.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sim = this.cosineSimilarity(
          documents[i].tfidf || {},
          documents[j].tfidf || {}
        );
        matrix[i][j] = sim;
        matrix[j][i] = sim;
      }
      matrix[i][i] = 1;
    }

    return matrix;
  }
}
