import { BrandMark } from "./components/brand/BrandMark";

export function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Fragments, ir al inicio">
          <BrandMark className="brand__icon" />
          <span className="brand__name">fragments<span className="brand__period">.</span></span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#para-quien">Para estudiantes</a>
        </nav>
        <a className="header-link" href="#como-funciona">Empezar <span aria-hidden="true">↗</span></a>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" />TU ESPACIO PARA APRENDER HACIENDO</p>
            <h1 id="hero-title">Una idea.<br />Muchos <span className="highlight">fragmentos.</span></h1>
            <p className="hero__lead">Aprende programación construyendo proyectos propios, paso a paso y con guía en el camino.</p>
            <a className="button button--primary" href="#como-funciona">Descubrir cómo empezar <span className="button__arrow" aria-hidden="true">→</span></a>
            <p className="hero__note"><img src="/flower.svg" alt="" width="24" height="36" />Imagina. Construye. Demuestra.</p>
          </div>
          <div className="hero__art" aria-label="Ilustración de una computadora rodeada de plantas y piezas de código" role="img">
            <div className="art-frame"><img src="/hero-fragments.webp" alt="" fetchPriority="high" width="1774" height="944" /></div>
            <span className="art-label"><span aria-hidden="true">✳</span>ideas en proceso</span>
          </div>
          <div className="hero__footnote"><span>01</span>APRENDER CON PROYECTOS REALES</div>
        </section>

        <section className="intro" id="para-quien" aria-labelledby="intro-title">
          <div className="intro__tag">MENOS RECETAS, MÁS DESCUBRIMIENTOS</div>
          <div>
            <h2 id="intro-title">Lo que imaginas<br />también se puede <span>programar.</span></h2>
            <p>Empieza con una idea que te importe. Fragments te ayuda a convertirla en un proyecto, entender lo que construyes y mostrar cómo lo hiciste.</p>
          </div>
        </section>

        <section className="steps" id="como-funciona" aria-labelledby="steps-title">
          <div className="steps__heading">
            <p className="eyebrow">TU CAMINO, A TU RITMO</p>
            <h2 id="steps-title">Cada proyecto empieza<br />con un primer paso.</h2>
          </div>
          <ol className="steps__list">
            <li><span className="step-number">01</span><div><h3>Encuentra una idea</h3><p>Elige algo que te dé curiosidad y dale una forma propia.</p></div><img src="/sparkle.svg" alt="" width="28" height="28" /></li>
            <li><span className="step-number">02</span><div><h3>Construye y aprende</h3><p>Avanza por partes, con orientación para seguir descubriendo.</p></div><img src="/flower.svg" alt="" width="24" height="36" /></li>
            <li><span className="step-number">03</span><div><h3>Demuestra lo que hiciste</h3><p>Explica tus decisiones y comparte el resultado de tu proceso.</p></div><span className="step-check" aria-hidden="true">✓</span></li>
          </ol>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div className="closing__ornament" aria-hidden="true"><span>✳</span><span>✳</span><span>✳</span></div>
          <p className="eyebrow">TU SIGUIENTE PROYECTO TE ESPERA</p>
          <h2 id="closing-title">¿Qué te gustaría<br />hacer realidad?</h2>
          <a className="button button--light" href="#como-funciona">Descubrir cómo empezar <span className="button__arrow" aria-hidden="true">→</span></a>
          <p className="closing__caption">Una idea a la vez. Un fragmento a la vez.</p>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand brand--footer" href="#inicio" aria-label="Fragments, volver al inicio"><BrandMark className="brand__icon" /><span className="brand__name">fragments<span className="brand__period">.</span></span></a>
        <p>Imagina. Construye. Demuestra.</p>
        <span>Hecho para aprender creando <span aria-hidden="true">✳</span></span>
      </footer>
    </>
  );
}
