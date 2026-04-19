## ¿Qué hace esta PR?

<!-- Una o dos frases. Qué problema resuelve o qué feature agrega. -->

---

## Cambios importantes

<!-- Lista los cambios estructurales, nuevas dependencias, decisiones de arquitectura. -->

- 
- 

---

## Archivos clave

<!-- Solo los que un revisor debería leer para entender el cambio. -->

| Archivo | Por qué importa |
|---------|----------------|
|  |  |

---

## Cómo probarlo

<!-- Pasos exactos para verificar que funciona. Sin ambigüedad. -->

```bash
# 1. Levantar servicios
docker compose up

# 2. ...
```

- [ ] Caso 1: ...
- [ ] Caso 2: ...

### Tests automáticos
```bash
cd e2e && npx playwright test --headed
```

---

## Decisiones técnicas

<!-- Solo si hay algo no obvio. Por qué se hizo así y no de otra forma. -->

---

## Checklist

- [ ] Tests E2E pasan
- [ ] No hay `console.log` ni código debug
- [ ] `CLAUDE.md` actualizado si cambió la arquitectura
- [ ] Sin `Co-Authored-By` en los commits
