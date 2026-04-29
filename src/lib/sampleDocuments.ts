export interface SampleDoc {
  name: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    name: "machine_learning_intro.txt",
    content: "Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. Deep learning neural networks have revolutionized image recognition, natural language processing, and autonomous driving. Supervised learning algorithms like random forests and support vector machines classify data based on labeled training examples. Unsupervised learning discovers hidden patterns through clustering and dimensionality reduction techniques. Reinforcement learning agents optimize decision-making through trial and error in complex environments. Transfer learning allows models trained on large datasets to be fine-tuned for specific tasks with minimal additional data."
  },
  {
    name: "climate_change_report.pdf",
    content: "Global climate change poses unprecedented challenges to ecosystems and human civilization. Rising greenhouse gas emissions from fossil fuel combustion drive atmospheric warming, causing sea level rise, extreme weather events, and biodiversity loss. The Paris Agreement aims to limit global temperature increase to 1.5 degrees Celsius above pre-industrial levels. Renewable energy sources including solar, wind, and hydroelectric power offer sustainable alternatives to carbon-intensive energy production. Carbon capture and storage technologies may help mitigate emissions from industrial processes. Adaptation strategies include resilient infrastructure, sustainable agriculture, and ecosystem conservation to protect vulnerable communities."
  },
  {
    name: "quarterly_financial_report.pdf",
    content: "The company reported strong quarterly revenue growth of 23% year-over-year, driven by expanding market share in cloud computing services. Operating profit margins improved to 28%, reflecting operational efficiency gains and economies of scale. Investment in research and development increased by 15% to support product innovation and competitive positioning. The board approved a stock buyback program worth $2 billion to enhance shareholder value. International expansion into emerging markets contributed 35% of total revenue. Customer acquisition costs decreased while lifetime value metrics showed significant improvement across all segments."
  },
  {
    name: "python_tutorial.txt",
    content: "Python is a versatile programming language widely used in web development, data science, and automation. The language features clean syntax with significant whitespace, making code readable and maintainable. Popular frameworks like Django and Flask simplify web application development with built-in routing, templating, and database integration. NumPy and Pandas provide powerful data manipulation capabilities for scientific computing. Python's package manager pip enables easy installation of thousands of third-party libraries. Virtual environments isolate project dependencies, preventing version conflicts between different applications. Type hints and linting tools help catch errors before runtime."
  },
  {
    name: "medical_research_paper.pdf",
    content: "This clinical trial investigated the efficacy of a novel immunotherapy treatment for advanced stage melanoma patients. The randomized double-blind study enrolled 450 participants across 12 medical centers. Results demonstrated a 40% improvement in progression-free survival compared to standard chemotherapy. The treatment mechanism involves checkpoint inhibitor antibodies that reactivate the patient's immune system against tumor cells. Adverse effects were manageable, with fatigue and skin rash being the most common side effects. These findings support further investigation of combination immunotherapy approaches for solid tumor cancers and could transform oncological treatment protocols."
  },
  {
    name: "blockchain_whitepaper.pdf",
    content: "Blockchain technology provides a decentralized, immutable ledger for recording transactions without intermediaries. Smart contracts execute automatically when predetermined conditions are met, enabling trustless agreements between parties. Consensus mechanisms like proof of work and proof of stake validate transactions and maintain network security. Decentralized finance applications offer lending, borrowing, and trading services without traditional banking infrastructure. Non-fungible tokens represent unique digital assets including art, music, and virtual real estate. Enterprise blockchain solutions streamline supply chain management, identity verification, and cross-border payment processing."
  },
  {
    name: "nutrition_guide.txt",
    content: "A balanced diet is essential for maintaining optimal health and preventing chronic diseases. Macronutrients including carbohydrates, proteins, and fats provide energy for daily activities and bodily functions. Micronutrients such as vitamins and minerals support immune function, bone health, and cellular repair. The Mediterranean diet emphasizes whole grains, fruits, vegetables, olive oil, and lean proteins. Adequate hydration with water supports digestion, circulation, and temperature regulation. Processed foods high in sugar, sodium, and artificial additives contribute to obesity, diabetes, and cardiovascular disease. Consulting a registered dietitian helps create personalized nutrition plans."
  },
  {
    name: "react_best_practices.txt",
    content: "React component architecture promotes reusable, composable user interface elements. Hooks like useState and useEffect manage component state and side effects in functional components. Context API provides global state management without prop drilling through component hierarchies. React Router enables client-side navigation with dynamic route matching and lazy loading. Performance optimization techniques include memoization with useMemo and useCallback, virtual list rendering, and code splitting. TypeScript integration adds static type checking to catch errors during development. Testing libraries like Jest and React Testing Library ensure component reliability through unit and integration tests."
  },
  {
    name: "ocean_conservation.pdf",
    content: "Ocean ecosystems face critical threats from pollution, overfishing, and climate-driven acidification. Coral reef bleaching events have intensified due to rising sea surface temperatures, threatening marine biodiversity. Plastic pollution accumulates in ocean gyres, harming marine wildlife through ingestion and entanglement. Marine protected areas help preserve critical habitats and allow fish populations to recover from overexploitation. Sustainable aquaculture practices can supplement wild fisheries while reducing environmental impact. Deep sea mining proposals raise concerns about destroying unique ecosystems before they are fully understood. International cooperation is essential for managing shared ocean resources and protecting marine environments."
  },
  {
    name: "startup_pitch_deck.pdf",
    content: "Our innovative SaaS platform disrupts the traditional project management market with AI-powered workflow automation. The total addressable market exceeds $15 billion with a compound annual growth rate of 18%. Our competitive advantage lies in proprietary natural language processing technology that reduces project planning time by 60%. Current monthly recurring revenue has grown 300% year-over-year with a net revenue retention rate of 135%. The founding team brings 40 years of combined experience from leading technology companies. We are seeking $10 million in Series A funding to accelerate product development and expand our sales team into European markets."
  },
  {
    name: "quantum_computing.txt",
    content: "Quantum computing harnesses quantum mechanical phenomena including superposition and entanglement to process information exponentially faster than classical computers. Qubits can exist in multiple states simultaneously, enabling parallel computation of complex problems. Quantum supremacy has been demonstrated for specific computational tasks that would take classical supercomputers thousands of years. Error correction remains a significant challenge due to quantum decoherence and environmental noise. Applications include drug discovery through molecular simulation, cryptography, optimization problems, and materials science. Major technology companies and governments are investing billions in quantum research and development."
  },
  {
    name: "contract_law_summary.pdf",
    content: "Contract law governs legally binding agreements between parties establishing mutual obligations and rights. Essential elements include offer, acceptance, consideration, capacity, and mutual assent. Breach of contract occurs when a party fails to perform their obligations without legal excuse. Remedies for breach include compensatory damages, specific performance, and injunctive relief. The Uniform Commercial Code standardizes commercial transactions involving the sale of goods across jurisdictions. Force majeure clauses excuse performance when extraordinary events prevent contractual fulfillment. Arbitration agreements require parties to resolve disputes through alternative mechanisms rather than litigation."
  },
  {
    name: "data_science_workflow.txt",
    content: "Data science projects follow a systematic methodology from problem definition through deployment. Exploratory data analysis reveals patterns, correlations, and anomalies in raw datasets using statistical methods and visualization. Feature engineering transforms raw variables into informative representations that improve model performance. Cross-validation techniques prevent overfitting by evaluating models on held-out data subsets. Ensemble methods combine multiple algorithms to produce more robust predictions than individual models. Model deployment pipelines automate the transition from development to production environments. Monitoring dashboards track model performance metrics and detect data drift that may degrade prediction accuracy over time."
  },
  {
    name: "renaissance_art_history.txt",
    content: "The Renaissance period marked a profound cultural transformation in European art, literature, and intellectual thought. Leonardo da Vinci exemplified the Renaissance ideal through masterworks like the Mona Lisa and contributions to anatomy and engineering. Michelangelo's Sistine Chapel ceiling represents the pinnacle of fresco painting technique and artistic ambition. Linear perspective developed by Brunelleschi revolutionized spatial representation in painting and architecture. The Medici family of Florence served as influential patrons who funded artistic and scientific endeavors. Oil painting techniques pioneered by Jan van Eyck enabled unprecedented color richness and detail in portraiture. The humanist philosophy emphasized individual achievement and classical learning."
  },
  {
    name: "cybersecurity_guidelines.pdf",
    content: "Cybersecurity best practices protect organizations from data breaches, ransomware attacks, and unauthorized access. Multi-factor authentication adds additional verification layers beyond passwords to secure user accounts. Network segmentation limits lateral movement by attackers who penetrate perimeter defenses. Regular security audits and penetration testing identify vulnerabilities before malicious actors exploit them. Encryption protects data in transit and at rest using advanced cryptographic algorithms. Employee security awareness training reduces the risk of social engineering and phishing attacks. Incident response plans establish procedures for detecting, containing, and recovering from security breaches. Zero trust architecture assumes no implicit trust and verifies every access request regardless of network location."
  },
  {
    name: "sustainable_farming.txt",
    content: "Sustainable agriculture balances food production with environmental stewardship and economic viability. Crop rotation and cover cropping improve soil health by maintaining nutrient balance and preventing erosion. Integrated pest management reduces chemical pesticide use through biological controls and resistant crop varieties. Precision agriculture uses GPS, sensors, and satellite imagery to optimize irrigation, fertilization, and harvesting. Organic farming prohibits synthetic chemicals and genetically modified organisms, promoting natural ecosystem processes. Agroforestry integrates trees with crops and livestock to enhance biodiversity and carbon sequestration. Local food systems reduce transportation emissions and strengthen community food security."
  },
  {
    name: "music_theory_basics.txt",
    content: "Music theory provides the foundational framework for understanding composition, harmony, and rhythm. Scales and modes define the tonal vocabulary available to composers and improvisers. Chord progressions create harmonic movement that drives emotional expression in musical pieces. Time signatures and tempo markings establish rhythmic structure and pacing. Counterpoint techniques weave independent melodic lines into harmonically coherent musical textures. Orchestration assigns musical parts to specific instruments based on their timbral characteristics and range. Modern music production combines traditional theory with digital audio workstation technology for recording, mixing, and mastering."
  },
  {
    name: "neural_network_architecture.pdf",
    content: "Convolutional neural networks excel at image classification through hierarchical feature extraction using learned filters. Recurrent neural networks process sequential data like text and time series through feedback connections that maintain memory. Transformer architecture revolutionized natural language processing with self-attention mechanisms that capture long-range dependencies. Generative adversarial networks produce realistic synthetic data through competition between generator and discriminator networks. Residual connections in deep networks prevent vanishing gradients and enable training of architectures with hundreds of layers. Batch normalization and dropout regularization techniques improve training stability and prevent overfitting. Model compression through pruning and quantization enables deployment on resource-constrained edge devices."
  },
  {
    name: "employee_handbook.pdf",
    content: "This employee handbook outlines company policies, benefits, and expectations for all staff members. Professional conduct standards include respectful communication, punctuality, and adherence to the dress code. The company offers comprehensive health insurance, dental coverage, and a 401k retirement plan with employer matching. Paid time off accrues based on tenure, with additional leave for family emergencies and bereavement. Performance reviews occur quarterly with goal setting, feedback, and professional development planning. The anti-harassment policy establishes zero tolerance for discrimination based on race, gender, age, or disability. Remote work arrangements require manager approval and compliance with information security protocols."
  },
  {
    name: "space_exploration.txt",
    content: "Space exploration has entered a new era with commercial launch providers reducing access costs dramatically. Mars colonization plans envision permanent human settlements supported by in-situ resource utilization for water, oxygen, and fuel. The James Webb Space Telescope observes the universe in infrared wavelengths, revealing early galaxy formation and exoplanet atmospheres. Asteroid mining could provide rare earth minerals and precious metals worth trillions of dollars. Space debris management is critical for maintaining safe orbital environments for satellites and crewed missions. International cooperation through the ISS program demonstrates collaborative science across geopolitical boundaries. Nuclear thermal propulsion could significantly reduce transit times for deep space missions."
  }
];
