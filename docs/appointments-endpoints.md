## Guia del Get
http://localhost:3000/appointments/

## Guia del Get Id
http://localhost:3000/appointments/1 "verificar antes si existe esa id"

## Guia del post
  ID_Patients ---/-- Debe de haber un paciente ya creado--/---
  ID_medics ---/-- Debe de haber un medico ya creado --/---
  appointmentType ---/-- Tipo de consulta --/---
  appointmentDatetime ---/-- Fecha de la consulta --/---
  status ---/ Status --/---
  notes ---/-- Notas de los sintomas del paciente --/---

  Ejemplo

{
  "ID_Patients": 1,
  "ID_medics": 1,
  "appointmentType": "Consulta general",
  "appointmentDatetime": "2025-10-22T10:00:00.000Z",
  "status": "PENDING",
  "notes": "Paciente con dolor abdominal"
}

## Guia del Delete
DELETE /appointments/5
Host: localhost:3000
Content-Type: application/json