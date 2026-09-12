import { Inspector } from "../components/Inspector";

export default function DemoPage() {
  return (
    <main className="container wide">
      <h1>Bytes and visible text</h1>
      <p className="lede">
        Use the examples to inspect hidden codepoints and pattern matches.
        The highlighted view displays the input's characters; it does not
        simulate a model's interpretation or prove how an agent would act.
      </p>
      <Inspector />
    </main>
  );
}
