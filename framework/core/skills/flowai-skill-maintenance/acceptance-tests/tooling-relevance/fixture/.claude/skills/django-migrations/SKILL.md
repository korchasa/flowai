---
name: django-migrations
description: Manage Django database migrations (makemigrations, migrate, squash).
---

# Django Migrations

## Instructions

1. Run `python manage.py makemigrations` to create new migrations.
2. Run `python manage.py migrate` to apply migrations.
3. Use `python manage.py squashmigrations` to reduce migration count.
4. Always check `models.py` before creating migrations.
