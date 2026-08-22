import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;


export const generatePreVisitSummary = async (symptoms) => {
    const defaultFallback = {
        urgency: "MEDIUM",
        chiefComplaint: symptoms.substring(0, 100),
        question: [
            "What could be causing these symptoms?",
            "Are there any specific lifestyle changes recommended?",
            "What signs should I moniter that would indicate worsening?"
        ],
        rawText: `Symptoms recored : ${symptoms}`
    };

    if (!ai) {
        console.warn("AI IS NOT INITIALIZED");
        return defaultFallback;
    }

    try {
        const prompt = `Analyze these patient symptoms and return a JSON object with keys:
        -"urgency": ("Low","Medium", "High")
        -"chiefComplaint": concise summary of the primary complaint
        -"question" : array of exactly 3 suggested questions for the doctor
        
        Symptoms: ${symptoms} `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(response.text);

        return {
            urgency: (parsed.urgency || "MEDIUM").toUpperCase(),
            chiefComplaint: parsed.chiefComplaint || symptoms,
            questions: parsed.question || defaultFallback.questions,
            rawText: response.text
        };
    } catch (error) {
        console.error("AI SUMMARIZATION FAILED", error)
        return defaultFallback
    }
};

export const generatePostVisitSummary = async (clinicalNotes) => {
    const defaultFallback = {
        patientSummary: clinicalNotes,
        medicationSchedule: "Take prescribed medications as directed by your physician.",
        followUpSteps: "Return for follow-up if symptoms persist or worsen.",
        rawText: clinicalNotes
    };

    if (!ai) {
        console.warn("AI IS NOT INITIALIZED");
        return defaultFallback;
    }

    try {
        const prompt = `Convert these clinical notes into a patient-friendly JSON object with keys:
- "patientSummary": easy-to-understand patient summary of the visit
- "medicationSchedule": schedule of prescribed medications (name, dosage, frequency)
- "followUpSteps": actionable next steps and follow-up guidance
Clinical Notes: ${clinicalNotes}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const parsed = JSON.parse(response.text);

        return {
            patientSummary: parsed.patientSummary || clinicalNotes,
            medicationSchedule: parsed.medicationSchedule || defaultFallback.medicationSchedule,
            followUpSteps: parsed.followUpSteps || defaultFallback.followUpSteps,
            rawText: response.text
        };
    } catch (error) {
        console.error("AI POST-VISIT SUMMARY FAILED", error);
        return defaultFallback;
    }
}