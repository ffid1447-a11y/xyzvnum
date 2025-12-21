import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";

const AES_KEY = "RTO@N@1V@$U2024#";
const AES_ALGORITHM = "aes-128-ecb";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "base64";

function encrypt(plaintext, key) {
  const keyBuffer = Buffer.from(key, INPUT_ENCODING);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, keyBuffer, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plaintext, INPUT_ENCODING, OUTPUT_ENCODING);
  encrypted += cipher.final(OUTPUT_ENCODING);
  return encrypted;
}

function decrypt(ciphertextBase64, key) {
  try {
    const keyBuffer = Buffer.from(key, INPUT_ENCODING);
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, keyBuffer, null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(
      ciphertextBase64,
      OUTPUT_ENCODING,
      INPUT_ENCODING
    );
    decrypted += decipher.final(INPUT_ENCODING);
    return decrypted;
  } catch {
    return null;
  }
}

function decryptApiResponse(encryptedResponse) {
  if (typeof encryptedResponse === "string") {
    const decrypted = decrypt(encryptedResponse, AES_KEY);
    if (decrypted) {
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }
  }
  return encryptedResponse;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET method allowed" });
  }

  const vehicle_number = req.query.vehicle_number;

  if (!vehicle_number) {
    return res.status(400).json({
      error: "Please provide vehicle_number parameter",
    });
  }

  try {
    const encryptedRc = encrypt(vehicle_number, AES_KEY);

    const formData = new FormData();
    formData.append("4svShi1T5ftaZPNNHhJzig===", encryptedRc);

    const response = await axios.post(
      "https://rcdetailsapi.vehicleinfo.app/api/vasu_rc_doc_details",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000,
      }
    );

    const rcData = decryptApiResponse(response.data);
    const mobile_no = rcData?.data?.[0]?.mobile_no;

    if (!mobile_no) {
      return res.json({ error: "Details not found" });
    }

    return res.json([
      {
        vehicleNumber: vehicle_number.toUpperCase(),
        mobileNo: String(mobile_no),
      },
    ]);
  } catch (err) {
    return res.status(500).json({ error: "API not working" });
  }
}
