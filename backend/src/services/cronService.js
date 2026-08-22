import cron from 'node-cron';
import prisma from '../config/db.js';
import { sendBookingConfirmationEmail } from './emailService.js';

export const initCronJobs = () => {
    console.log("Background Medication Reminder Cron Jon Initialized.");

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const dueReminders = await prisma.medicationReminder.findMany({
                where: {
                    isSent: false,
                    nextRunAt: {
                        lte: now
                    }
                },
                include: {
                    patient: { select: { name: true, email: true } }
                }
            });
            if (dueReminders.length > 0) {
                console.log(`Processing ${dueReminders.length} due medication reminder(s)....`);
                for (const reminder of dueReminders) {
                    console.log(`Sending medication remainder to ${reminder.patient.email} for ${reminder.medicineName}...`);
                    await prisma.medicationReminder.update({
                        where: { id: reminder.id },
                        data: {
                            isSent: true,
                        }
                    });
                }
            }
        }
        catch (error) {
            console.log(error);
        }
    })
}
