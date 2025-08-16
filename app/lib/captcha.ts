const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY || "");
    formData.append("response", token);

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Error verifying captcha:", error);
    return false;
  }
}
