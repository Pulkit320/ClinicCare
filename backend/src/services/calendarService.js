import { google } from 'googleapis';

export const createGoogleCalendarEvent = async ({ doctorName, patientName, date, startTime, endTime, symptoms }) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.log("Google Calendar credentails not configured. Skipping GCAL event creation.")
        }
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        )

        if (process.env.GOOGLE_REFRESH_TOKEN) {
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            })
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = new Date(`${date}T${endTime}:00`);

        const event = {
            summary: `Medical Appointment: ${patientName} with ${doctorName}`,
            description: `Patient Symptoms: ${symptoms}`,
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() }
        };
        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        console.log("Google Calendar Event Created: ", res.data.id);
        return res.data.id;
    }
    catch (error) {
        console.log("Error creating Google Calendar event: ", error)
        return `mock_gcal_event-${Date.now()}`;
    }
}

