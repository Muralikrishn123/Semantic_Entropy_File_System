// ============================================================
// SEFS Text Processing Engine v3 — Advanced NLP
// ============================================================
// Features:
//   - Porter Stemmer for root word extraction
//   - Bigram extraction for phrase-level matching
//   - Weighted category scoring with frequency + TF-IDF boost
//   - Enhanced stop word list (500+ words)
//   - Smart summary generation
// ============================================================

// ---------- PORTER STEMMER (simplified) ----------
const step2map: Record<string, string> = {
  ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize',
  abli: 'able', alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous',
  ization: 'ize', ation: 'ate', ator: 'ate', alism: 'al', iveness: 'ive',
  fulness: 'ful', ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble',
};

function stem(word: string): string {
  if (word.length < 4) return word;
  let w = word;
  // Step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);
  // Step 1b
  if (w.endsWith('eed')) { if (w.length > 4) w = w.slice(0, -1); }
  else if (w.endsWith('ed') && /[aeiou]/.test(w.slice(0, -2))) {
    w = w.slice(0, -2);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
  } else if (w.endsWith('ing') && /[aeiou]/.test(w.slice(0, -3))) {
    w = w.slice(0, -3);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
  }
  // Step 1c
  if (w.endsWith('y') && w.length > 2 && !/[aeiou]/.test(w[w.length - 2])) {
    w = w.slice(0, -1) + 'i';
  }
  // Step 2
  for (const [suffix, replacement] of Object.entries(step2map)) {
    if (w.endsWith(suffix) && w.length - suffix.length > 2) {
      w = w.slice(0, -suffix.length) + replacement;
      break;
    }
  }
  // Step 3
  const step3: Record<string, string> = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' };
  for (const [suffix, replacement] of Object.entries(step3)) {
    if (w.endsWith(suffix) && w.length - suffix.length > 2) {
      w = w.slice(0, -suffix.length) + replacement;
      break;
    }
  }
  return w;
}

// ---------- STOP WORDS ----------
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
  'began', 'begin', 'best', 'better', 'big', 'certain', 'change', 'clear',
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
  'young', 'able', 'across', 'almost', 'among', 'ask', 'asked', 'area',
  'based', 'provides', 'offer', 'offers', 'support', 'supports', 'information',
  'allows', 'enables', 'requires', 'involves', 'ensure', 'ensures', 'provide',
  'various', 'specific', 'process', 'processes', 'available', 'current', 'related',
  'create', 'creating', 'within', 'along', 'following', 'follow', 'follows', 'case',
  'cases', 'example', 'examples', 'type', 'types', 'way', 'ways', 'just', 'don', 'doesn',
  'didn', 'won', 'wouldn', 'couldn', 'shouldn', 'isn', 'aren', 'wasn', 'weren', 'hasn',
  'haven', 'hadn', 'ain', 'let', 'll', 've', 're', 'that', 'com', 'www', 'http', 'https',
  'document', 'file', 'page', 'pages', 'content', 'text', 'pdf', 'contains', 'section',
  'based', 'new', 'also', 'well', 'using', 'used', 'can', 'may', 'many', 'much', 'make',
  'first', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'would', 'could', 'should', 'will', 'shall', 'might', 'must', 'need', 'want', 'going',
  'been', 'being', 'done', 'does', 'doing', 'goes', 'gone', 'got', 'getting',
  'came', 'coming', 'gave', 'giving', 'keeps', 'keeping', 'knew', 'knowing',
  'left', 'leaving', 'makes', 'making', 'means', 'meaning', 'says', 'saying',
  'sees', 'seeing', 'seems', 'seeming', 'shows', 'showing', 'takes', 'taking',
  'tells', 'telling', 'thinks', 'thinking', 'works', 'working', 'writes', 'writing',
]);

// ---------- TYPES ----------
export interface ProcessedDocument {
  id: string;
  name: string;
  content: string;
  terms: Map<string, number>;
  tfidf: Map<string, number>;
  category: string;
  categoryScores?: Record<string, number>;
  summary: string;
  wordCount: number;
  topTerms: string[];
  bigrams?: string[];
}

// ---------- TOKENIZER ----------
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .map(w => stem(w));
}

