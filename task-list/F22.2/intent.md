# F22.2 — Solicitudes y matrículas académicas observables

## Problema

La consola F22.1 muestra diagnósticos técnicos de solicitudes HTTP, pero no permite consultar el estado real de las solicitudes académicas de ingreso a aulas. El personal autorizado necesita una vista administrativa de solo lectura basada en matrículas persistidas.

## Objetivo

Ofrecer una lectura admin paginada de solicitudes/matrículas existentes con estado, aula, área, período, origen y marcas de tiempo. No mostrar identidad, correo, IDs de usuario, contexto privado del aula ni datos sensibles.

## Límites

La fase no aprueba, rechaza, elimina ni crea matrículas, no cambia roles, no modifica esquema ni crea persistencia. Los datos provienen de `ClassEnrollment` existente. La API exige un verificador admin inyectado; integrar auth y rutas compartidas corresponde al arquitecto.
