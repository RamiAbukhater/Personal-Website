// All of the resume's content, as data. book.js turns this into the pages of
// the book; nothing in index.html repeats it.
//
// Dates are "YYYY-MM" or "YYYY". An entry's `when` is { start, end, prefix }:
//   { start: '2026-09', end: 'present' }  → September 2026 – Present
//   { start: '2023-09', end: '2024-06' }  → September 2023 – June 2024
//   { end: '2027-06', prefix: 'Expected' } → Expected June 2027
//
// `spread` says which sections go on which page of the open book. On phones
// and in print the pages run one after the other, left page first.
//
// Per-visitor versions (see PERSONALIZATION.md) would add an `audiences` tag
// to entries and a `variants` list here; nothing reads those yet.

export const RESUME = {
  cover: {
    title: 'Rami Abukhater',
    subtitle: 'Curriculum Vitae',
    volume: 'Volume I · 2026',
  },

  person: {
    name: 'Rami Abukhater',
    headline:
      'Data science senior at UC San Diego working on perception and simulation for autonomous systems.',
    location: 'La Jolla, CA',
    links: [
      { label: 'GitHub', href: 'https://github.com/RamiAbukhater' },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/Rami-Abukhater' },
    ],
  },

  spread: {
    left: ['summary', 'education', 'experience'],
    right: ['skills', 'past-roles', 'projects', 'past-projects', 'awards', 'writing'],
  },

  sections: [
    {
      id: 'summary',
      title: 'Summary',
      type: 'prose',
      text:
        'I am a data science senior at UC San Diego, minoring in mathematics and philosophy of cognitive science. I work across perception and simulation for autonomous systems, from the sensing stack on a student autonomous vehicle to a physics-grounded localization simulator for medical microrobots, with a research interest in grounding machine decision-making in Bayesian models of cognition.',
    },

    {
      id: 'experience',
      title: 'Experience',
      type: 'entries',
      entries: [
        {
          title: 'Perception Engineer',
          org: 'Triton AI @ UC San Diego, La Jolla, CA',
          when: { start: '2026-09', end: 'present' },
          bullets: [
            'Building the perception stack for a physical autonomous vehicle on the student autonomy team (Python/C++, ROS2).',
            "Stood up the vehicle's first full sensing suite, calibrating front and rear cameras and a 360° LiDAR into one synchronized frame.",
          ],
        },
        {
          title: 'Undergraduate Researcher, Reinforcement Learning',
          org: 'Department of Cognitive Science, UC San Diego, under Prof. Lucy Lai',
          when: { start: '2026-07', end: 'present' },
          bullets: [
            'Reformulating the Bellman equation to reproduce procrastination in sequential decision-making, fitting agents trained in Python/PyTorch to human data to test whether temporal discounting alone accounts for self-control failure.',
          ],
          link: { label: 'View the code on GitHub', href: 'https://github.com/RamiAbukhater/Procrastination' },
        },
        {
          title: 'Technical Lead, Sensor Simulation & Navigation',
          org: 'Selene Nanorobotics, San Diego, CA',
          when: { start: '2026-06', end: 'present' },
          note: 'Previously R&D Intern, Computational Mapping & Signal Fusion.',
          bullets: [
            "Built the company's first software stack to ship on the complete nanorobotic platform, a physics-grounded sensing and localization simulator (Python, FastAPI, React/Three.js) with magnetic and acoustic pulse-echo sensor models.",
            'Settled whether 3D localization was physically achievable with a Cramér–Rao bound analysis, then replaced a non-converging sequential EKF with a batch-MAP estimator that holds micron-scale tracking error in simulation against a 2 mm requirement gate.',
            'Cut confidently-wrong canal reconstructions in simulation from 2 of 6 random draws to 0 by cross-validating independent magnetic and acoustic fits.',
            'Proposed and now leads the next phase, a closed-loop design-optimization system running Bayesian optimization over robot geometry and sensor placement, replacing hand-tuned parameter sweeps.',
          ],
        },
        {
          title: 'VP of Project Operations, Research',
          org: 'DataWorks @ UC San Diego, La Jolla, CA',
          when: { start: '2026-03', end: 'present' },
          bullets: [
            "Leads the club's audio-perception lab, building a shared STFT/log-mel featurization pipeline that feeds audio embeddings as tokens into a VLM-style multimodal transformer, benchmarked against task-specific classifiers.",
            'Sets technical direction for 10+ teams shipping end-to-end data-science projects to real business clients.',
          ],
        },
        {
          title: 'VP of Corporate Relations',
          org: 'DataWorks @ UC San Diego, La Jolla, CA',
          when: { start: '2026-03', end: 'present' },
          bullets: [
            'Built a program giving students hands-on business development experience through direct outreach to local businesses, and secured a new consulting partnership through in-person relationship building.',
            'Represents the club to outside companies and community partners.',
          ],
        },
      ],
    },

    {
      id: 'past-roles',
      title: 'Past Roles',
      type: 'entries',
      entries: [
        {
          title: 'Undergraduate Researcher',
          org: 'Polaris Research Group, Cupertino, CA, under Prof. Rich Booher',
          when: { start: '2025-03', end: '2025-06' },
          bullets: [
            'Researched philosophical theories of mind and cognition through a computational lens, with literature reviews spanning philosophy of consciousness and cognitive science.',
            'Theorized and prototyped PyTorch models as computational testbeds for exploring theories of consciousness.',
          ],
        },
        {
          title: 'Senator & Flea Market Committee Liaison',
          org: 'De Anza Student Government, Cupertino, CA',
          when: { start: '2024-09', end: '2025-06' },
          bullets: [
            'Led a 10+ intern team organizing the monthly De Anza Flea Market, coordinating directly with vendors and the public.',
            'Presented at student-government sessions to drive engagement and inform campus budget decisions.',
            'Collected and analyzed vendor and attendance data to inform marketing strategy and event planning.',
          ],
        },
        {
          title: 'Intern Coordinator',
          org: 'FAPAC Internship Program, Cupertino, CA',
          when: { start: '2023-09', end: '2025-06' },
          bullets: [
            'Managed and mentored a team of 6 interns, training new members on program systems and procedures.',
            'Coordinated 100+ volunteers across multiple political campaigns, handling scheduling and on-the-ground logistics.',
            'Liaised between campus organizations and leaders, and ran weekly strategic meetings.',
          ],
        },
        {
          title: 'Founder & President',
          org: 'De Anza Game Developers Club',
          when: { start: '2023-09', end: '2024-06' },
          bullets: [
            "Hosted the college's first Game Jam.",
            'Ran development workshops teaching C# and the Unity game engine.',
          ],
        },
        {
          title: 'Eagle Scout & Senior Patrol Leader',
          org: 'Boy Scouts of America',
          when: { end: '2023-07', prefix: 'Through' },
          bullets: [
            'Planned and led weekly meetings for 70+ scouts and adult leaders.',
            'Mentored 20+ scouts into leadership roles.',
          ],
        },
      ],
    },

    {
      id: 'projects',
      title: 'Projects',
      type: 'list',
      intro: { text: 'Full write-ups are on the ', link: { label: 'projects page', href: '../projects/' }, after: '.' },
      items: [
        { text: 'VIA, Cognitively-Grounded Vision-Language-Action Model', when: { start: '2026', end: 'present' } },
        { text: 'Room Mesh to MuJoCo Simulation Environment', when: { start: '2026', end: 'present' } },
        { text: 'Macro Optimizer, Constrained Meal Optimization', when: { end: '2026' } },
        { text: 'PiCar Lane Following and Obstacle Avoidance', when: { end: '2026' } },
      ],
    },

    {
      id: 'past-projects',
      title: 'Past Projects',
      type: 'list',
      items: [
        { text: 'BinTek, CV-Assisted Data Pipeline', when: { end: '2026-01' } },
        { text: 'Menu Generator, Full-Stack Web App', when: { end: '2025-07' } },
        { text: 'RoboNurse, DA Hacks 3.5 hackathon award winner', when: { end: '2024-05' } },
      ],
    },

    {
      id: 'education',
      title: 'Education',
      type: 'entries',
      entries: [
        {
          title: 'B.S. in Data Science',
          org: 'University of California, San Diego, La Jolla, CA',
          when: { end: '2027-06', prefix: 'Expected' },
          bullets: [
            'Minors in Mathematics and Philosophy of Cognitive Science.',
            'Coursework in Machine Learning, Autonomous Vehicles, Probabilistic Modeling & Machine Learning, Optimization for Data Science, Systems for Scalable Analytics, Design & Analysis of Algorithms, and Mathematical Statistics.',
          ],
        },
        {
          title: 'A.S. in Mathematics, Computer Science, and Economics',
          org: 'De Anza College, Cupertino, CA',
          when: { end: '2025-06' },
          bullets: [
            'Coursework in Data Structures & Algorithms, Systems Programming (C++), Linear Algebra, Multivariable Calculus, Differential Equations, Discrete Math, Physics, and Circuit Analysis.',
          ],
        },
      ],
    },

    {
      id: 'skills',
      title: 'Skills',
      type: 'skills',
      groups: [
        { label: 'Languages', items: 'Python, C++, C#, SQL, JavaScript, R, Bash/Unix' },
        {
          label: 'Perception & Autonomy',
          items: 'Computer vision, LiDAR and camera sensor fusion, camera calibration, SLAM, Kalman filtering (EKF), ROS2',
        },
        {
          label: 'ML & Modeling',
          items:
            'PyTorch, OpenCV, YOLOv8, transformers and multimodal (VLM/VLA) architectures, audio featurization (STFT/log-mel), reinforcement learning, Bayesian optimization, integer optimization',
        },
        {
          label: 'Tools & Infra',
          items:
            'Git, FastAPI, REST APIs, PostgreSQL, SQLite, HDF5, React/Node.js, NumPy, SciPy, Pandas, Scikit-learn, pytest, Weights & Biases',
        },
      ],
    },

    {
      id: 'awards',
      title: 'Awards',
      type: 'list',
      items: [
        { text: 'DA Hacks 3.5 Hackathon Award, for RoboNurse', when: { end: '2024-05' } },
        { text: 'Eagle Scout, Boy Scouts of America', when: { end: '2023-07' } },
      ],
    },

    {
      id: 'writing',
      title: 'Academic Writing',
      type: 'entries',
      entries: [
        {
          title: 'Philosophical Foundations for Bayesian Emotion Modeling',
          org: 'Graduate seminar paper, PHIL 236 Philosophy of Mind, Prof. Matthew Fulkerson',
          when: { end: '2026-05' },
          text:
            'Argued that constructionist theories of emotion (Russell, Barrett) provide the most philosophically coherent grounding for Bayesian predictive-processing models of affect, evaluated against somatic, cognitive-evaluative, and attitudinal accounts.',
        },
      ],
    },
  ],
};
