export type CoverTemplate = "generic" | "mobile-app" | "web-project" | "api-service";

const templates: Record<CoverTemplate, { src: string; label: string }> = {
  generic: { src: "project-generic", label: "Composición geométrica" },
  "mobile-app": { src: "project-mobile-app", label: "Aplicación móvil" },
  "web-project": { src: "project-web", label: "Proyecto web" },
  "api-service": { src: "project-api-service", label: "API y servicios" },
};

export function coverTemplateFor(value: string): CoverTemplate {
  if (/\b(api|apis|rest|graphql|backend|servicio|servicios)\b/i.test(value)) return "api-service";
  if (/\b(app|apps|aplicaci[oó]n m[oó]vil|android|ios|mobile)\b/i.test(value)) return "mobile-app";
  if (/\b(web|sitio|portal|p[aá]gina|frontend)\b/i.test(value)) return "web-project";
  return "generic";
}

export function ProjectCover({ template = "generic", title, className }: { template?: CoverTemplate; title: string; className: string }) {
  const cover = templates[template];
  return (
    <div className={className} role="img" aria-label={`Portada ${cover.label.toLocaleLowerCase("es-CO")} para ${title}`}>
      <picture>
        <source srcSet={`/covers/${cover.src}.webp`} type="image/webp" />
        <img src={`/covers/${cover.src}.png`} alt="" width="1200" height="675" loading="lazy" decoding="async" />
      </picture>
    </div>
  );
}
