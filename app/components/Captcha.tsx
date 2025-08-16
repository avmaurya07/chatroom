"use client";

import React from "react";
import { Turnstile } from "@marsidev/react-turnstile";

interface CaptchaProps {
  onVerify: (token: string) => void;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify }) => {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  console.log("Turnstile site key:", siteKey);

  if (!siteKey) {
    console.error(
      "Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY environment variable"
    );
    return null;
  }

  return (
    <div className="my-4 flex justify-center">
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => {
          console.log("Turnstile success, token length:", token.length);
          onVerify(token);
        }}
        onError={(error) => {
          console.error("Turnstile error occurred:", error);
        }}
        options={{
          theme: "light",
          size: "normal",
          appearance: "always",
        }}
      />
    </div>
  );
};

export default Captcha;
