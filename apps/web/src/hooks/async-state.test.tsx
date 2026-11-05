import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AsyncStateView, type AsyncState } from "./async-state";

describe("AsyncStateView", () => {
  it("announces a finite loading state", () => {
    const state: AsyncState<string> = { status: "loading" };

    const html = renderToStaticMarkup(<AsyncStateView<string> state={state} render={(value) => value} />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando información");
    expect(html).toContain("Puedes esperar aquí");
  });

  it("explains an empty state and offers the supplied next action", () => {
    const state: AsyncState<string> = { status: "empty" };

    const html = renderToStaticMarkup(
      <AsyncStateView<string> state={state} render={(value) => value} emptyAction={<a href="/proponer">Proponer una idea</a>} />,
    );

    expect(html).toContain("Todavía no hay contenido");
    expect(html).toContain("Proponer una idea");
  });

  it("shows a safe recovery action without rendering server error details", () => {
    const retry = vi.fn();
    const state: AsyncState<string> = { status: "error", retry };

    const html = renderToStaticMarkup(<AsyncStateView<string> state={state} render={(value) => value} />);

    expect(html).toContain("No pudimos cargar esta información");
    expect(html).toContain("Intentar de nuevo");
    expect(html).not.toContain("token");
  });

  it("renders only the caller's contract-validated success content", () => {
    const state: AsyncState<{ name: string }> = { status: "success", data: { name: "Ada" } };

    const html = renderToStaticMarkup(
      <AsyncStateView<{ name: string }> state={state} render={(profile) => <p>Hola, {profile.name}</p>} />,
    );

    expect(html).toContain("Hola, Ada");
  });
});
