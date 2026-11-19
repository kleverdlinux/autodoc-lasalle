# AutoDoc La Salle — Automatización Documental Administrativa

> **Proyecto de Formación Práctica en Empresa (FPE) — SENATI (V Semestre)**  
> **Institución Beneficiaria:** Instituto de Educación Superior Privado San Juan Bautista La Salle (Juliaca)  
> **Equipo de Desarrollo:** Kleverd, Omar, Michel  
> **Período:** 02 de noviembre al 20 de noviembre de 2026  

---

## Descripción del Proyecto

**AutoDoc La Salle** es una aplicación web *Single Page Application* (SPA) diseñada para el Área de Administración y Secretaría Académica del **IESP San Juan Bautista La Salle**. Automatiza la generación de documentos institucionales oficiales (**Constancias de Egresado** e **Informes / Oficios de Trámites**) en formatos **Word (`.docx`)** y **PDF**, procesamiento masivo desde **Excel (`.xlsx` → `.zip`)**, detección automática de etiquetas en plantillas personalizadas, respaldo portátil de documentos, Dashboard de métricas y módulo de Auditoría.

---

## Módulos Principales

1. **Autenticación Institucional:** Portal de acceso con identidad visual institucional (`admin` / `admin2026`), persistencia de sesión y cierre seguro.
2. **Generador Oficial en Vivo (A4):** Formularios dinámicos para *Constancia de Egresado* e *Informe / Oficio*, con concordancia automática de género (`Sr.` / `Srta.`), las 5 carreras oficiales (*Enfermería, Farmacia, Fisioterapia, Optometría, Prótesis Dental*) más escritura libre, vista previa A4 con control de Zoom (`80%`, `90%`, `100%`), impresión PDF limpia y descarga en `.docx` editable.
3. **Lote Masivo (`Excel → ZIP`):** Lectura de nóminas en `.xlsx`/`.csv`, validación visual de DNI en vivo, edición directa en tabla, previsualización A4 individual y descarga masiva empaquetada en `.zip` con barra de progreso.
4. **Motor Universal de Plantillas (`.docx`):** Sube cualquier Word con variables `{{campo}}` y el sistema extrae las etiquetas, construye el formulario y genera el documento conservando su formato original.
5. **Dashboard Ejecutivo & Respaldos Portátiles:** Métricas en tiempo real, gráfico de emisiones por carrera, reapertura/re-descarga de copias Word guardadas y exportación/restauración de respaldos completos en `.json` y Libro de Emisiones en `.xlsx` (sin requerir servidor de base de datos externo).
6. **Auditoría del Sistema:** Bitácora cronológica de inicios de sesión, emisiones, exportaciones y respaldos con filtros, búsqueda y exportación a Excel.

---

## Stack Tecnológico

* **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React
* **Backend & Base de Datos:** Node.js, Express 5, PostgreSQL (`pg`) con inicialización automática de esquema (`database/schema.sql`)
* **Motores Documentales:** `docx`, `docxtemplater`, `pizzip`, `xlsx` (SheetJS), `jszip`, `file-saver`
* **Pruebas Unitarias:** Node.js Native Test Runner (`node:test`)

---

## Comandos Locales

```bash
# Instalar dependencias
npm install

# Ejecutar servidor frontend de desarrollo
npm run dev

# Ejecutar servidor Express + PostgreSQL (usa DATABASE_URL si está configurado)
npm start

# Ejecutar pruebas unitarias (8 pruebas)
npm test

# Compilar para producción
npm run build
```

---

## Despliegue en Render (Web Service + PostgreSQL)

El proyecto incluye [`render.yaml`](render.yaml) (Blueprint oficial de Render) para crear automáticamente el Web Service Node.js y la base de datos PostgreSQL conectada por `DATABASE_URL`:

* **Build Command:** `npm install && npm run build`
* **Start Command:** `npm start`
