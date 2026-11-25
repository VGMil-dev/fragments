# CU-27 — Inspector desde una Review académica

## Problema

Inspector debe poder convertir una evaluación Review ya persistida de una entrega propia en una defensa docente trazable al commit revisado. Las pruebas existentes cubren Inspector con una Review fixture aislada; no demostraban el enlace de la misión académica a través de Review y la persistencia PostgreSQL compartida.

## Objetivo

Ampliar el test de integración académico para recorrer la entrega final de una misión, su Review persistida, la creación/asignación de un reto Inspector y el registro/recuperación de la defensa con el SHA exacto. La guía docente debe conservarse como dato privado de la respuesta docente.

## Límites

- Solo fixtures de QA y PostgreSQL local `fragments_test`.
- Proveedores Review e Inspector fake etiquetados; no invocar IA/GitHub externos ni ejecutar código estudiantil.
- Sin cambios de runtime, contratos, migraciones, datos productivos ni despliegue.
- El resultado cubre CI automatizado, no sustituye el recorrido autenticado con Ego Lite.
