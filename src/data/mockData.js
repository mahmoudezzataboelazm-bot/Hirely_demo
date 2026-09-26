export const seedData = {
  user: {
    id: "u1",
    name: "Sarah Al-Farsi",
    email: "sarah.alfarsi@hirely.com",
    role: "company-admin",
    title: "Senior Talent Acquisition Partner & Admin",
    company: "Hirely Tech Hub",
    location: "Riyadh, KSA"
  },
  company: {
    id: "c1",
    name: "Hirely Tech Hub",
    industry: "Technology",
    size: "51-200",
    plan: "Growth",
    monthly: 249
  },
  jobs: [
    {id:"j1", title:"Senior Product Designer", department:"Design", location:"Dubai, UAE", status:"Screening", applicants:142, aiMatch:75, daysOpen:12, assignedTo:"Sarah Johnson"},
    {id:"j2", title:"Fullstack Engineer (React/Node)", department:"Engineering", location:"Riyadh, KSA", status:"Interview", applicants:86, aiMatch:60, daysOpen:5, assignedTo:"Mark Davies"},
    {id:"j3", title:"Marketing Director", department:"Growth", location:"Remote", status:"Assessment", applicants:214, aiMatch:82, daysOpen:24, assignedTo:"Elena Rodriguez"},
    {id:"j4", title:"Customer Success Lead", department:"Success", location:"Cairo, Egypt", status:"Hired", applicants:45, aiMatch:90, daysOpen:0, assignedTo:"Omar Khaled"},
    {id:"j5", title:"QA Specialist", department:"Engineering", location:"Amman, Jordan", status:"Paused", applicants:31, aiMatch:40, daysOpen:32, assignedTo:"Layla Smith"},
    {id:"j6", title:"HR Generalist", department:"People Ops", location:"Riyadh, KSA", status:"Draft", applicants:0, aiMatch:0, daysOpen:0, assignedTo:"Sarah Johnson"}
  ],
  candidates: [
    {id:"cnd1", name:"Omar Al-Farsi", jobId:"j1", stage:"Applied", score:80, skills:["Figma Mastery","Arabize UI"], email:"omar@example.com", experience:7, education:"Bachelor's Degree"},
    {id:"cnd2", name:"Layla Mahmoud", jobId:"j1", stage:"Applied", score:65, skills:["React.js"], email:"layla@example.com", experience:3, education:"Bachelor's Degree"},
    {id:"cnd3", name:"Zaid Khalil", jobId:"j1", applicationId:"app1", stage:"Screening", score:90, skills:["Design Systems"], email:"zaid@example.com", experience:8, education:"Master's Degree"},
    {id:"cnd4", name:"Fatima Nour", jobId:"j1", stage:"Interview", score:75, skills:["User Research"], email:"fatima@example.com", experience:6, education:"Bachelor's Degree"}
  ],
  team: [
    {id:"tm1", name:"Sarah Johnson", email:"sarah@hirely.com", role:"Recruiter", status:"Active"},
    {id:"tm2", name:"Mark Davies", email:"mark@hirely.com", role:"Recruiter", status:"Active"},
    {id:"tm3", name:"Layla Smith", email:"layla@hirely.com", role:"Recruiter", status:"Pending"}
  ],
  talentPool: [
    {id:"tp1", candidateId:"cnd2", name:"Layla Mahmoud", tags:["React Expert","Follow up Q1 2026"], owner:"Sarah Al-Farsi"}
  ],
  announcements: [
    {id:"a1", type:"New Feature", date:"Oct 24, 2023", title:"Introducing AI-Powered Matching Score 2.0", text:"Our latest update improves candidate ranking by analyzing semantic context in resumes and job descriptions.", featured:true},
    {id:"a2", type:"News", date:"Oct 22, 2023", title:"Annual Talent Summit Registrations Open", text:"Join us for the 2023 Talent Summit and discuss MENA recruitment trends."},
    {id:"a3", type:"Maintenance", date:"Oct 20, 2023", title:"Scheduled Database Optimization", text:"Routine maintenance is scheduled between 02:00 AM and 04:00 AM."},
    {id:"a4", type:"New Feature", date:"Oct 18, 2023", title:"Multi-Channel Interview Invitations", text:"Send interview invitations through integrated channels."},
    {id:"a5", type:"News", date:"Oct 15, 2023", title:"Quarterly Performance Reports Ready", text:"Download Q3 hiring performance reports from Analytics."},
    {id:"a6", type:"Policy Update", date:"Oct 12, 2023", title:"Updated Data Privacy Guidelines", text:"Data handling policies were updated to comply with regional regulations."}
  ],
  applications: [
    {id:"app1", jobId:"j1", candidateId:"cnd3", jobTitle:"Senior Product Designer", company:"Hirely Tech Hub", stage:"Screening", score:78, status:"Under Review"},
    {id:"app2", jobId:"j2", jobTitle:"Fullstack Engineer (React/Node)", company:"Hirely Tech Hub", stage:"Rejected", score:32, status:"Rejected", feedback:"Skills match was below the role threshold."}
  ]
};

export const stages = ["Applied","Screening","Shortlisted","Interview","Assessment","Offer","Hired","Rejected","Withdrawn"];
