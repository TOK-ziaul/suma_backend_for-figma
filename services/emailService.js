const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Price Master Game" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - Price Master Game",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🏆 Price Master</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px;">
              Hello ${userName || "Player"},
            </p>
            <p style="color: #666; font-size: 16px;">
              We received a request to reset your password for your Price Master Game account.
            </p>
            <p style="color: #666; font-size: 16px;">
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, please ignore this email. 
              This link will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Price Master Game. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: `"Price Master Game" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Price Master Game! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🏆 Welcome to Price Master!</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Ready to Test Your Price Knowledge?</h2>
            <p style="color: #666; font-size: 16px;">
              Hello ${userName || "Player"},
            </p>
            <p style="color: #666; font-size: 16px;">
              Welcome to Price Master Game! You're now ready to challenge your friends 
              and test your knowledge of product prices.
            </p>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">🎮 What's Next?</h3>
              <ul style="color: #666;">
                <li>Verify your phone number to unlock all features</li>
                <li>Enjoy your free trial game</li>
                <li>Invite 2-4 friends to play together</li>
                <li>Compete through 4 exciting rounds</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold;
                        display: inline-block;">
                Start Playing Now!
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Price Master Game. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Welcome email sending failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
