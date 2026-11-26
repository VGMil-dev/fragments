import { useState } from "react";
import { BookOpen, CheckCheck, ChevronDown, Code2, Dumbbell, FolderKanban, Home, Image, Lightbulb, LogOut, Menu, UserRound, X } from "lucide-react";
import type { StudentMe } from "@fragments/contracts";
import { BrandMark } from "../../components/brand/BrandMark";
import "./student-sidebar.css";

type StudentSidebarProps = {
  path: string;
  student: StudentMe;
  navigate: (path: string) => void;
  onOpenMentor: () => void;
};

const academicLinks = [
  { path: "/student/dashboard", label: "Mi espacio", icon: Home },
  { path: "/student/classrooms", label: "Mis aulas", icon: BookOpen },
  { path: "/student/projects", label: "Mis proyectos", icon: FolderKanban },
  { path: "/student/submissions", label: "Mis entregas", icon: CheckCheck },
] as const;

const toolLinks = [
  { path: "/student/gallery", label: "Galería", icon: Image },
  { path: "/student/mentor", label: "Mentor", icon: Lightbulb },
  { path: "/student/review", label: "Review", icon: Code2 },
  { path: "/student/trainer", label: "Trainer", icon: Dumbbell },
] as const;

export function StudentSidebar({ path, student, navigate, onOpenMentor }: StudentSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activePath = path === "/student" ? "/student/dashboard" : path;
  const displayName = student.githubLogin ? `@${student.githubLogin}` : "Cuenta de estudiante";
  const initials = student.githubLogin?.slice(0, 2).toUpperCase() ?? "ES";

  function go(destination: string) {
    setMobileMenuOpen(false);
    if (destination === "/student/mentor") onOpenMentor();
    navigate(destination);
  }

  function renderLinks(links: typeof academicLinks | typeof toolLinks) {
    return links.map(({ path: destination, label, icon: Icon }) => (
      <a
        key={destination}
        className={`student-sidebar__link${activePath === destination ? " is-active" : ""}`}
        href={destination}
        aria-current={activePath === destination ? "page" : undefined}
        onClick={(event) => { event.preventDefault(); go(destination); }}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </a>
    ));
  }

  return (
    <>
      <a className="student-sidebar__skip" href="#student-content">Saltar al contenido</a>
      <aside className="student-sidebar" aria-label="Navegación estudiantil">
        <div className="student-sidebar__top">
          <a className="student-sidebar__brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }} aria-label="Fragments, ir al inicio">
            <BrandMark className="student-sidebar__mark" />
            <span>FRAGMENTS<span className="student-sidebar__period">.</span></span>
          </a>
          <button className="student-sidebar__mobile-toggle" type="button" aria-expanded={mobileMenuOpen} aria-controls="student-sidebar-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="sr-only">{mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}</span>
          </button>
        </div>

        <nav id="student-sidebar-navigation" className={`student-sidebar__navigation${mobileMenuOpen ? " is-open" : ""}`} aria-label="Secciones para estudiantes">
          <div className="student-sidebar__group">
            <p className="student-sidebar__heading">ACADEMIA</p>
            {renderLinks(academicLinks)}
          </div>
          <div className="student-sidebar__group student-sidebar__group--tools">
            <p className="student-sidebar__heading">HERRAMIENTAS</p>
            {renderLinks(toolLinks)}
          </div>
        </nav>

        <div className="student-sidebar__account">
          {student.profileUrl && student.githubLogin ? (
            <a className="student-sidebar__identity" href={student.profileUrl} target="_blank" rel="noreferrer">
              {student.avatarUrl ? <img src={student.avatarUrl} alt="" /> : <span className="student-sidebar__avatar"><UserRound size={16} aria-hidden="true" /></span>}
              <span className="student-sidebar__identity-copy"><strong>{displayName}</strong><small>Cuenta GitHub</small></span>
              <ChevronDown className="student-sidebar__external-mark" size={15} aria-hidden="true" />
            </a>
          ) : (
            <div className="student-sidebar__identity" aria-label="Cuenta de estudiante">
              <span className="student-sidebar__avatar">{initials}</span>
              <span className="student-sidebar__identity-copy"><strong>{displayName}</strong><small>Cuenta Fragments</small></span>
            </div>
          )}
          <button className="student-sidebar__logout" type="button" onClick={() => { void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).finally(() => navigate("/student/login")); }}>
            <LogOut size={16} aria-hidden="true" /><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
