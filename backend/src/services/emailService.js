import nodemailer from 'nodemailer';

const createTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
};

export const sendBookingConfirmationEmail = async ({ patientEmail, patientName, doctorName, date, startTime, endTime }) => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: '"ClinicCare Appointments" <no-reply@cliniccare.com>',
            to: patientEmail,
            subject: `Appointment Confirmation with ${doctorName}`,
            html: `
                 <h2>Appointment Confirmation</h2>
                <p>Hello <strong>${patientName}</strong>,</p>
                <p>Your appointment has been successfully confirmed!</p>
                <ul>
                    <li><strong>Doctor:</strong> ${doctorName}</li>
                    <li><strong>Date:</strong> ${date}</li>
                    <li><strong>Time:</strong> ${startTime} - ${endTime}</li>
                </ul>
                <p>Thank you for choosing ClinicCare!</p>
            `
        });
        console.log(`Booking Confirmation Email sent to ${patientEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info) || "Sent via SMTP"}`);
    }
    catch (error) {
        console.log("Error sending email", error);
    }
};

export const sendCancellationEmail = async ({ patientEmail, patientName, date, slotTime, reason }) => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: "\"ClinicCare Appointments\" <no-reply@cliniccare.com>",
            to: patientEmail,
            subject: `Appointment Cancelled for ${date}`,
            html: `
                <h2>Appointment Cancelled</h2>
                <p>Hello <strong>${patientName}</strong>,</p>
                <p>Your appointment at <strong>${slotTime}</strong> has been cancelled.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>If you have any questions, please contact the clinic.</p>
                <p>Thank you for using ClinicCare.</p>
            `
        });
        console.log(`Cancellation Email sent to ${patientEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info) || "Send via SMTP"}`);
    }
    catch (error) {
        console.log("Error sending cancellation email", error);
    }
};

