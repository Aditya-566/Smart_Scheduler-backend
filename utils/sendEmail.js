import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Define the email options
    const message = {
        from: `${process.env.FROM_NAME || 'Smart Scheduler'} <${process.env.FROM_EMAIL || 'noreply@smartscheduler.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // Actually send the email
    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

export default sendEmail;
