// const twilio = require("twilio");

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // this.client = twilio(
      //   process.env.TWILIO_ACCOUNT_SID,
      //   process.env.TWILIO_AUTH_TOKEN
      // );
    }
  }

  async sendVerificationSMS(phoneNumber, code) {
    if (!this.client) {
      console.log("Twilio not configured, SMS verification disabled");
      return { success: false, error: "SMS service not configured" };
    }

    try {
      const message = await this.client.messages.create({
        body: `Your Price Master Game verification code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("SMS sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsAppVerification(phoneNumber, code) {
    if (!this.client) {
      console.log("Twilio not configured, WhatsApp verification disabled");
      return { success: false, error: "WhatsApp service not configured" };
    }

    try {
      const message = await this.client.messages.create({
        body: `🏆 Price Master Game\n\nYour verification code is: *${code}*\n\nThis code expires in 10 minutes.\n\nReady to play? Let's test your price knowledge!`,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("WhatsApp sending failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();
