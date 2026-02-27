# Guía de Sincronización de Base de Datos

Has conectado una base de datos **NUEVA y VACÍA**. Para que la web funcione, necesitas crear las tablas (schema).

## Paso 1: Actualizar tu archivo .env local
Abre el archivo `.env` en tu ordenador (en la carpeta del proyecto) y **reemplaza** la línea `DATABASE_URL` con la nueva que te ha dado Vercel:

```env
DATABASE_URL="postgresql://neondb_owner:npg_0zK5iEsxWUvc@ep-lingering-smoke-airtws02-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

## Paso 2: Subir las tablas
Abre la terminal en Visual Studio Code y ejecuta:

```bash
npx prisma db push
```

*Verás que crea todas las tablas (User, Company, etc.).*

## Paso 3: Sembrar datos (Opcional pero recomendado)
Como la base de datos está vacía, no tendrás usuario admin. Ejecuta esto para crear los datos básicos:

```bash
npx prisma db seed
```
*(Si falla, avísame. Si no, tendrás el usuario `admin@admin.com` / `admin123` o lo que hayamos configurado).*

## Paso 4: Desplegar en Vercel
Ahora que la base de datos tiene tablas, ve a Vercel y dale a **Redeploy**.
