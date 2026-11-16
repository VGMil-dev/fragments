// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../../App";

describe("F16.2 portada pública", () => {
  it("muestra solo marca y acceso real en la cabecera pública", () => {
    window.history.replaceState({}, "", "/");
    const html = renderToStaticMarkup(<App />);
    const header = html.match(/<header class="f162-header"[\s\S]*?<\/header>/)?.[0] ?? "";

    expect(header).toContain("Iniciar sesión");
    expect(header).toContain("Crear cuenta");
    expect(header).toContain("Fragments<span class=\"brand__period\">.</span>");
    expect(header).toContain('src="/brand/fragments-isotipo-recto.svg"');
    expect(header).toContain('width="40" height="32"');
    expect(header.match(/href="\/student\/login"/g)).toHaveLength(2);
    expect(header).not.toContain("Cómo funciona");
  });

  it("unifica beneficios, bienvenida y Comenzar en una franja y conserva secciones útiles", () => {
    window.history.replaceState({}, "", "/");
    const html = renderToStaticMarkup(<App />);
    const hero = html.match(/<section class="f162-hero"[\s\S]*?<\/section>/)?.[0] ?? "";

    expect(hero).toContain("Fragments");
    expect(hero).toContain("Sueña · Crea · Conecta");
    expect(hero).toContain("Desarrollo sin límites");
    expect(hero).toContain("Ideas que inspiran");
    expect(hero).toContain("Comunidad unida");
    expect(hero.match(/stroke-width="1\.8"/g)).toHaveLength(3);
    expect(hero.match(/<svg\b(?=[^>]*aria-hidden="true")[^>]*>/g)).toHaveLength(4);
    expect(hero.match(/class="f162-benefit-full"/g)).toHaveLength(3);
    expect(hero.match(/(?:aria-hidden="true" class="f162-benefit-short"|class="f162-benefit-short" aria-hidden="true")/g)).toHaveLength(3);
    expect(hero).toContain("Un nuevo capítulo comienza...");
    expect(hero).toMatch(/<a class="f162-start" href="\/student\/login"[^>]*>[\s\S]*?Comenzar/);
    expect(hero.match(/>Comenzar</g)).toHaveLength(1);
    expect(hero.match(/class="f162-dock"/g)).toHaveLength(1);
    expect(html).toContain("Cada proyecto empieza");
    expect(html).toContain("Área docente");
  });

  it("usa el poster WebP del video decorativo y conserva el marco del hero", () => {
    window.history.replaceState({}, "", "/");
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("/f16-4/hero-poster.webp");
    expect(html).not.toContain("/f16-2/moonlit-fragments.webp");
    expect(html).toContain('width="1280" height="720"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain("/f16-4/hero-motion.webm");
  });
});
