import otpGenerator from 'otp-generator';
import https from 'https';

export const generateOtp = () => {
    return Number(
        otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
        }),
    );
};

// MSG91 OTP sender
export const sendOtpViaMSG91 = (mobile, otp) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: "POST",
            hostname: process.env.MSG91_HOST,
            path: process.env.MSG91_FLOW_PATH,
            headers: {
                authkey: process.env.MSG91_AUTH_KEY,
                "content-type": "application/json",
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(parsed);
                    } else {
                        console.error("MSG91 Error Response:", parsed);
                        // Even if MSG91 fails, we might not want to reject hard if we are in dev, but for now strict.
                        // Actually, let's include the error message.
                        reject(new Error(parsed.error?.message || "MSG91 API error"));
                    }
                } catch (e) {
                    console.error("MSG91 Parse Error:", data);
                    reject(new Error("Failed to parse MSG91 response"));
                }
            });
        });

        req.on("error", (e) => {
            console.error("MSG91 Network Error:", e);
            reject(e);
        });

        const body = JSON.stringify({
            flow_id: process.env.MSG91_FLOW_ID,
            sender: process.env.MSG91_SENDER,
            mobiles: `${process.env.MSG91_COUNTRY_CODE}${mobile}`,
            otp: String(otp),
        });

        req.write(body);
        req.end();
    });
};
