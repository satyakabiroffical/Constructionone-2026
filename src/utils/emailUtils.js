import nodemailer from "nodemailer";

export const sendEmailOtp = async (toEmail, otpCode) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: "ConstructionsOne - Your Password Reset OTP",
      text: `Your OTP for password reset is: ${otpCode}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #555;">Hello,</p>
          <p style="color: #555;">We received a request to reset your password for your ConstructionsOne account.</p>
          <p style="color: #555;">Your One-Time Password (OTP) is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <h1 style="color: #4A90E2; font-size: 36px; letter-spacing: 5px; margin: 0; background-color: #f5f8fc; padding: 15px; border-radius: 8px; display: inline-block;">${otpCode}</h1>
          </div>
          <p style="color: #555;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
          <p style="color: #555;">If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="color: #888; font-size: 12px;">Best regards,<br/>ConstructionsOne Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] OTP sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Error] Failed to send OTP to ${toEmail}:`, error.message);
    throw error;
  }
};
