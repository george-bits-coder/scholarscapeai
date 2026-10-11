import { fortaledetails } from "./scoredecision.ts";

const sample = async () => {
  const discussion = `
We are evaluating a resume for a project and checking if they are a right match
`;

  const project = {
    id: "81df700c-6a60-49ba-93ba-ea25ab506449",
    compensation: 5000,
    createdAt: "2026-10-11T01:21:51.360Z",
    description: "Build AI powered resume ",
    location: "Berlin",
    ownerId: "87314dcf-6e82-4324-b353-c94a79ca2453",
    remote: false,
    status: "Planning",
    timeline: "6 months",
    title: "AI powered resume",
    updatedAt: "2026-10-11T01:21:51.360Z",
    owner: {
      id: "87314dcf-6e82-4324-b353-c94a79ca2453",
      affiliation: "BITS Pilani",
      bio: "bio 1234",
      createdAt: "2026-07-30T05:42:42.963Z",
      email: "johnson@university.edu",
      fullName: "Dr. Robert Johnson",
      googleScholarUrl: "",
      name: "Dr. Robert Johnson",
      orcid: "",
      personalWebsite: "",
      publications: "",
      rating: "0.0",
      role: "professor",
      skills: "",
      updatedAt: "2026-08-08T11:31:24.535Z",
      username: "prof_johnson",
      verified: true,
    },
  };

  const resume = {
    fileName: "george_john_resume.pdf",
    format: "pdf",
    parsedAt: "2026-10-11T01:30:30.649Z",
    fullName: "GEORGE JOHN  AI / Machine Learning Engineer  Kottayam, Kerala, India   |   +91 98765 43210   |   george.john@example.com   |   linkedin.com/in/georgejohn  PROFESSIONAL SUMMARY  AI-focused computer science graduate with several years of hands-on experience building and deploying machine learning applications. Experienced in Python, data preparation, model development, APIs, and generative AI workflows. Interested in practical AI systems that solve real business and user problems.  PROFESSIONAL EXPERIENCE  AI Engineer — NovaMind Technologies   2023 – Present  • Developed Python-based machine learning and generative AI features for internal and customer-facing applications.  • Built data-processing pipelines and model evaluation workflows using Python, pandas, scikit-learn, and SQL.  • Integrated large language models into applications for document summarization, classification, and question answering.  • Worked with product and engineering teams to prototype, test, and deploy AI-powered features.  Machine Learning Engineer — DataSphere Labs   2021 – 2023  • Created predictive models for customer behavior and automated reporting workflows.  • Performed data cleaning, feature engineering, model training, and performance analysis.  • Developed REST APIs to expose trained models and supported basic cloud-based deployment workflows.  • Collaborated with senior engineers to improve model reliability and production monitoring.  EDUCATION  Bachelor of Technology (B.Tech) in Computer Science and Engineering  St. Thomas Institute of Technology, Kerala  2016 – 2020  TECHNICAL SKILLS  Languages   Python, SQL, JavaScript  AI / ML   Machine Learning, NLP, Generative AI, Model Evaluation, Prompt Engineering  Frameworks   scikit-learn, PyTorch, FastAPI, pandas, NumPy  Tools   Git, Docker, REST APIs, Jupyter, PostgreSQL  SELECTED PROJECTS  AI Document Assistant   — Built a document Q&A; prototype using embeddings and an LLM, with a simple Python API for querying uploaded documents.  Customer Churn Prediction   — Developed a classification pipeline to identify customers at risk of churn and created a lightweight reporting dashboard.  Support Ticket Classifier   — Created an NLP-based classifier that automatically categorized incoming support requests and routed them to relevant teams.  CERTIFICATIONS & INTERESTS  Interests:   Artificial Intelligence, Generative AI, Machine Learning, AI product development, automation, and emerging developer tools.",
    contact: {
      email: "george.john@example.com",
      phone: "+91 98765 43210",
    },
    summary: "",
    skills: [],
    education: [],
    experience: [],
    rawText:
      "GEORGE JOHN  AI / Machine Learning Engineer  Kottayam, Kerala, India   |   +91 98765 43210   |   george.john@example.com   |   linkedin.com/in/georgejohn  PROFESSIONAL SUMMARY  AI-focused computer science graduate with several years of hands-on experience building and deploying machine learning applications. Experienced in Python, data preparation, model development, APIs, and generative AI workflows. Interested in practical AI systems that solve real business and user problems.  PROFESSIONAL EXPERIENCE  AI Engineer — NovaMind Technologies   2023 – Present  • Developed Python-based machine learning and generative AI features for internal and customer-facing applications.  • Built data-processing pipelines and model evaluation workflows using Python, pandas, scikit-learn, and SQL.  • Integrated large language models into applications for document summarization, classification, and question answering.  • Worked with product and engineering teams to prototype, test, and deploy AI-powered features.  Machine Learning Engineer — DataSphere Labs   2021 – 2023  • Created predictive models for customer behavior and automated reporting workflows.  • Performed data cleaning, feature engineering, model training, and performance analysis.  • Developed REST APIs to expose trained models and supported basic cloud-based deployment workflows.  • Collaborated with senior engineers to improve model reliability and production monitoring.  EDUCATION  Bachelor of Technology (B.Tech) in Computer Science and Engineering  St. Thomas Institute of Technology, Kerala  2016 – 2020  TECHNICAL SKILLS  Languages   Python, SQL, JavaScript  AI / ML   Machine Learning, NLP, Generative AI, Model Evaluation, Prompt Engineering  Frameworks   scikit-learn, PyTorch, FastAPI, pandas, NumPy  Tools   Git, Docker, REST APIs, Jupyter, PostgreSQL  SELECTED PROJECTS  AI Document Assistant   — Built a document Q&A; prototype using embeddings and an LLM, with a simple Python API for querying uploaded documents.  Customer Churn Prediction   — Developed a classification pipeline to identify customers at risk of churn and created a lightweight reporting dashboard.  Support Ticket Classifier   — Created an NLP-based classifier that automatically categorized incoming support requests and routed them to relevant teams.  CERTIFICATIONS & INTERESTS  Interests:   Artificial Intelligence, Generative AI, Machine Learning, AI product development, automation, and emerging developer tools.",
  };

  const response = await fortaledetails(discussion, project, resume);

  console.log(JSON.stringify(response, null, 2));
};

sample().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});