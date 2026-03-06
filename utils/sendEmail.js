import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // Check if email configuration is set
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        throw new Error('Email configuration not set. Please configure SMTP_EMAIL and SMTP_PASSWORD in .env file');
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Define the email options
    const message = {
        from: `${process.env.FROM_NAME || 'Smart Scheduler'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // Actually send the email
    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

export default sendEmail;