export function extractBigrams(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${stem(words[i])}_${stem(words[i + 1])}`);
  }
  return bigrams;
}

// ---------- TF / IDF / TF-IDF ----------
export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length || 1;
  for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
  for (const [term, count] of tf) tf.set(term, count / total);
  return tf;
}

export function inverseDocumentFrequency(documents: Map<string, number>[]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = documents.length;
  const allTerms = new Set<string>();
  for (const doc of documents) for (const term of doc.keys()) allTerms.add(term);
  for (const term of allTerms) {
    let docCount = 0;
    for (const doc of documents) if (doc.has(term)) docCount++;
    idf.set(term, Math.log((N + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

export function calculateTFIDF(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const tfidf = new Map<string, number>();
  for (const [term, freq] of tf) tfidf.set(term, freq * (idf.get(term) || 1));
  return tfidf;
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, nA = 0, nB = 0;
  const allTerms = new Set([...a.keys(), ...b.keys()]);
  for (const t of allTerms) {
    const va = a.get(t) || 0, vb = b.get(t) || 0;
    dot += va * vb; nA += va * va; nB += vb * vb;
  }
  if (nA === 0 || nB === 0) return 0;
  return dot / (Math.sqrt(nA) * Math.sqrt(nB));
}

// ============================================================
// CATEGORY DETECTION v3 — Stemmed + Bigram + Frequency-weighted
// ============================================================
// Each category has:
//   - stemmed unigram keywords (applied to stemmed tokens)
//   - bigram phrases (compound concepts like "machine_learn")
//   - weights per keyword (core concepts score 2x)
// ============================================================

interface CatDef {
  core: string[];     // high-weight (2.0 per match)
  extended: string[]; // normal-weight (1.0 per match)
  phrases: string[];  // bigrams (3.0 per match — very distinctive)
}

const CATEGORIES: Record<string, CatDef> = {
  Technology: {
    core: [
      'softwar', 'hardwar', 'algorithm', 'program', 'comput', 'databas', 'server',
      'api', 'framework', 'neural', 'blockchain', 'encrypt', 'deploy', 'docker',
      'kubernet', 'microservic', 'javascript', 'typescript', 'python', 'react',
      'frontend', 'backend', 'devop', 'compiler', 'gpu', 'cpu', 'semiconduc',
      'cloud', 'virtual', 'automat', 'process', 'memori', 'storag', 'bandwidth',
      'latenc', 'throughput', 'cach', 'socket', 'thread', 'parallel', 'distribut',
      'contain', 'orchestr', 'pipelin', 'continu', 'integr', 'monitor', 'dashboard',
      'render', 'pixel', 'router', 'switch', 'firewal', 'vpn', 'dns', 'tcp',
      'http', 'ssl', 'tls', 'ssh', 'oauth', 'token', 'webhook', 'endpoint',
      'serverless', 'lambda', 'stream', 'kafka', 'redi', 'mongodb', 'postgresql',
      'graphql', 'restful', 'crud', 'migrat', 'schema', 'queri', 'repositori',
    ],
    extended: [
      'digit', 'internet', 'web', 'app', 'applic', 'network', 'tech', 'machin',
      'artifici', 'intellig', 'crypto', 'cybersecur', 'code', 'data',
      'plug', 'widget', 'respons', 'scalabl', 'architectur', 'infrastructur',
      'configur', 'middlewar', 'librari', 'modul', 'packag', 'runtim',
      'firmwar', 'embed', 'iot', 'sensor', 'protocol', 'interfac', 'binari',
    ],
    phrases: [
      'machin_learn', 'deep_learn', 'neural_network', 'artifici_intellig',
      'natur_languag', 'comput_vision', 'data_scienc', 'open_sourc',
      'version_control', 'continu_integr', 'cloud_comput', 'web_develop',
      'softwar_engin', 'data_structur', 'operat_system', 'program_languag',
    ],
  },
  Science: {
    core: [
      'quantum', 'physic', 'chemistr', 'biolog', 'molecul', 'atom', 'cell', 'dna',
      'gene', 'evolut', 'speci', 'ecolog', 'astronomi', 'planet', 'univers',
      'particl', 'electron', 'neutron', 'proton', 'photon', 'wavelength',
      'spectrum', 'thermodynam', 'relat', 'graviti', 'forc', 'mass', 'veloc',
      'acceler', 'momentum', 'kinet', 'potenti', 'electromagnet', 'radiat',
      'isotop', 'compound', 'reaction', 'catalyst', 'enzym', 'protein', 'chromosom',
      'genom', 'mutat', 'mitosi', 'meiosi', 'photosynth', 'respir',
      'organism', 'microorganism', 'bacteria', 'fungi', 'virus', 'specimen',
      'microscop', 'centrifug', 'pipett', 'hypothesi', 'variabl', 'control',
      'superconductor', 'nanotechnolog', 'polymer', 'alloi', 'crystallographi',
      'spectroscopi', 'chromatographi', 'diffract', 'reson', 'oscil',
      'entrop', 'cosmolog', 'astrophys', 'exoplanet', 'nebula', 'quasar',
      'galaxi', 'supernova', 'gravit', 'orbit', 'satellit', 'spacecraft',
    ],
    extended: [
      'research', 'experi', 'hypothesi', 'theori', 'energi', 'scientif',
      'laboratori', 'observ', 'telescop', 'sampl', 'peer', 'journal',
      'publicat', 'methodolog', 'empir', 'qualit', 'quantit',
      'statist', 'correl', 'regress', 'analysi', 'discoveri',
      'breakthrough', 'innov', 'frontier', 'phenomenon', 'anomali',
      'propuls', 'mars', 'lunar', 'asteroid', 'comet', 'rover', 'magnet',
      'optic', 'acoust', 'experiment',
    ],
    phrases: [
      'quantum_mechan', 'quantum_comput', 'black_hole', 'dark_matter',
      'big_bang', 'genet_engin', 'stem_cell', 'climat_chang',
      'peer_review', 'control_group', 'scientif_method',
    ],
  },
  Business: {
    core: [
      'revenu', 'profit', 'loss', 'market', 'stock', 'invest', 'financ', 'bank',
      'econom', 'trade', 'strategi', 'manag', 'leadership', 'startup', 'entrepreneur',
      'ventur', 'capit', 'budget', 'forecast', 'growth', 'sale', 'market', 'brand',
      'custom', 'client', 'contract', 'partnership', 'acquisit', 'merger', 'roi',
      'stakehold', 'suppli', 'demand', 'competit', 'disrupt', 'valuat', 'equiti',
      'dividend', 'portfolio', 'asset', 'liabil', 'balanc', 'cash', 'flow',
      'incom', 'expens', 'tax', 'audit', 'complianc', 'quarterli', 'annual',
      'fiscal', 'sharehold', 'board', 'director', 'ceo', 'cfo', 'cto', 'execut',
      'corpor', 'subsidiari', 'franchis', 'licens', 'royalti', 'wholesal',
      'retail', 'ecommerc', 'logist', 'procur', 'inventori', 'warehous',
      'distribut', 'channel', 'segment', 'demograph', 'target', 'convers',
      'retent', 'churn', 'ltv', 'cac', 'arpu', 'mrr', 'arr', 'saas',
      'subscript', 'price', 'monetiz', 'fundrais', 'ipo',
    ],
    extended: [
      'innov', 'scalabl', 'privat', 'hedg', 'fund', 'mutual', 'bond',
      'treasuri', 'commod', 'futur', 'option', 'deriv', 'inflat', 'recess',
      'gdp', 'unemploy', 'monetari', 'polici', 'interest', 'rate',
      'credit', 'debt', 'loan', 'mortgag', 'insur', 'underwrit',
      'risk', 'diversif', 'benchmark', 'index',
    ],
    phrases: [
      'year_over', 'market_share', 'cash_flow', 'revenu_growth',
      'profit_margin', 'custom_acquisit', 'return_invest',
      'suppli_chain', 'venture_capit', 'stock_buyback',
      'seri_fund', 'month_recur', 'annual_recur',
    ],
  },
  Health: {
    core: [
      'medic', 'health', 'diseas', 'treatment', 'patient', 'doctor', 'hospit',
      'surgeri', 'diagnosi', 'symptom', 'therapi', 'medicin', 'pharmaceut',
      'clinic', 'trial', 'vaccin', 'immun', 'infect', 'nutrit', 'mental',
      'well', 'chronic', 'acut', 'cancer', 'diabet', 'cardiac', 'patholog',
      'anatomi', 'physiolog', 'prescript', 'dosag', 'rehabilit', 'oncolog',
      'neurolog', 'cardiolog', 'dermatolog', 'pediatr', 'geriatr', 'obstetr',
      'gynecolog', 'orthoped', 'radiolog', 'anesthesiolog', 'psychiatri',
      'psycholog', 'counsel', 'diagnost', 'mri', 'scan', 'ultrasound',
      'biopsi', 'transplant', 'organ', 'blood', 'plasma', 'platelet',
      'antibodi', 'antigen', 'immunotherapi', 'chemotherapi',
      'palliat', 'hospic', 'prognosi', 'remiss', 'relaps', 'mortal',
      'morbid', 'epidemiolog', 'pandem', 'epidem', 'outbreak', 'quarantin',
      'sanit', 'hygien', 'steriliz', 'triag', 'emergenc', 'paramed',
      'insulin', 'cholesterol', 'hemoglobin', 'glucos', 'biomark',
    ],
    extended: [
      'exercis', 'wellness', 'virus', 'bacteria', 'genet', 'heredit',
      'congen', 'autoimmun', 'inflamm', 'degenerat', 'infecti',
      'respirat', 'gastrointestin', 'musculoskelet', 'neurolog',
      'endocrin', 'metabol', 'dietari', 'supplement', 'vitamin',
      'miner', 'calori', 'obes', 'anorexia', 'depress', 'anxieti',
      'ptsd', 'adhd', 'autism', 'dementia', 'alzheim', 'parkinson',
      'stroke', 'hypertens', 'asthma', 'allergi',
    ],
    phrases: [
      'clinic_trial', 'side_effect', 'mental_health', 'immune_system',
      'blood_pressur', 'heart_diseas', 'public_health', 'patient_care',
      'drug_discoveri', 'medic_research', 'health_insur',
    ],
  },
  Education: {
    core: [
      'learn', 'teach', 'student', 'teacher', 'curriculum', 'classroom',
      'academ', 'univers', 'colleg', 'degre', 'cours', 'lectur', 'exam',
      'grade', 'assess', 'pedagog', 'instruct', 'literaci', 'skill',
      'knowledg', 'train', 'workshop', 'seminar', 'tutori', 'certif',
      'scholarship', 'syllabus', 'enrol', 'accredit', 'diploma', 'thesi',
      'dissert', 'professor', 'dean', 'faculti', 'campus', 'dormitori',
      'tuition', 'fellowship', 'undergradu', 'graduat', 'postgradu',
      'doctor', 'master', 'bachelor', 'credential', 'compet', 'rubric',
      'capston', 'internship', 'apprenticeship', 'mentorship',
      'counselor', 'advisor', 'registrar', 'bursar', 'admiss', 'alumni',
    ],
    extended: [
      'gpa', 'sat', 'act', 'gre', 'gmat', 'lsat', 'mcat', 'standard',
      'test', 'format', 'summat', 'differenti', 'inclus', 'special',
      'gift', 'remedi', 'bilingu', 'esl', 'immers', 'montessori',
      'waldorf', 'homeschool', 'charter', 'magnet', 'vocat', 'technic',
      'continu', 'profession', 'develop', 'blended', 'hybrid', 'onlin',
      'distanc', 'mooc', 'edtech', 'lms', 'textbook', 'workbook',
      'lesson', 'plan', 'object', 'outcom', 'electiv', 'prerequisit',
      'credit', 'hour', 'semest', 'quarter', 'trimest', 'school',
    ],
    phrases: [
      'higher_educ', 'online_learn', 'distance_learn', 'student_perform',
      'teacher_train', 'curriculum_develop', 'educati_technolog',
      'classroom_manag', 'academ_perform', 'learning_outcom',
    ],
  },
  Legal: {
    core: [
      'law', 'legal', 'court', 'judg', 'attorney', 'lawyer', 'plaintiff',
      'defend', 'contract', 'regul', 'complianc', 'statut', 'jurisdict',
      'litig', 'arbitr', 'right', 'amend', 'constitut', 'legisl', 'polici',
      'enforc', 'prosecut', 'verdict', 'appeal', 'testimoni', 'tort',
      'felon', 'misdemeanor', 'indict', 'arraign', 'bail', 'bond', 'plea',
      'sentenc', 'parol', 'probat', 'incarcer', 'prison', 'jail', 'custodi',
      'warrant', 'subpoena', 'deposit', 'discoveri', 'motion', 'brief',
      'preced', 'jurisprud', 'equiti', 'bankruptci', 'antitrust',
      'intellectu', 'properti', 'patent', 'trademark', 'copyright',
      'infring', 'immigr', 'asylum', 'deportat', 'naturaliz', 'citizen',
      'visa', 'extradit', 'treati', 'diplomat', 'immun', 'sovereignti',
    ],
    extended: [
      'feder', 'separ', 'power', 'execut', 'legisl', 'judici', 'municip',
      'ordinanc', 'zone', 'permit', 'easem', 'lien', 'foreclosur', 'evict',
      'tenant', 'landlord', 'leas', 'escrow', 'titl', 'deed', 'notari',
      'affidavit', 'oath', 'perjuri', 'contempt', 'injunct', 'restrain',
      'class', 'action', 'settl', 'damag', 'compensatori', 'punit',
      'restitut', 'mediat', 'concili', 'ombudsman', 'tribunal',
      'magistr', 'clerk', 'bailiff', 'juror', 'juri', 'grand',
    ],
    phrases: [
      'intellectu_properti', 'class_action', 'due_process',
      'breach_contract', 'crimin_law', 'civil_law',
      'rule_law', 'legal_system', 'court_order',
    ],
  },
  Arts: {
    core: [
      'art', 'music', 'paint', 'sculptur', 'galleri', 'museum', 'creativ',
      'design', 'aesthet', 'composit', 'exhibit', 'perform', 'theater',
      'cinema', 'film', 'photographi', 'literatur', 'poetri', 'novel',
      'fiction', 'drama', 'danc', 'orchestra', 'symphoni', 'cultur',
      'canvas', 'portrait', 'abstract', 'contemporari', 'renaiss',
      'baroqu', 'impression', 'expression', 'surreal', 'cubism', 'minimal',
      'watercolor', 'acrylic', 'oil', 'charcoal', 'pastel', 'sketch',
      'draw', 'etch', 'lithographi', 'printmak', 'ceram', 'potteri',
      'glass', 'textil', 'weav', 'embroideri', 'quilt', 'mosaic',
      'fresco', 'mural', 'graffiti', 'calligraphi', 'typographi',
      'graphic', 'illustr', 'anim', 'cartoon', 'comic', 'manga', 'anim',
      'studio', 'ateli', 'conservatori', 'repertoir', 'ensembl', 'solo',
      'duet', 'trio', 'quartet', 'choir', 'vocalist', 'instrumentalist',
      'conductor', 'maestro', 'concerto', 'sonata', 'fugue', 'prelud',
      'overtur', 'aria', 'libretto', 'opera', 'ballet', 'choreographi',
    ],
    extended: [
      'playwright', 'screenwriter', 'novelist', 'poet', 'essayist',
      'critic', 'curator', 'collector', 'patron', 'auction', 'retrospect',
      'catalog', 'monograph', 'documentari', 'indi', 'mainstream',
      'blockbust', 'sequel', 'prequel', 'remak', 'adapt', 'screenplay',
      'director', 'produc', 'actor', 'actress', 'cinematograph', 'editor',
      'soundscap', 'score', 'soundtrack', 'harmoni', 'melodi', 'rhythm',
      'tempo', 'beat', 'bass', 'trebl', 'chord', 'scale', 'octav', 'key',
      'pitch', 'tone', 'timbr', 'dynam',
    ],
    phrases: [
      'fine_art', 'visual_art', 'contemporari_art', 'music_theori',
      'film_direct', 'creativ_write', 'graphic_design', 'perform_art',
    ],
  },
  Environment: {
    core: [
      'climat', 'sustainabil', 'renew', 'solar', 'wind', 'carbon', 'emiss',
      'pollut', 'conserv', 'biodivers', 'ecosystem', 'deforest',
      'recycl', 'wast', 'ocean', 'atmospher', 'greenhous', 'fossil', 'fuel',
      'organ', 'habitat', 'endang', 'wildlif', 'environment', 'ozon',
      'reforest', 'permafrost', 'drought', 'flood', 'wildfir', 'hurrican',
      'tornado', 'tsunami', 'earthquak', 'volcan', 'eros', 'sediment',
      'aquif', 'watershed', 'wetland', 'estuari', 'reef', 'coral',
      'mangrov', 'rainforest', 'savanna', 'tundra', 'glacier', 'icecap',
      'geotherm', 'hydroelectr', 'biomass', 'biofuel', 'ethanol',
      'hydrogen', 'photovolta', 'turbin', 'batteri', 'grid', 'transmiss',
      'effici', 'insul', 'thermostat', 'hvac', 'green', 'eco', 'clean',
      'zero', 'net', 'footprint', 'offset', 'sequestr', 'captur',
      'mitig', 'adapt', 'resili', 'vulnerabil', 'impact', 'esg', 'csr',
      'circular', 'compost', 'landfil', 'inciner', 'hazard', 'toxic',
      'contamin', 'remedi', 'superfund', 'brownfield', 'greenfield',
    ],
    extended: [
      'urban', 'plan', 'transit', 'bicycl', 'pedestrian', 'electr',
      'vehicl', 'charg', 'hybrid', 'autonom', 'congest', 'commut',
      'sprawl', 'densiti', 'parkland', 'preserv', 'sanctuari', 'reserv',
      'migrat', 'pollin', 'invas', 'speci', 'extinct', 'recoveri',
      'stewardship', 'ranger', 'forestri', 'agricultur', 'permacultur',
      'agroecolog', 'irrig', 'drip', 'precis', 'crop', 'rotat', 'cover',
      'tillag', 'mulch', 'pesticid', 'herbicid', 'fertil', 'runoff',
      'eutrophic', 'algal', 'bloom', 'dissolv', 'oxygen', 'salin',
      'turbid', 'microplast', 'temperatur', 'warm', 'cool', 'precipit',
    ],
    phrases: [
      'climat_chang', 'global_warm', 'sea_level', 'carbon_footprint',
      'renew_energi', 'fossil_fuel', 'greenhous_gas', 'carbon_emiss',
      'sustainabl_develop', 'biodiversit_loss', 'deforest_rate',
      'clean_energi', 'solar_panel', 'wind_turbine',
    ],
  },
};

export function detectCategory(tokens: string[], bigrams: string[]): { category: string; scores: Record<string, number> } {
  const scores: Record<string, number> = {};

  // Build frequency map of stemmed tokens
  const tokenCounts = new Map<string, number>();
  for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);

  // Build set of bigrams for fast lookup
  const bigramSet = new Set(bigrams);

  for (const [category, def] of Object.entries(CATEGORIES)) {
    let score = 0;

    // Core keywords — 2.0 base weight + log(frequency) bonus
    for (const kw of def.core) {
      const count = tokenCounts.get(kw) || 0;
      if (count > 0) score += 2.0 + Math.log(count) * 0.8;
    }

    // Extended keywords — 1.0 base weight + log(frequency) bonus
    for (const kw of def.extended) {
      const count = tokenCounts.get(kw) || 0;
      if (count > 0) score += 1.0 + Math.log(count) * 0.4;
    }

    // Phrase matches — 3.0 per bigram match (very distinctive)
    for (const phrase of def.phrases) {
      if (bigramSet.has(phrase)) score += 3.0;
    }

    scores[category] = score;
  }

  let maxScore = 0;
  let bestCategory = 'General';
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; bestCategory = category; }
  }

  // Require minimum score of 2.0 (at least one core keyword match)
  return {
    category: maxScore >= 2.0 ? bestCategory : 'General',
    scores,
  };
}

export function generateSummary(content: string, maxLength: number = 120): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length === 0) return content.substring(0, maxLength) + '...';
  return sentences[0].trim().substring(0, maxLength) + (sentences[0].length > maxLength ? '...' : '');
}

export function processDocument(id: string, name: string, content: string): Omit<ProcessedDocument, 'tfidf'> {
  const tokens = tokenize(content);
  const bigrams = extractBigrams(content);
  const tf = termFrequency(tokens);
  const { category, scores: categoryScores } = detectCategory(tokens, bigrams);
  const summary = generateSummary(content);
  const sorted = [...tf.entries()].sort((a, b) => b[1] - a[1]);
  const topTerms = sorted.slice(0, 8).map(([term]) => term);
  return {
    id, name, content, terms: tf, category, categoryScores,
    summary, wordCount: tokens.length, topTerms, bigrams,
  };
}
