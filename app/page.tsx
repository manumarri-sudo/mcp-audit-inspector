import Link from "next/link";
import { Inspector } from "./components/Inspector";

export default function HomePage() {
  return (
    <main className="container wide">
      <p className="kicker">MCP tool description inspector</p>
      <h1>See the text behind a tool description.</h1>
      <p className="lede">
        Inspect hidden Unicode, suspicious instructions and description/schema
        mismatches, with a score that shows its deductions. Paste raw text or a
        nonempty tools/list JSON response to begin.
      </p>
      <Inspector />
      <hr />
      <h2>Understand the result</h2>
      <p className="muted">
        The scanner checks text patterns without calling an AI model or executing
        tools. Its score helps prioritize human review; it does not establish that
        a tool is malicious or safe. For multiple tools, the displayed score and
        deductions belong to the lowest-scoring tool.
      </p>
      <p className="muted">
        Connection configurations are not accepted because they do not contain
        the actual tool descriptions. Obtain the descriptions from your client
        or a tools/list response, and remove credentials before pasting.
      </p>
      <p><Link href="/methodology">Read the scoring rules and limitations</Link></p>
    </main>
  );
}
