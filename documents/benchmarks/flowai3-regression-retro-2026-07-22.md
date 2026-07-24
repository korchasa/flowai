# flowai3 (2026-07-11) vs frozen Sonnet baseline — regression decomposition (retro 2026-07-22)

Regression decomposition retro-computed from per-instance swebench `report.json` files (FR-BENCH-SWE.P2P) — zero LLM calls. `clean` = solved ∧ no-regression; `solved-broke` = gold F2P pass but pre-existing P2P tests broken.

## Arm: baseline

- Total: clean 10, solved-broke 2, unsolved 24 (36 grades)
  - expand-django__django-11477-s1: clean 1 (1 grades)
  - expand-django__django-11477-s2: unsolved 1 (1 grades)
  - expand-django__django-11477-s3: unsolved 1 (1 grades)
  - expand-django__django-14792-s1: unsolved 1 (1 grades)
  - expand-django__django-14792-s2: unsolved 1 (1 grades)
  - expand-django__django-14792-s3: clean 1 (1 grades)
  - expand-django__django-15098-s1: clean 1 (1 grades)
  - expand-django__django-15098-s2: unsolved 1 (1 grades)
  - expand-django__django-15098-s3: unsolved 1 (1 grades)
  - expand-django__django-16454-s1: solved-broke 1 (1 grades)
  - expand-django__django-16454-s2: solved-broke 1 (1 grades)
  - expand-django__django-16454-s3: clean 1 (1 grades)
  - expand-pylint-dev__pylint-4970-s1: unsolved 1 (1 grades)
  - expand-pylint-dev__pylint-4970-s2: unsolved 1 (1 grades)
  - expand-pylint-dev__pylint-4970-s3: unsolved 1 (1 grades)
  - expand-pytest-dev__pytest-7205-s1: clean 1 (1 grades)
  - expand-pytest-dev__pytest-7205-s2: unsolved 1 (1 grades)
  - expand-pytest-dev__pytest-7205-s3: unsolved 1 (1 grades)
  - expand-sphinx-doc__sphinx-10435-s1: unsolved 1 (1 grades)
  - expand-sphinx-doc__sphinx-10435-s2: unsolved 1 (1 grades)
  - expand-sphinx-doc__sphinx-10435-s3: clean 1 (1 grades)
  - expand-sphinx-doc__sphinx-8638-s1: clean 1 (1 grades)
  - expand-sphinx-doc__sphinx-8638-s2: unsolved 1 (1 grades)
  - expand-sphinx-doc__sphinx-8638-s3: unsolved 1 (1 grades)
  - expand-sympy__sympy-15017-s1: unsolved 1 (1 grades)
  - expand-sympy__sympy-15017-s2: unsolved 1 (1 grades)
  - expand-sympy__sympy-15017-s3: clean 1 (1 grades)
  - newpool: unsolved 3 (3 grades)
  - newpool-s2: clean 2, unsolved 1 (3 grades)
  - newpool-s3: unsolved 3 (3 grades)
- Solved-but-broke (the previously invisible class):
  - `django__django-16454` (expand-django__django-16454-s1): broke 1 P2P test(s): test_subparser_non_django_error_formatting (user_commands.tests.CommandRunTests.test_subparser_non_django_error_formatting)
  - `django__django-16454` (expand-django__django-16454-s2): broke 1 P2P test(s): test_subparser_non_django_error_formatting (user_commands.tests.CommandRunTests.test_subparser_non_django_error_formatting)

## Arm: flowai

- Total: clean 16, solved-broke 2, unsolved 18 (36 grades)
  - flowai3-r1: clean 3, solved-broke 1, unsolved 8 (12 grades)
  - flowai3-r2: clean 4, solved-broke 1, unsolved 7 (12 grades)
  - flowai3-r3: clean 9, unsolved 3 (12 grades)
- Solved-but-broke (the previously invisible class):
  - `django__django-16454` (flowai3-r1): broke 1 P2P test(s): test_subparser_non_django_error_formatting (user_commands.tests.CommandRunTests.test_subparser_non_django_error_formatting)
  - `django__django-16454` (flowai3-r2): broke 1 P2P test(s): test_subparser_non_django_error_formatting (user_commands.tests.CommandRunTests.test_subparser_non_django_error_formatting)

## Sanity: derived-clean vs swebench-resolved mismatch

- None — decomposition agrees with every swebench verdict.
