export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SseTestPage() {
  return (
    <div>
      <h1>SSE Stream Test Page</h1>
      <p>
        Access the test page at: <a href="/api/sse-test">/api/sse-test</a>
      </p>
      <p>
        This page provides a visual tool to test if your SSE streams are working
        correctly.
      </p>
    </div>
  );
}
