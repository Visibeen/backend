const nodemailer = require('nodemailer')
const admin = require('firebase-admin');
//const serviceAccount = require('../config/firebaseConfig.json');
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });
const axios = require('axios');
const { getIoInstance } = require('../socket');
function removeCountryCode(phoneNumber) {
    return phoneNumber.replace(/^(\+91)/, '');
}
// const sendPushNotification = async (notification_data) => {
//     try {
//         var message = {
//             token: notification_data.device_token,
//             notification: {
//                 title: 'Indilink Notification',
//                 body: notification_data.messages,
//             },
//             data: {
//                 ...notification_data
//             }
//         };
//         const response = await admin.messaging().send(message);
//         console.log('Notification sent:', response);
//     } catch (error) {
//         if (error.code === 'messaging/registration-token-not-registered') {
//         } else {
//             console.error('Error sending notification:', error);
//         }
//     }
// };
const sendMail = async (otp) => {
    try {
        let email = "tech.support@indilink.in"
        const data = {
            host: "smtp.zoho.in",
            port: 587,
            SMTPAuth: true,
            SLL: true,
            secure: false,
            auth: {
                user: `${email}`,
                pass: "Ghw3Sbgci6Em"
            }
        }
        var transporter = nodemailer.createTransport(data);
        const mailOptions = {
            from: `Indilink <${email}>`,
            to: otp.email,
            subject: "Your Verification OTP",
            text: `Your OTP is: ${otp.otp}`
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return false
            } else {
                console.log("Email sent: " + info.response);
                return true
            }
        })
    } catch (error) {
        throw error;
    }
}
const sendOtp = async (otp, toNumber) => {
    try {
        toNumber = removeCountryCode(toNumber);
        let data = JSON.stringify({
            "sender": "INCOLD",
            "unicode": true,
            "message": {
                "recipient": "",
                "text": `The login OTP is ${282821}`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173208356256281"
            }
        });
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/send?username=indicoldconvootp.trans&password=3QFhm&unicode=true&from=INCOLD&to=${toNumber}&text=${otp}%20is%20your%20login%20OTP.%20Treat%20this%20as%20confidential.%20INDICOLD%20will%20never%20call%20you%20to%20verify%20your%20OTP.%0D%0A%0D%0A${otp}%20%E0%A4%86%E0%A4%AA%E0%A4%95%E0%A4%BE%20%E0%A4%B2%E0%A5%89%E0%A4%97%E0%A4%BF%E0%A4%A8%20%E0%A4%93%E0%A4%9F%E0%A5%80%E0%A4%AA%E0%A5%80%20%E0%A4%B9%E0%A5%88%E0%A5%A4%20%E0%A4%87%E0%A4%B8%E0%A5%87%20%E0%A4%97%E0%A5%8B%E0%A4%AA%E0%A4%A8%E0%A5%80%E0%A4%AF%20%E0%A4%B0%E0%A4%96%E0%A5%87%E0%A4%82%E0%A5%A4%20INDICOLD%20%E0%A4%86%E0%A4%AA%E0%A4%95%E0%A5%8B%20%E0%A4%85%E0%A4%AA%E0%A4%A8%E0%A4%BE%20%E0%A4%93%E0%A4%9F%E0%A5%80%E0%A4%AA%E0%A5%80%20%E0%A4%B8%E0%A4%A4%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%AA%E0%A4%BF%E0%A4%A4%20%E0%A4%95%E0%A4%B0%E0%A4%A8%E0%A5%87%20%E0%A4%95%E0%A5%87%20%E0%A4%B2%E0%A4%BF%E0%A4%8F%20%E0%A4%95%E0%A4%AD%E0%A5%80%20%E0%A4%95%E0%A5%89%E0%A4%B2%20%E0%A4%A8%E0%A4%B9%E0%A5%80%E0%A4%82%20%E0%A4%95%E0%A4%B0%E0%A5%87%E0%A4%97%E0%A4%BE%E0%A5%A4%0D%0A%0D%0ATeam%20INDICOLD&dltContentId=1107173208356256281`,
            headers: {}
        };
        axios.request(config)
            .then((response) => {
                console.log(JSON.stringify(response.data));
            })
            .catch((error) => {
                console.log(error);
            });

    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}
const sendVerificationMessage = async (phone_number, documentName, fullName) => {
    try {
        const body = {
            "sender": "INCOLD",
            "unicode": false,
            "message": {
                "recipient": phone_number,
                "text": `Hi ${fullName} Your ${documentName} has been successfully verified.Team Indicold`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173218878597937",
            }
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/message?username=indicoldconvootp.trans&password=3QFhm&unicode=false&from=INCOLD&to=${phone_number}&text=Hi&TeamIndicold&dltContentId=1107173218878597937`,
            headers: {
                Authorization: `Basic ${Buffer.from("indicoldconvootp.trans:3QFhm").toString("base64")}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
        };
        axios.request(config)
            .then((response) => {
                console.log('SMS sent successfully:', response.data);
            })
            .catch((error) => {
                console.log('Error sending SMS:', error);
            });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
const sendAssetVerifiedMessagse = async (phone_number, fullName, assetName) => {
    try {
        const body = {
            "sender": "INCOLD",
            "unicode": false,
            "message": {
                "recipient": phone_number,
                "text": `Hi ${fullName} Your ${assetName} has been successfully verified.Team Indicold`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173218878597937",
            }
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/message?username=indicoldconvootp.trans&password=3QFhm&unicode=false&from=INCOLD&to=${phone_number}&text=Hi&TeamIndicold&dltContentId=1107173218878597937`,
            headers: {
                Authorization: `Basic ${Buffer.from("indicoldconvootp.trans:3QFhm").toString("base64")}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
        };
        axios.request(config)
            .then((response) => {
                console.log('SMS sent successfully:', response.data);
            })
            .catch((error) => {
                console.log('Error sending SMS:', error);
            });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
const sendMoveVerifiedMessage = async (phone_number, fullName) => {
    try {
        const body = {
            "sender": "INCOLD",
            "unicode": false,
            "message": {
                "recipient": phone_number,
                "text": `Hi ${fullName} Your Move has been successfully verified.Team Indicold`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173218878597937",
            }
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/message?username=indicoldconvootp.trans&password=3QFhm&unicode=false&from=INCOLD&to=${phone_number}&text=Hi&TeamIndicold&dltContentId=1107173218878597937`,
            headers: {
                Authorization: `Basic ${Buffer.from("indicoldconvootp.trans:3QFhm").toString("base64")}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
        };
        axios.request(config)
            .then((response) => {
                console.log('SMS sent successfully:', response.data);
            })
            .catch((error) => {
                console.log('Error sending SMS:', error);
            });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
const sendPreparVerifiedMessage = async (phone_number, fullName) => {
    try {
        const body = {
            "sender": "INCOLD",
            "unicode": false,
            "message": {
                "recipient": phone_number,
                "text": `Hi ${fullName} Your prepare has been successfully verified.Team Indicold`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173218878597937",
            }
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/message?username=indicoldconvootp.trans&password=3QFhm&unicode=false&from=INCOLD&to=${phone_number}&text=Hi&TeamIndicold&dltContentId=1107173218878597937`,
            headers: {
                Authorization: `Basic ${Buffer.from("indicoldconvootp.trans:3QFhm").toString("base64")}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
        };
        axios.request(config)
            .then((response) => {
                console.log('SMS sent successfully:', response.data);
            })
            .catch((error) => {
                console.log('Error sending SMS:', error);
            });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
const socketEventEmit = async (eventName, data) => {
    let io = getIoInstance();
    return io.emit(eventName, data);
}
const sendCustomerSMS = async (phone_number, quotationUid) => {
    try {
        const body = {
            "sender": "INCOLD",
            "unicode": false,
            "message": {
                "recipient": phone_number,
                "text": `Indilink: Query received ${quotationUid}. Expect a response in 24 hrs.No reply needed`
            },
            "extra": {
                "corelationid": "",
                "dltContentId": "1107173218878597937",
            }
        };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://sms.timesapi.in/api/v1/message?username=indicoldconvootp.trans&password=3QFhm&unicode=false&from=INCOLD&to=${phone_number}&text=Hi&TeamIndicold&dltContentId=1107173218878597937`,
            headers: {
                Authorization: `Basic ${Buffer.from("indicoldconvootp.trans:3QFhm").toString("base64")}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
        };
        axios.request(config)
            .then((response) => {
                console.log('SMS sent successfully:', response.data);
            })
            .catch((error) => {
                console.log('Error sending SMS:', error);
            });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
};
const sendEmail = async (recipients, subject, htmlContent) => {
    try {
        const email = "tech.support@indilink.in";
        const transporter = nodemailer.createTransport({
            host: "smtp.zoho.in",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: email,
                pass: "Ghw3Sbgci6Em"
            }
        });

        const mailOptions = {
            from: `IndiLink <${email}>`,
            to: Array.isArray(recipients) ? recipients.join(", ") : recipients,
            subject: subject,
            html: htmlContent,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return true;
    } catch (error) {
        console.error("Failed to send email:", error);
        return false;
    }
};
module.exports = {
    sendEmail,
    socketEventEmit,
    //sendPushNotification,
    sendMail,
    sendOtp,
    sendVerificationMessage,
    sendAssetVerifiedMessagse,
    sendMoveVerifiedMessage,
    sendPreparVerifiedMessage,
    sendCustomerSMS,
}