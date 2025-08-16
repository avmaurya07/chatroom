import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  try {
    // Read the HTML file
    const filePath = path.join(process.cwd(), "app", "sse-test.html");
    const htmlContent = readFileSync(filePath, "utf-8");

    // Set the correct content type
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error serving SSE test page:", error);
    return new Response("Error loading test page", { status: 500 });
  }
}
