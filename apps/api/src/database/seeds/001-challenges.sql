-- Seed: 2 challenges for Phase 1 testing

INSERT INTO challenge (id, title, description, difficulty, topic) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Tu primer condicional',
  'Lumen quiere aprender a tomar decisiones. Enséñale cómo funciona un if/else escribiendo un programa que diga si un número es positivo, negativo o cero.',
  1,
  'Condicionales'
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  'Contando con bucles',
  'Lumen no sabe contar todavía. Escribe un programa que cuente del 1 al 10 usando un bucle for.',
  1,
  'Bucles'
);

-- Phases for challenge 1
INSERT INTO challenge_phase (id, challenge_id, order_index, kind, content) VALUES
(
  'a1a1a1a1-0000-0000-0000-000000000001',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  0,
  'conceptual',
  '{
    "question": "¿Qué hace un if/else? Describe con tus propias palabras cuándo se ejecuta cada bloque.",
    "rubric": "Debe mencionar: condición, bloque verdadero, bloque falso"
  }'
),
(
  'a1a1a1a1-0000-0000-0000-000000000002',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  1,
  'code',
  '{
    "language": "python",
    "starter": "numero = int(input())\n# Escribe tu solución aquí\n",
    "tests": [
      { "stdin": "5",  "expected_stdout": "positivo" },
      { "stdin": "-3", "expected_stdout": "negativo" },
      { "stdin": "0",  "expected_stdout": "cero" }
    ]
  }'
);

-- Hints for conceptual phase
INSERT INTO challenge_hint (phase_id, level, content) VALUES
('a1a1a1a1-0000-0000-0000-000000000001', 1, 'Piensa: ¿alguna vez tomaste una decisión dependiendo de algo? Si llueve, tomo el paraguas. Si no, no. Eso es un if/else.'),
('a1a1a1a1-0000-0000-0000-000000000001', 3, 'Un if/else evalúa una condición booleana. Si es verdadera, ejecuta el primer bloque. Si es falsa, ejecuta el else.'),
('a1a1a1a1-0000-0000-0000-000000000001', 5, 'Estructura: `if condicion: ... else: ...` — Python ejecuta el bloque indentado bajo el if cuando la condición es True, y el else cuando es False.');

-- Hints for code phase
INSERT INTO challenge_hint (phase_id, level, content) VALUES
('a1a1a1a1-0000-0000-0000-000000000002', 1, 'Necesitas comparar el número con cero. ¿Qué operadores de comparación conoces?'),
('a1a1a1a1-0000-0000-0000-000000000002', 3, 'Usa if/elif/else: primero comprueba si numero > 0, luego si numero < 0, y el else cubre el caso cero.'),
('a1a1a1a1-0000-0000-0000-000000000002', 5, 'La salida debe ser exactamente "positivo", "negativo" o "cero" (sin comillas). Usa print() para imprimir el resultado.');

-- Phases for challenge 2
INSERT INTO challenge_phase (id, challenge_id, order_index, kind, content) VALUES
(
  'a2a2a2a2-0000-0000-0000-000000000001',
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  0,
  'conceptual',
  '{
    "question": "¿Cuál es la diferencia entre un bucle for y un bucle while? ¿Cuándo usarías cada uno?",
    "rubric": "Debe mencionar: for para iteraciones conocidas, while para condición indeterminada"
  }'
),
(
  'a2a2a2a2-0000-0000-0000-000000000002',
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  1,
  'code',
  '{
    "language": "python",
    "starter": "# Cuenta del 1 al 10, un número por línea\n",
    "tests": [
      { "stdin": "", "expected_stdout": "1\n2\n3\n4\n5\n6\n7\n8\n9\n10" }
    ]
  }'
);
