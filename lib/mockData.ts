// Mock data mirroring the PhysioVision backend API responses.

export const livePatients = [
  { id: 1, name: "Lim Wei Jie", station: "A1", exercise: "Knee Extension", color: "#00bcd4", status: "active" },
  { id: 2, name: "Tan Mei Ling", station: "A2", exercise: "Shoulder Flex", color: "#2dd4bf", status: "active" },
  { id: 3, name: "Goh Hock Seng", station: "B1", exercise: "Hip Bridge", color: "#38bdf8", status: "active" },
  { id: 4, name: "Siti Rahman", station: "B2", exercise: "Ankle Dorsi", color: "#a78bfa", status: "active" },
];

export const metrics = [
  { title: "Active Patients", value: "24", unit: "", trend: { value: "12%", positive: true }, spark: [20, 22, 21, 24, 23, 25, 24] },
  { title: "Sessions Today", value: "68", unit: "", trend: { value: "8%", positive: true }, spark: [50, 55, 52, 60, 58, 64, 68] },
  { title: "Avg Movement Score", value: "82", unit: "/100", trend: { value: "3%", positive: true }, spark: [78, 80, 79, 81, 80, 82, 82] },
  { title: "Alerts (24h)", value: "5", unit: "", trend: { value: "2", positive: false }, spark: [2, 3, 4, 3, 5, 4, 5] },
];

export const jointAngles = [
  { name: "Right Knee", value: 95, target: 110 },
  { name: "Left Knee", value: 92, target: 110 },
  { name: "Right Hip", value: 78, target: 90 },
  { name: "Lumbar Flex", value: 45, target: 60 },
];

export const riskLevels = [
  { label: "Low Risk", value: 18, color: "#2dd4bf" },
  { label: "Moderate", value: 22, color: "#fbbf24" },
  { label: "High Risk", value: 9, color: "#f87171" },
];

export const recoveryTrend = {
  dates: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  rom: [62, 68, 74, 79, 85, 90, 96, 101],
  quality: [58, 64, 69, 73, 78, 81, 84, 87],
  adherence: [80, 85, 82, 90, 88, 92, 95, 93],
};

export const clinicAnalytics = {
  categories: ["Mobility", "Strength", "Balance", "Gait", "Posture"],
  sessions: [142, 98, 76, 64, 53],
};

export const aiRecommendation = {
  riskScore: 22,
  movementScore: 86,
  fatigue: 18,
  compensation: false,
  tips: [
    "Maintain current prescription — patient is on trajectory.",
    "Cue patient to keep torso neutral during knee extension.",
    "Increase target ROM to 110° next week if quality stays > 85.",
  ],
  recommendation: "Progress protocol: add 1 set, monitor compensation weekly.",
};

export const patients = [
  { id: 1, name: "Lim Wei Jie", mrn: "MRN-10042", age: 41, diagnosis: "Post-ACL reconstruction", risk: "Moderate", score: 86, adherence: 92, last: "Today", trend: [60, 68, 74, 79, 85, 90] },
  { id: 2, name: "Tan Mei Ling", mrn: "MRN-10058", age: 35, diagnosis: "Rotator cuff repair", risk: "Low", score: 91, adherence: 96, last: "Today", trend: [70, 75, 80, 84, 88, 91] },
  { id: 3, name: "Goh Hock Seng", mrn: "MRN-10103", age: 58, diagnosis: "Total knee replacement", risk: "High", score: 71, adherence: 78, last: "Yesterday", trend: [50, 54, 58, 62, 66, 71] },
  { id: 4, name: "Siti Rahman", mrn: "MRN-10119", age: 29, diagnosis: "Ankle sprain", risk: "Low", score: 89, adherence: 94, last: "Today", trend: [72, 78, 82, 85, 87, 89] },
  { id: 5, name: "Raj Kumar", mrn: "MRN-10144", age: 47, diagnosis: "Lumbar disc herniation", risk: "Moderate", score: 78, adherence: 85, last: "2 days", trend: [55, 60, 65, 70, 74, 78] },
  { id: 6, name: "Chua Seow Ling", mrn: "MRN-10177", age: 52, diagnosis: "Hip arthroplasty", risk: "High", score: 68, adherence: 73, last: "Yesterday", trend: [45, 50, 55, 60, 64, 68] },
];

export const exercises = [
  { code: "KNEE_EXT", name: "Knee Extension", category: "Strength", bodyPart: "Knee", reps: 12, sets: 3, rom: 110, adherence: 91 },
  { code: "SHOULDER_FLX", name: "Shoulder Flexion", category: "Mobility", bodyPart: "Shoulder", reps: 10, sets: 3, rom: 160, adherence: 88 },
  { code: "HIP_BRIDGE", name: "Hip Bridge", category: "Strength", bodyPart: "Hip", reps: 15, sets: 3, rom: 45, adherence: 84 },
  { code: "ANKLE_DORSI", name: "Ankle Dorsiflexion", category: "Mobility", bodyPart: "Ankle", reps: 12, sets: 2, rom: 20, adherence: 90 },
  { code: "LUMBAR_CAT", name: "Lumbar Cat-Cow", category: "Posture", bodyPart: "Spine", reps: 10, sets: 2, rom: 60, adherence: 82 },
  { code: "SINGLE_LEG", name: "Single-Leg Stance", category: "Balance", bodyPart: "Lower limb", reps: 30, sets: 3, rom: 0, adherence: 79 },
];

export const reports = [
  { id: 1, patient: "Lim Wei Jie", date: "2026-07-29", type: "SOAP Auto", quality: 86, risk: "Moderate", plan: "Maintain prescription; review in 1 week." },
  { id: 2, patient: "Tan Mei Ling", date: "2026-07-29", type: "SOAP Auto", quality: 91, risk: "Low", plan: "Progress: add resistance band." },
  { id: 3, patient: "Goh Hock Seng", date: "2026-07-28", type: "Manual", quality: 71, risk: "High", plan: "Reduce reps; add form cues." },
  { id: 4, patient: "Siti Rahman", date: "2026-07-28", type: "SOAP Auto", quality: 89, risk: "Low", plan: "Maintain; advance next week." },
];

export const alerts = [
  { id: 1, patient: "Goh Hock Seng", severity: "critical", type: "Compensation", msg: "Pelvic drop detected on left during bridge.", time: "2 min ago" },
  { id: 2, patient: "Chua Seow Ling", severity: "warning", type: "Fatigue", msg: "Fatigue index > 70% in last 3 reps.", time: "9 min ago" },
  { id: 3, patient: "Raj Kumar", severity: "warning", type: "Wrong Form", msg: "Lumbar flexion exceeds safe ROM.", time: "21 min ago" },
];
