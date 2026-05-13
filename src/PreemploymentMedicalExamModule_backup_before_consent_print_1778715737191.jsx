import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const fitnessOptions = [
  "Pendiente",
  "Apto para el puesto",
  "Apto con recomendaciones",
  "Apto con restricciones",
  "No apto temporal",
  "No apto para el puesto evaluado",
  "Requiere valoración complementaria",
];

const sexOptions = ["Masculino", "Femenino", "No especificado"];

const jobProfiles = [
  {
    key: "administrativo",
    label: "Administrativo",
    helper: "Oficina, bajo esfuerzo físico, ergonomía básica.",
    blocks: ["visual", "ergonomia"],
  },
  {
    key: "operativo_general",
    label: "Operativo general",
    helper: "Trabajo en piso, bipedestación, actividad física moderada.",
    blocks: ["visual", "movilidad_basica"],
  },
  {
    key: "carga_manual",
    label: "Operativo con carga manual",
    helper: "Carga, empuje, jalón, flexión de tronco o esfuerzo repetido.",
    blocks: ["movilidad_basica", "columna_carga", "hombro_rodilla"],
  },
  {
    key: "montacargas",
    label: "Montacargas / maquinaria móvil",
    helper: "Puesto crítico con conducción o maquinaria móvil.",
    blocks: ["visual_ampliada", "equilibrio", "neurologico_seguridad"],
  },
  {
    key: "mantenimiento",
    label: "Mantenimiento",
    helper: "Actividad física variable, herramientas, posturas forzadas.",
    blocks: [
      "movilidad_basica",
      "columna_carga",
      "hombro_rodilla",
      "neurologico_seguridad",
    ],
  },
  {
    key: "alturas",
    label: "Trabajo en alturas",
    helper: "Requiere equilibrio, coordinación y ausencia de vértigo/síncope.",
    blocks: ["visual_ampliada", "equilibrio", "neurologico_seguridad"],
  },
  {
    key: "espacios_confinados",
    label: "Espacios confinados",
    helper: "Requiere vigilancia respiratoria, cardiovascular y neurológica.",
    blocks: ["respiratorio_piel", "neurologico_seguridad"],
  },
  {
    key: "ruido",
    label: "Exposición a ruido",
    helper: "Requiere vigilancia auditiva.",
    blocks: ["auditivo"],
  },
  {
    key: "quimicos",
    label: "Exposición a químicos",
    helper: "Requiere vigilancia respiratoria, piel y mucosas.",
    blocks: ["respiratorio_piel"],
  },
  {
    key: "turno_nocturno",
    label: "Turno nocturno / rotativo",
    helper: "Valorar sueño, somnolencia y fatiga.",
    blocks: ["sueno_fatiga"],
  },
  {
    key: "puesto_critico",
    label: "Puesto crítico de seguridad",
    helper: "Actividad donde un evento clínico puede generar accidente grave.",
    blocks: ["visual_ampliada", "equilibrio", "neurologico_seguridad"],
  },
];

const baseBlocks = [
  "datos",
  "perfil",
  "antidoping",
  "antecedentes_clave",
  "signos_vitales",
  "exploracion_general",
  "visual",
  "dictamen",
];

const yesNoOptions = ["", "No", "Sí", "No valorado"];

const statusOptions = ["", "Sin hallazgos", "Con hallazgos", "No valorado"];

const functionalOptions = [
  "",
  "Conservada",
  "Limitada",
  "Dolorosa",
  "Inestable",
  "No valorable",
];

const balanceOptions = [
  "",
  "Normal",
  "Alterada",
  "Inestable",
  "No valorable",
];

const impactOptions = [
  "",
  "Sin impacto ocupacional aparente",
  "Requiere vigilancia",
  "Requiere recomendación",
  "Requiere restricción",
  "Requiere valoración complementaria",
];

const antidopingResults = ["", "Pendiente", "Negativo", "No negativo", "Inválido"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeObject(items, factory) {
  return Object.fromEntries(items.map((item) => [item.key, factory(item)]));
}

function makeJobProfileObject() {
  return Object.fromEntries(jobProfiles.map((profile) => [profile.key, false]));
}

function createInitialForm() {
  return {
    company_id: "",
    plant_id: "",
    exam_date: todayIso(),

    candidate_name: "",
    candidate_identifier: "",
    candidate_phone: "",
    age: "",
    sex: "No especificado",

    job_position: "",
    area: "",
    probable_shift: "",

    job_profiles: makeJobProfileObject(),

    antidoping: {
      performed: "",
      test_date: todayIso(),
      folio: "",
      test_type: "Prueba rápida inmunocromatográfica",
      sample_type: "Orina",
      result: "Pendiente",
      lot_number: "",
      observations: "",
    },

    consent_privacy: {
      privacy_notice_delivered: "",
      privacy_notice_medium: "",
      medical_evaluation_consent: "",
      antidoping_consent: "",
      sensitive_data_consent: "",
      accepted_at: "",
      informed_by: "",
      signature_status: "",
      observations: "",
    },

    key_history: {
      hypertension: "",
      diabetes: "",
      cardiopathy: "",
      asthma: "",
      epilepsy_or_seizures: "",
      syncope: "",
      vertigo: "",
      neurologic_disease: "",
      sedative_medication: "",
      lumbar_pain: "",
      joint_pain: "",
      fracture_or_surgery: "",
      hearing_problem: "",
      skin_allergy: "",
      substance_history: "",
      sleep_disorder: "",
      notes: "",
    },

    vital_signs: {
      systolic_bp: "",
      diastolic_bp: "",
      heart_rate: "",
      respiratory_rate: "",
      temperature: "",
      oxygen_saturation: "",
      weight_kg: "",
      height_m: "",
      bmi: "",
      waist_cm: "",
    },

    general_exam: {
      general_state: { status: "", impact: "", notes: "" },
      gait: { status: "", impact: "", notes: "" },
      orientation_language: { status: "", impact: "", notes: "" },
      cardiopulmonary: { status: "", impact: "", notes: "" },
      abdomen: { status: "", impact: "", notes: "" },
      skin_hydration: { status: "", impact: "", notes: "" },
      neuro_basic: { status: "", impact: "", notes: "" },
      musculoskeletal_basic: { status: "", impact: "", notes: "" },
    },

    visual_exam: {
      right_eye: "",
      left_eye: "",
      both_eyes: "",
      uses_glasses: "",
      color_vision: "",
      confrontation_campimetry: "",
      notes: "",
    },

    ergonomics_exam: {
      posture: { status: "", impact: "", notes: "" },
      workstation_tolerance: { status: "", impact: "", notes: "" },
      repetitive_hand_use: { status: "", impact: "", notes: "" },
    },

    mobility_exam: {
      cervical: { result: "", impact: "", notes: "" },
      lumbar: { result: "", impact: "", notes: "" },
      shoulders: { result: "", impact: "", notes: "" },
      elbows_wrists_hands: { result: "", impact: "", notes: "" },
      hips: { result: "", impact: "", notes: "" },
      knees: { result: "", impact: "", notes: "" },
      ankles_feet: { result: "", impact: "", notes: "" },
      squat: { result: "", impact: "", notes: "" },
      chair_rise: { result: "", impact: "", notes: "" },
      simulated_lift: { result: "", impact: "", notes: "" },
      push_pull: { result: "", impact: "", notes: "" },
    },

    balance_exam: {
      romberg: { result: "", impact: "", notes: "" },
      tandem_gait: { result: "", impact: "", notes: "" },
      tiptoe_gait: { result: "", impact: "", notes: "" },
      heel_gait: { result: "", impact: "", notes: "" },
      single_leg_stance: { result: "", impact: "", notes: "" },
      finger_nose: { result: "", impact: "", notes: "" },
    },

    safety_neuro_exam: {
      seizures_review: "",
      syncope_review: "",
      vertigo_review: "",
      sedatives_review: "",
      alertness: { status: "", impact: "", notes: "" },
      coordination: { status: "", impact: "", notes: "" },
      strength: { status: "", impact: "", notes: "" },
      sensitivity: { status: "", impact: "", notes: "" },
      reflexes: { status: "", impact: "", notes: "" },
    },

    hearing_exam: {
      hearing_symptoms: "",
      tinnitus: "",
      previous_noise_exposure: "",
      otoscopy: { status: "", impact: "", notes: "" },
      audiometry_required: "",
      audiometry_result: "",
      notes: "",
    },

    respiratory_skin_exam: {
      asthma_or_bronchospasm: "",
      dyspnea: "",
      chemical_sensitivity: "",
      skin_lesions: { status: "", impact: "", notes: "" },
      mucosa: { status: "", impact: "", notes: "" },
      respiratory_exam: { status: "", impact: "", notes: "" },
      spirometry_required: "",
      spirometry_result: "",
      notes: "",
    },

    sleep_fatigue_exam: {
      sleep_quality: "",
      daytime_sleepiness: "",
      night_shift_history: "",
      fatigue_risk: "",
      notes: "",
    },

    occupational_risk_summary: "",
    restrictions: "",
    recommendations: "",
    fitness_result: "Pendiente",

    physician_name: "",
    physician_license: "",
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function computeBmi(weightKg, heightM) {
  const weight = toNumberOrNull(weightKg);
  const height = toNumberOrNull(heightM);

  if (!weight || !height) return "";

  const bmi = weight / (height * height);
  return Number.isFinite(bmi) ? bmi.toFixed(1) : "";
}

function getCompanyName(companies, companyId) {
  if (!companyId) return "-";
  return (
    companies.find((company) => company.id === companyId)?.name ||
    "Empresa no identificada"
  );
}

function getPlantName(plants, plantId) {
  if (!plantId) return "-";
  return (
    plants.find((plant) => plant.id === plantId)?.name ||
    "Planta no identificada"
  );
}

function getExamCompanyName(exam, companies) {
  return exam?.companies?.name || getCompanyName(companies, exam?.company_id);
}

function getExamPlantName(exam, plants) {
  return exam?.company_plants?.name || getPlantName(plants, exam?.plant_id);
}

function selectedProfileKeysFromForm(form) {
  return Object.entries(form.job_profiles || {})
    .filter(([, checked]) => Boolean(checked))
    .map(([key]) => key);
}

function selectedProfileKeysFromExam(exam) {
  const profiles = exam?.occupational_history?.job_profiles || {};
  return Object.entries(profiles)
    .filter(([, checked]) => Boolean(checked))
    .map(([key]) => key);
}

function getSelectedProfileLabels(profileKeys) {
  if (!profileKeys?.length) return "Sin perfil definido";

  return profileKeys
    .map((key) => jobProfiles.find((profile) => profile.key === key)?.label)
    .filter(Boolean)
    .join(", ");
}

function getRequiredBlocksFromProfileKeys(profileKeys) {
  const set = new Set(baseBlocks);

  profileKeys.forEach((key) => {
    const profile = jobProfiles.find((item) => item.key === key);
    profile?.blocks?.forEach((block) => set.add(block));
  });

  return Array.from(set);
}

function getRequiredBlocksFromForm(form) {
  return getRequiredBlocksFromProfileKeys(selectedProfileKeysFromForm(form));
}

function getRequiredBlocksFromExam(exam) {
  return getRequiredBlocksFromProfileKeys(selectedProfileKeysFromExam(exam));
}

function isRequiredBlock(form, block) {
  return getRequiredBlocksFromForm(form).includes(block);
}

function isSafetyCritical(profileKeys) {
  return profileKeys.some((key) =>
    [
      "montacargas",
      "alturas",
      "espacios_confinados",
      "puesto_critico",
      "mantenimiento",
    ].includes(key)
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFitnessBadgeClass(value) {
  if (value === "Apto para el puesto") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (value === "Apto con recomendaciones") {
    return "bg-blue-100 text-blue-800";
  }

  if (value === "Apto con restricciones") {
    return "bg-amber-100 text-amber-800";
  }

  if (
    value === "No apto temporal" ||
    value === "No apto para el puesto evaluado"
  ) {
    return "bg-red-100 text-red-800";
  }

  if (value === "Requiere valoración complementaria") {
    return "bg-purple-100 text-purple-800";
  }

  return "bg-zinc-100 text-zinc-700";
}

function getStatusBadgeClass(value) {
  if (value === "Cerrado") return "bg-emerald-100 text-emerald-800";
  if (value === "Cancelado") return "bg-red-100 text-red-800";
  if (value === "Corregido") return "bg-purple-100 text-purple-800";
  return "bg-zinc-100 text-zinc-700";
}

function hasFinding(value) {
  return [
    "Con hallazgos",
    "Limitada",
    "Dolorosa",
    "Inestable",
    "Alterada",
    "No valorable",
    "No valorado",
  ].includes(value);
}

function needsNote(value) {
  return [
    "Con hallazgos",
    "Limitada",
    "Dolorosa",
    "Inestable",
    "Alterada",
    "No valorable",
    "No valorado",
  ].includes(value);
}

function fieldIsEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function validateStatusObject(label, object, blockers, warnings) {
  if (!object?.status) {
    blockers.push(`Falta valorar: ${label}.`);
    return;
  }

  if (needsNote(object.status) && fieldIsEmpty(object.notes)) {
    blockers.push(`Hay hallazgo/no valoración sin descripción en: ${label}.`);
  }

  if (hasFinding(object.status)) {
    warnings.push(`Hallazgo o no valoración en: ${label}.`);
  }
}

function validateFunctionalObject(label, object, blockers, warnings) {
  if (!object?.result) {
    blockers.push(`Falta valorar: ${label}.`);
    return;
  }

  if (needsNote(object.result) && fieldIsEmpty(object.notes)) {
    blockers.push(`Hay hallazgo/no valoración sin descripción en: ${label}.`);
  }

  if (hasFinding(object.result)) {
    warnings.push(`Hallazgo funcional en: ${label}.`);
  }
}

function getVitalWarnings(vitalSigns) {
  const warnings = [];

  const systolic = toNumberOrNull(vitalSigns?.systolic_bp);
  const diastolic = toNumberOrNull(vitalSigns?.diastolic_bp);
  const heartRate = toNumberOrNull(vitalSigns?.heart_rate);
  const saturation = toNumberOrNull(vitalSigns?.oxygen_saturation);
  const temperature = toNumberOrNull(vitalSigns?.temperature);
  const bmi = toNumberOrNull(vitalSigns?.bmi);

  if (systolic >= 180 || diastolic >= 110) {
    warnings.push("TA en rango crítico: requiere valoración antes de cierre.");
  } else if (systolic >= 160 || diastolic >= 100) {
    warnings.push("TA elevada: documentar recomendación o vigilancia.");
  }

  if (heartRate > 120) {
    warnings.push("Frecuencia cardiaca elevada: valorar contexto clínico.");
  }

  if (saturation && saturation < 92) {
    warnings.push("SatO2 baja: requiere valoración clínica.");
  }

  if (temperature && temperature >= 38) {
    warnings.push("Temperatura elevada: valorar proceso agudo.");
  }

  if (bmi && bmi >= 35) {
    warnings.push("IMC elevado: considerar compatibilidad con demanda física.");
  }

  return warnings;
}

function analyzeCurrentForm(form) {
  const blockers = [];
  const warnings = [];
  const profileKeys = selectedProfileKeysFromForm(form);
  const requiredBlocks = getRequiredBlocksFromProfileKeys(profileKeys);

  if (!form.company_id) blockers.push("Falta empresa.");
  if (!form.plant_id) blockers.push("Falta planta.");
  if (!form.exam_date) blockers.push("Falta fecha de examen.");
  if (fieldIsEmpty(form.candidate_name)) blockers.push("Falta nombre del aspirante.");
  if (fieldIsEmpty(form.job_position)) blockers.push("Falta puesto solicitado.");
  if (profileKeys.length === 0) blockers.push("Falta seleccionar perfil ocupacional del puesto.");

  if (form.consent_privacy.privacy_notice_delivered !== "Sí") {


    blockers.push("Falta confirmar entrega de aviso de privacidad.");


  }



  if (!form.consent_privacy.privacy_notice_medium) {


    blockers.push("Falta medio de entrega del aviso de privacidad.");


  }



  if (form.consent_privacy.medical_evaluation_consent !== "Sí") {


    blockers.push("Falta consentimiento para valoración médica ocupacional.");


  }



  if (form.consent_privacy.antidoping_consent !== "Sí") {


    blockers.push("Falta consentimiento específico para antidoping.");


  }



  if (form.consent_privacy.sensitive_data_consent !== "Sí") {


    blockers.push("Falta consentimiento para tratamiento de datos personales sensibles.");


  }



  if (!form.consent_privacy.accepted_at) {


    blockers.push("Falta fecha y hora de aceptación del consentimiento.");


  }



  if (fieldIsEmpty(form.consent_privacy.informed_by)) {


    blockers.push("Falta registrar quién informó y recabó consentimiento.");


  }



  if (


    !["Recabada física", "Recabada digital simple"].includes(


      form.consent_privacy.signature_status


    )


  ) {


    blockers.push("Falta evidencia de firma o aceptación del consentimiento.");


  }



  if (form.antidoping.performed !== "Realizado") {
    blockers.push("Antidoping obligatorio: falta marcarlo como realizado.");
  }

  if (!form.antidoping.test_date) {
    blockers.push("Antidoping obligatorio: falta fecha de toma.");
  }

  if (!form.antidoping.result || form.antidoping.result === "Pendiente") {
    blockers.push("Antidoping obligatorio: falta resultado definitivo.");
  }

  if (["No negativo", "Inválido"].includes(form.antidoping.result)) {
    warnings.push(`Antidoping con resultado: ${form.antidoping.result}.`);
  }

  if (
    !form.vital_signs.systolic_bp ||
    !form.vital_signs.diastolic_bp ||
    !form.vital_signs.heart_rate
  ) {
    blockers.push("Faltan signos vitales mínimos: TA y frecuencia cardiaca.");
  }

  warnings.push(...getVitalWarnings(form.vital_signs));

  validateStatusObject(
    "Estado general",
    form.general_exam.general_state,
    blockers,
    warnings
  );
  validateStatusObject("Marcha", form.general_exam.gait, blockers, warnings);
  validateStatusObject(
    "Cardiopulmonar",
    form.general_exam.cardiopulmonary,
    blockers,
    warnings
  );
  validateStatusObject(
    "Neurológico básico",
    form.general_exam.neuro_basic,
    blockers,
    warnings
  );
  validateStatusObject(
    "Músculo-esquelético básico",
    form.general_exam.musculoskeletal_basic,
    blockers,
    warnings
  );

  if (requiredBlocks.includes("visual")) {
    if (
      fieldIsEmpty(form.visual_exam.right_eye) ||
      fieldIsEmpty(form.visual_exam.left_eye) ||
      fieldIsEmpty(form.visual_exam.both_eyes)
    ) {
      blockers.push("Falta agudeza visual básica.");
    }
  }

  if (requiredBlocks.includes("visual_ampliada")) {
    if (
      fieldIsEmpty(form.visual_exam.color_vision) ||
      fieldIsEmpty(form.visual_exam.confrontation_campimetry)
    ) {
      blockers.push("Falta visión cromática/campimetría para perfil crítico.");
    }
  }

  if (requiredBlocks.includes("ergonomia")) {
    validateStatusObject(
      "Ergonomía / postura",
      form.ergonomics_exam.posture,
      blockers,
      warnings
    );
  }

  if (requiredBlocks.includes("movilidad_basica")) {
    validateFunctionalObject(
      "Movilidad cervical",
      form.mobility_exam.cervical,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Movilidad lumbar",
      form.mobility_exam.lumbar,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Hombros",
      form.mobility_exam.shoulders,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Rodillas",
      form.mobility_exam.knees,
      blockers,
      warnings
    );
  }

  if (requiredBlocks.includes("columna_carga")) {
    validateFunctionalObject(
      "Sentadilla funcional",
      form.mobility_exam.squat,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Levantamiento simulado",
      form.mobility_exam.simulated_lift,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Empuje / jalón",
      form.mobility_exam.push_pull,
      blockers,
      warnings
    );
  }

  if (requiredBlocks.includes("equilibrio")) {
    validateFunctionalObject(
      "Romberg",
      form.balance_exam.romberg,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Marcha en tándem",
      form.balance_exam.tandem_gait,
      blockers,
      warnings
    );
    validateFunctionalObject(
      "Apoyo monopodal",
      form.balance_exam.single_leg_stance,
      blockers,
      warnings
    );
  }

  if (requiredBlocks.includes("neurologico_seguridad")) {
    if (!form.safety_neuro_exam.seizures_review) {
      blockers.push("Falta revisión de convulsiones para perfil crítico.");
    }

    if (!form.safety_neuro_exam.syncope_review) {
      blockers.push("Falta revisión de síncope para perfil crítico.");
    }

    if (!form.safety_neuro_exam.sedatives_review) {
      blockers.push("Falta revisión de medicamentos sedantes para perfil crítico.");
    }

    validateStatusObject(
      "Alerta / estado neurológico",
      form.safety_neuro_exam.alertness,
      blockers,
      warnings
    );
    validateStatusObject(
      "Coordinación",
      form.safety_neuro_exam.coordination,
      blockers,
      warnings
    );

    if (
      form.safety_neuro_exam.seizures_review === "Sí" ||
      form.safety_neuro_exam.syncope_review === "Sí"
    ) {
      warnings.push(
        "Antecedente de convulsiones o síncope en perfil crítico: considerar valoración complementaria."
      );
    }
  }

  if (requiredBlocks.includes("auditivo")) {
    if (!form.hearing_exam.hearing_symptoms) {
      blockers.push("Falta interrogatorio auditivo.");
    }

    validateStatusObject(
      "Otoscopía básica",
      form.hearing_exam.otoscopy,
      blockers,
      warnings
    );

    if (form.hearing_exam.hearing_symptoms === "Sí") {
      warnings.push("Síntomas auditivos referidos: considerar audiometría.");
    }
  }

  if (requiredBlocks.includes("respiratorio_piel")) {
    if (!form.respiratory_skin_exam.asthma_or_bronchospasm) {
      blockers.push("Falta revisión de asma/broncoespasmo.");
    }

    validateStatusObject(
      "Exploración respiratoria",
      form.respiratory_skin_exam.respiratory_exam,
      blockers,
      warnings
    );
    validateStatusObject(
      "Piel",
      form.respiratory_skin_exam.skin_lesions,
      blockers,
      warnings
    );

    if (form.respiratory_skin_exam.asthma_or_bronchospasm === "Sí") {
      warnings.push(
        "Antecedente respiratorio en perfil con químicos/confinados: considerar restricción o vigilancia."
      );
    }
  }

  if (requiredBlocks.includes("sueno_fatiga")) {
    if (!form.sleep_fatigue_exam.daytime_sleepiness) {
      blockers.push("Falta valoración de somnolencia/fatiga para turno nocturno.");
    }

    if (form.sleep_fatigue_exam.daytime_sleepiness === "Sí") {
      warnings.push("Somnolencia diurna referida: riesgo para turno nocturno/rotativo.");
    }
  }

  if (form.fitness_result === "Pendiente") {
    blockers.push("Falta dictamen médico final.");
  }

  if (fieldIsEmpty(form.physician_name)) {
    blockers.push("Falta médico dictaminador.");
  }

  if (fieldIsEmpty(form.physician_license)) {
    blockers.push("Falta cédula profesional.");
  }

  if (warnings.length > 0 && fieldIsEmpty(form.recommendations)) {
    blockers.push("Hay alertas/hallazgos y faltan recomendaciones documentadas.");
  }

  return {
    blockers,
    warnings,
    quality:
      blockers.length > 0 ? "Rojo" : warnings.length > 0 ? "Ámbar" : "Verde",
    requiredBlocks,
    profileKeys,
  };
}

function examToFormLike(exam) {
  const initial = createInitialForm();

  const occupationalHistory = exam?.occupational_history || {};
  const complementary = exam?.complementary_tests || {};
  const physicalExam = exam?.physical_exam || {};
  const balance = exam?.balance_coordination_exam || {};
  const mobility = exam?.mobility_exam || {};
  const visual = exam?.visual_acuity_exam || {};
  const neuro = exam?.neurological_exam || {};

  return {
    ...initial,
    company_id: exam?.company_id || "",
    plant_id: exam?.plant_id || "",
    exam_date: exam?.exam_date || todayIso(),

    candidate_name: exam?.candidate_name || "",
    candidate_identifier: exam?.candidate_identifier || "",
    candidate_phone: exam?.candidate_phone || "",
    age: exam?.age || "",
    sex: exam?.sex || "No especificado",

    job_position: exam?.job_position || "",
    area: exam?.area || "",
    probable_shift: exam?.probable_shift || "",

    job_profiles: {
      ...initial.job_profiles,
      ...(occupationalHistory.job_profiles || {}),
    },

    antidoping: {
      ...initial.antidoping,
      ...(complementary.antidoping || {}),
    },

    consent_privacy: {
      ...initial.consent_privacy,
      ...(complementary.consent_privacy || {}),
    },

    key_history: {
      ...initial.key_history,
      ...(exam?.personal_pathological_history?.key_history || {}),
    },

    vital_signs: {
      ...initial.vital_signs,
      ...(exam?.vital_signs || {}),
    },

    general_exam: {
      ...initial.general_exam,
      ...(physicalExam.general_exam || {}),
    },

    visual_exam: {
      ...initial.visual_exam,
      ...(visual.visual_exam || visual || {}),
    },

    ergonomics_exam: {
      ...initial.ergonomics_exam,
      ...(physicalExam.ergonomics_exam || {}),
    },

    mobility_exam: {
      ...initial.mobility_exam,
      ...(mobility.mobility_exam || mobility || {}),
    },

    balance_exam: {
      ...initial.balance_exam,
      ...(balance.balance_exam || balance || {}),
    },

    safety_neuro_exam: {
      ...initial.safety_neuro_exam,
      ...(neuro.safety_neuro_exam || neuro || {}),
    },

    hearing_exam: {
      ...initial.hearing_exam,
      ...(physicalExam.hearing_exam || {}),
    },

    respiratory_skin_exam: {
      ...initial.respiratory_skin_exam,
      ...(physicalExam.respiratory_skin_exam || {}),
    },

    sleep_fatigue_exam: {
      ...initial.sleep_fatigue_exam,
      ...(physicalExam.sleep_fatigue_exam || {}),
    },

    occupational_risk_summary: exam?.occupational_risk_summary || "",
    restrictions: exam?.restrictions || "",
    recommendations: exam?.recommendations || "",
    fitness_result: exam?.fitness_result || "Pendiente",

    physician_name: exam?.physician_name || "",
    physician_license: exam?.physician_license || "",
  };
}

function analyzeExamRecord(exam) {
  return analyzeCurrentForm(examToFormLike(exam));
}

function suggestFitnessResult(analysis) {
  if (analysis.blockers.some((item) => item.toLowerCase().includes("antidoping"))) {
    return "Pendiente";
  }

  if (
    analysis.warnings.some((item) =>
      item.toLowerCase().includes("no negativo")
    )
  ) {
    return "Requiere valoración complementaria";
  }

  if (
    analysis.warnings.some((item) =>
      [
        "convulsiones",
        "síncope",
        "ta en rango crítico",
        "satO2 baja",
        "perfil crítico",
      ].some((needle) => item.toLowerCase().includes(needle.toLowerCase()))
    )
  ) {
    return "Requiere valoración complementaria";
  }

  if (
    analysis.warnings.some((item) =>
      ["restricción", "dolorosa", "limitada", "funcional"].some((needle) =>
        item.toLowerCase().includes(needle)
      )
    )
  ) {
    return "Apto con restricciones";
  }

  if (analysis.warnings.length > 0) {
    return "Apto con recomendaciones";
  }

  if (analysis.blockers.length === 0) {
    return "Apto para el puesto";
  }

  return "Pendiente";
}

function qualityClasses(quality) {
  if (quality === "Verde") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (quality === "Ámbar") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-900";
}

function buildCompanyCertificateHtml(exam, companies, plants) {
  const companyName = getExamCompanyName(exam, companies);
  const plantName = getExamPlantName(exam, plants);
  const analysis = analyzeExamRecord(exam);
  const profileKeys = selectedProfileKeysFromExam(exam);
  const profileLabel = getSelectedProfileLabels(profileKeys);
  const isClosed = exam.status === "Cerrado";

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dictamen RH/EHS - ${escapeHtml(exam.candidate_name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px;
      font-family: Arial, Helvetica, sans-serif;
      color: #18181b;
      background: #ffffff;
    }
    .page {
      max-width: 850px;
      margin: 0 auto;
      border: 1px solid #d4d4d8;
      padding: 34px;
    }
    .header {
      border-bottom: 4px solid #991b1b;
      padding-bottom: 18px;
      margin-bottom: 26px;
    }
    .brand {
      font-size: 13px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #991b1b;
      font-weight: 900;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 28px;
      line-height: 1.1;
      color: #09090b;
    }
    .subtitle {
      margin-top: 8px;
      color: #52525b;
      font-size: 14px;
    }
    .notice {
      margin: 18px 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: ${isClosed ? "#ecfdf5" : "#fffbeb"};
      color: ${isClosed ? "#065f46" : "#92400e"};
      border: 1px solid ${isClosed ? "#a7f3d0" : "#fde68a"};
      font-weight: 700;
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .box {
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 12px;
      background: #fafafa;
      min-height: 68px;
    }
    .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #71717a;
      font-weight: 900;
      margin-bottom: 6px;
    }
    .value {
      font-size: 15px;
      font-weight: 800;
      white-space: pre-wrap;
    }
    .full {
      grid-column: 1 / -1;
    }
    .dictamen {
      margin: 22px 0;
      padding: 18px;
      border-radius: 14px;
      border: 2px solid #991b1b;
      background: #fff5f5;
    }
    .dictamen .label {
      color: #991b1b;
    }
    .dictamen .value {
      font-size: 22px;
      color: #7f1d1d;
    }
    .footer {
      margin-top: 34px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .signature {
      border-top: 1px solid #18181b;
      padding-top: 10px;
      min-height: 85px;
    }
    .hash {
      margin-top: 20px;
      padding: 12px;
      border-radius: 10px;
      background: #f4f4f5;
      font-family: "Courier New", monospace;
      font-size: 10px;
      word-break: break-all;
      color: #3f3f46;
    }
    .legal {
      margin-top: 24px;
      font-size: 11px;
      line-height: 1.45;
      color: #52525b;
      border-top: 1px solid #e4e4e7;
      padding-top: 14px;
    }
    @media print {
      body { padding: 0; }
      .page { border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div class="brand">SOS — Soluciones Operativas Sierra Madre</div>
      <h1>Dictamen Médico Ocupacional para RH/EHS</h1>
      <div class="subtitle">
        Versión resumida para toma de decisión laboral. No sustituye ni revela el expediente clínico completo.
      </div>
    </section>

    <div class="notice">
      ${
        isClosed
          ? "Documento cerrado digitalmente. Cuenta con firma electrónica simple interna y hash de integridad."
          : "Documento preliminar. El expediente aún no cuenta con cierre digital definitivo."
      }
    </div>

    <section class="grid">
      <div class="box">
        <div class="label">Aspirante</div>
        <div class="value">${escapeHtml(exam.candidate_name || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Identificador</div>
        <div class="value">${escapeHtml(exam.candidate_identifier || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Empresa</div>
        <div class="value">${escapeHtml(companyName)}</div>
      </div>

      <div class="box">
        <div class="label">Planta</div>
        <div class="value">${escapeHtml(plantName)}</div>
      </div>

      <div class="box">
        <div class="label">Fecha de evaluación</div>
        <div class="value">${escapeHtml(formatDate(exam.exam_date))}</div>
      </div>

      <div class="box">
        <div class="label">Puesto evaluado</div>
        <div class="value">${escapeHtml(exam.job_position || "-")}</div>
      </div>

      <div class="box full">
        <div class="label">Perfil ocupacional evaluado</div>
        <div class="value">${escapeHtml(profileLabel)}</div>
      </div>
    </section>

    <section class="dictamen">
      <div class="label">Dictamen médico ocupacional</div>
      <div class="value">${escapeHtml(exam.fitness_result || "Pendiente")}</div>
    </section>

    <section class="grid">
      <div class="box">
        <div class="label">Antidoping</div>
        <div class="value">${escapeHtml(
          exam?.complementary_tests?.antidoping?.result || "-"
        )}</div>
      </div>

      <div class="box">
        <div class="label">Calidad documental</div>
        <div class="value">${escapeHtml(analysis.quality)}</div>
      </div>

      <div class="box full">
        <div class="label">Restricciones funcionales / laborales</div>
        <div class="value">${escapeHtml(
          exam.restrictions || "Sin restricciones registradas."
        )}</div>
      </div>

      <div class="box full">
        <div class="label">Recomendaciones laborales</div>
        <div class="value">${escapeHtml(
          exam.recommendations || "Sin recomendaciones registradas."
        )}</div>
      </div>

      <div class="box full">
        <div class="label">Resumen operativo para RH/EHS</div>
        <div class="value">${escapeHtml(
          exam.occupational_risk_summary ||
            "Sin observaciones operativas adicionales."
        )}</div>
      </div>
    </section>

    <section class="footer">
      <div class="signature">
        <div class="label">Médico dictaminador</div>
        <div class="value">${escapeHtml(exam.physician_name || "-")}</div>
      </div>

      <div class="signature">
        <div class="label">Cédula profesional</div>
        <div class="value">${escapeHtml(exam.physician_license || "-")}</div>
      </div>
    </section>

    <section class="grid" style="margin-top: 18px;">
      <div class="box">
        <div class="label">Estado del expediente</div>
        <div class="value">${escapeHtml(exam.status || "Borrador")}</div>
      </div>

      <div class="box">
        <div class="label">Fecha de cierre</div>
        <div class="value">${escapeHtml(formatDateTime(exam.closed_at))}</div>
      </div>

      <div class="box full">
        <div class="label">Firmado por</div>
        <div class="value">${escapeHtml(exam.closed_by_email || "-")}</div>
      </div>
    </section>

    <div class="hash">
      <strong>Hash de integridad:</strong><br />
      ${escapeHtml(exam.signature_hash || "Sin cierre digital")}
    </div>

    <div class="legal">
      Este dictamen resume únicamente la compatibilidad médico-ocupacional del aspirante con el puesto evaluado.
      La historia clínica completa, antecedentes, exploración física detallada y datos sensibles de salud permanecen bajo resguardo clínico
      y no forman parte de esta versión dirigida a RH/EHS.
    </div>
  </main>
</body>
</html>
`;
}

function printCompanyCertificate(exam, companies, plants) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildCompanyCertificateHtml(exam, companies, plants));
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4 disabled:bg-zinc-100 disabled:text-zinc-500"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <select
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold outline-none ring-red-700/20 focus:ring-4 disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option} value={option}>
              {option || "Seleccionar"}
            </option>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function TextAreaInput({ label, value, onChange, rows = 3, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4 disabled:bg-zinc-100 disabled:text-zinc-500"
      />
    </label>
  );
}

function CheckboxCard({ checked, label, helper, onChange }) {
  return (
    <label
      className={`block cursor-pointer rounded-2xl border p-4 transition ${
        checked
          ? "border-red-700 bg-red-50"
          : "border-zinc-200 bg-white hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1"
        />
        <div>
          <p className="text-sm font-black text-zinc-950">{label}</p>
          {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
        </div>
      </div>
    </label>
  );
}

function Section({ eyebrow, title, children, helper }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">
        {title}
      </h2>
      {helper && <p className="mt-2 text-sm text-zinc-500">{helper}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
      {helper && <p className="mt-2 text-sm text-zinc-500">{helper}</p>}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function StatusRow({ title, value, onChange, options = statusOptions }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 p-4 md:grid-cols-4">
      <SelectInput
        label={title}
        value={value?.status || value?.result || ""}
        onChange={(nextValue) =>
          onChange(value?.hasOwnProperty("result") ? { result: nextValue } : { status: nextValue })
        }
        options={options}
      />

      <SelectInput
        label="Impacto ocupacional"
        value={value?.impact || ""}
        onChange={(nextValue) => onChange({ impact: nextValue })}
        options={impactOptions}
      />

      <div className="md:col-span-2">
        <TextInput
          label="Observaciones / motivo si no valorado"
          value={value?.notes || ""}
          onChange={(nextValue) => onChange({ notes: nextValue })}
        />
      </div>
    </div>
  );
}

function TextBlock({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
        {value || "-"}
      </p>
    </div>
  );
}

function AnalysisPanel({ analysis, suggestedFitness, onApplySuggestion, canApply }) {
  return (
    <section className={`rounded-3xl border p-5 ${qualityClasses(analysis.quality)}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]">
            Semáforo documental
          </p>
          <h3 className="mt-1 text-2xl font-black">
            {analysis.quality}
          </h3>
          <p className="mt-1 text-sm">
            Dictamen sugerido: <strong>{suggestedFitness}</strong>
          </p>
        </div>

        {canApply && (
          <button
            type="button"
            onClick={onApplySuggestion}
            className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white hover:bg-zinc-800"
          >
            Aplicar sugerencia
          </button>
        )}
      </div>

      {analysis.blockers.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white/70 p-4">
          <p className="text-sm font-black">Faltantes que bloquean cierre</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {analysis.blockers.slice(0, 12).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {analysis.blockers.length > 12 && (
            <p className="mt-2 text-xs font-bold">
              +{analysis.blockers.length - 12} faltantes adicionales.
            </p>
          )}
        </div>
      )}

      {analysis.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white/70 p-4">
          <p className="text-sm font-black">Alertas clínicas/ocupacionales</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {analysis.warnings.slice(0, 12).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {analysis.warnings.length > 12 && (
            <p className="mt-2 text-xs font-bold">
              +{analysis.warnings.length - 12} alertas adicionales.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function CompanyCertificatePreview({ exam, companies, plants, onClose, onPrint }) {
  const analysis = analyzeExamRecord(exam);
  const profileKeys = selectedProfileKeysFromExam(exam);
  const isClosed = exam.status === "Cerrado";

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
            Dictamen RH/EHS
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">
            Dictamen médico ocupacional resumido
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-500">
            Esta vista excluye antecedentes, exploración clínica detallada y
            datos sensibles no necesarios para RH/EHS.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
          >
            Imprimir dictamen
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
          isClosed
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {isClosed
          ? "Documento cerrado digitalmente con firma interna y hash de integridad."
          : "Documento preliminar. El expediente aún no está cerrado digitalmente."}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextBlock title="Aspirante" value={exam.candidate_name} />
        <TextBlock title="Identificador" value={exam.candidate_identifier} />
        <TextBlock title="Empresa" value={getExamCompanyName(exam, companies)} />
        <TextBlock title="Planta" value={getExamPlantName(exam, plants)} />
        <TextBlock title="Fecha de evaluación" value={formatDate(exam.exam_date)} />
        <TextBlock title="Puesto evaluado" value={exam.job_position} />
        <TextBlock
          title="Perfil ocupacional"
          value={getSelectedProfileLabels(profileKeys)}
        />
        <TextBlock title="Calidad documental" value={analysis.quality} />
      </div>

      <div className="mt-5 rounded-3xl border-2 border-red-800 bg-red-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-800">
          Dictamen médico ocupacional
        </p>
        <p className="mt-2 text-2xl font-black text-red-950">
          {exam.fitness_result || "Pendiente"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <TextBlock
          title="Antidoping"
          value={exam?.complementary_tests?.antidoping?.result || "-"}
        />
        <TextBlock
          title="Restricciones funcionales / laborales"
          value={exam.restrictions || "Sin restricciones registradas."}
        />
        <TextBlock
          title="Recomendaciones laborales"
          value={exam.recommendations || "Sin recomendaciones registradas."}
        />
        <TextBlock
          title="Resumen operativo para RH/EHS"
          value={
            exam.occupational_risk_summary ||
            "Sin observaciones operativas adicionales."
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextBlock title="Médico dictaminador" value={exam.physician_name} />
        <TextBlock title="Cédula profesional" value={exam.physician_license} />
        <TextBlock title="Estado del expediente" value={exam.status || "Borrador"} />
      </div>

      <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
          Hash de integridad
        </p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-700">
          {exam.signature_hash || "Sin cierre digital"}
        </p>
      </div>
    </section>
  );
}

export default function PreemploymentMedicalExamModule({
  session,
  userRole,
  companies = [],
  plants = [],
}) {
  const [activeTab, setActiveTab] = useState("nuevo");
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [certificateExam, setCertificateExam] = useState(null);

  const canCreate = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDictaminate = ["admin", "medico"].includes(userRole);
  const canDelete = userRole === "admin";

  const availablePlants = useMemo(() => {
    if (!form.company_id) return [];
    return plants.filter((plant) => plant.company_id === form.company_id);
  }, [plants, form.company_id]);

  const currentAnalysis = useMemo(() => analyzeCurrentForm(form), [form]);
  const suggestedFitness = useMemo(
    () => suggestFitnessResult(currentAnalysis),
    [currentAnalysis]
  );

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return exams;

    return exams.filter((exam) => {
      const profileLabels = getSelectedProfileLabels(selectedProfileKeysFromExam(exam));

      const haystack = [
        exam.candidate_name,
        exam.candidate_identifier,
        exam.job_position,
        exam.area,
        exam.fitness_result,
        exam.status,
        exam.companies?.name,
        exam.company_plants?.name,
        profileLabels,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [exams, search]);

  const stats = useMemo(() => {
    return {
      total: exams.length,
      pending: exams.filter((exam) => exam.fitness_result === "Pendiente").length,
      closed: exams.filter((exam) => exam.status === "Cerrado").length,
      fit: exams.filter((exam) => exam.fitness_result === "Apto para el puesto").length,
      restricted: exams.filter((exam) => exam.fitness_result === "Apto con restricciones").length,
    };
  }, [exams]);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    const bmi = computeBmi(
      form.vital_signs.weight_kg,
      form.vital_signs.height_m
    );

    setForm((previous) => ({
      ...previous,
      vital_signs: {
        ...previous.vital_signs,
        bmi,
      },
    }));
  }, [form.vital_signs.weight_kg, form.vital_signs.height_m]);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateNested(section, key, value) {
    setForm((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));
  }

  function updateDeep(section, key, patch) {
    setForm((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: {
          ...previous[section][key],
          ...patch,
        },
      },
    }));
  }

  async function loadExams() {
    setLoading(true);

    const { data, error } = await supabase
      .from("preemployment_medical_exams")
      .select("*, companies:company_id(name), company_plants:plant_id(name)")
      .is("deleted_at", null)
      .order("exam_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert("No se pudieron cargar exámenes de ingreso: " + error.message);
      setLoading(false);
      return;
    }

    setExams(data || []);
    setLoading(false);
  }

  function validateFormForSave() {
    const errors = [];

    if (!form.company_id) errors.push("Selecciona empresa.");
    if (!form.plant_id) errors.push("Selecciona planta.");
    if (!form.exam_date) errors.push("Captura fecha del examen.");
    if (!form.candidate_name.trim()) errors.push("Captura nombre del aspirante.");
    if (!form.job_position.trim()) errors.push("Captura puesto solicitado.");

    if (selectedProfileKeysFromForm(form).length === 0) {
      errors.push("Selecciona al menos un perfil ocupacional del puesto.");
    }

    if (!canDictaminate && form.fitness_result !== "Pendiente") {
      errors.push("Solo médico/admin puede emitir dictamen.");
    }

    return errors;
  }

  function buildPayload() {
    return {
      company_id: form.company_id || null,
      plant_id: form.plant_id || null,
      exam_date: form.exam_date,

      candidate_name: form.candidate_name.trim(),
      candidate_identifier: form.candidate_identifier.trim() || null,
      candidate_phone: form.candidate_phone.trim() || null,
      age: form.age ? Number(form.age) : null,
      sex: form.sex || "No especificado",

      job_position: form.job_position.trim() || null,
      area: form.area.trim() || null,
      probable_shift: form.probable_shift.trim() || null,

      family_history: {},
      personal_pathological_history: {
        key_history: form.key_history,
      },
      personal_non_pathological_history: {},
      occupational_history: {
        job_profiles: form.job_profiles,
        selected_profile_labels: getSelectedProfileLabels(
          selectedProfileKeysFromForm(form)
        ),
      },
      review_of_systems: {},

      vital_signs: form.vital_signs,
      physical_exam: {
        general_exam: form.general_exam,
        ergonomics_exam: form.ergonomics_exam,
        hearing_exam: form.hearing_exam,
        respiratory_skin_exam: form.respiratory_skin_exam,
        sleep_fatigue_exam: form.sleep_fatigue_exam,
      },
      balance_coordination_exam: {
        balance_exam: form.balance_exam,
      },
      mobility_exam: {
        mobility_exam: form.mobility_exam,
      },
      visual_acuity_exam: {
        visual_exam: form.visual_exam,
      },
      neurological_exam: {
        safety_neuro_exam: form.safety_neuro_exam,
      },
      complementary_tests: {
        antidoping: form.antidoping,
        consent_privacy: form.consent_privacy,
      },

      occupational_risk_summary: form.occupational_risk_summary.trim() || null,
      restrictions: form.restrictions.trim() || null,
      recommendations: form.recommendations.trim() || null,
      fitness_result: canDictaminate ? form.fitness_result : "Pendiente",

      physician_name: form.physician_name.trim() || null,
      physician_license: form.physician_license.trim() || null,
    };
  }

  async function saveExam(event) {
    event.preventDefault();

    if (!canCreate) {
      alert("Tu rol no permite capturar exámenes de ingreso.");
      return;
    }

    const errors = validateFormForSave();

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    setSaving(true);

    const payload = buildPayload();

    if (editingId) {
      const { error } = await supabase
        .from("preemployment_medical_exams")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by_user_id: session?.user?.id || null,
          updated_by_email: session?.user?.email || "Sin correo",
        })
        .eq("id", editingId);

      if (error) {
        alert("No se pudo actualizar el examen: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("preemployment_medical_exams")
        .insert({
          ...payload,
          status: "Borrador",
          version: 1,
          created_by_user_id: session?.user?.id || null,
          created_by_email: session?.user?.email || "Sin correo",
        });

      if (error) {
        alert("No se pudo guardar el examen: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setEditingId("");
    setForm(createInitialForm());
    await loadExams();
    setActiveTab("historial");
  }

  function editExam(exam) {
    if (exam.status === "Cerrado") {
      alert("Este expediente ya está cerrado y no puede editarse.");
      return;
    }

    setEditingId(exam.id);
    setForm(examToFormLike(exam));
    setActiveTab("nuevo");
  }

  async function softDeleteExam(examId) {
    if (!canDelete) return;

    const reason = window.prompt(
      "Motivo de cancelación/eliminación lógica del expediente:"
    );

    if (!reason || !reason.trim()) {
      alert("Debes capturar un motivo.");
      return;
    }

    const confirmed = window.confirm(
      "El expediente no se borrará físicamente; quedará cancelado y oculto del historial. ¿Continuar?"
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc("soft_delete_preemployment_exam", {
      p_exam_id: examId,
      p_delete_reason: reason.trim(),
    });

    if (error) {
      alert("No se pudo cancelar el expediente: " + error.message);
      return;
    }

    await loadExams();
  }

  async function closeExam(exam) {
    if (!canDictaminate) return;

    const analysis = analyzeExamRecord(exam);

    if (analysis.blockers.length > 0) {
      alert(
        "No se puede cerrar el expediente.\n\nFaltantes:\n- " +
          analysis.blockers.join("\n- ")
      );
      return;
    }

    if (exam.status === "Cerrado") {
      alert("Este expediente ya está cerrado.");
      return;
    }

    const signatureStatement = `Confirmo bajo mi usuario autenticado que revisé el expediente clínico ocupacional, validé el antidoping obligatorio, emití el dictamen médico correspondiente y cierro el registro de forma íntegra. Usuario: ${
      session?.user?.email || "Sin correo"
    }.`;

    const confirmed = window.confirm(
      "Al cerrar el expediente ya no podrá editarse. Se generará firma electrónica simple interna y hash de integridad. ¿Continuar?"
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc("close_preemployment_exam", {
      p_exam_id: exam.id,
      p_signature_statement: signatureStatement,
    });

    if (error) {
      alert("No se pudo cerrar el expediente: " + error.message);
      return;
    }

    setSelectedExam(null);
    setCertificateExam(null);
    await loadExams();
  }

  function resetForm() {
    setEditingId("");
    setForm(createInitialForm());
  }

  function openCompanyCertificate(exam) {
    setCertificateExam(exam);
    setSelectedExam(null);
    setActiveTab("historial");

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }

  function renderProfileSummary() {
    const profileKeys = selectedProfileKeysFromForm(form);
    const blocks = getRequiredBlocksFromForm(form);

    return (
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
          Examen sugerido por perfil
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Perfil seleccionado:{" "}
          <strong>{getSelectedProfileLabels(profileKeys)}</strong>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {blocks.map((block) => (
            <span
              key={block}
              className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700 ring-1 ring-zinc-200"
            >
              {block.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard label="Exámenes" value={stats.total} helper="Total activo" />
        <KpiCard label="Pendientes" value={stats.pending} helper="Sin dictamen final" />
        <KpiCard label="Cerrados" value={stats.closed} helper="Firmados digitalmente" />
        <KpiCard label="Aptos" value={stats.fit} helper="Apto para el puesto" />
        <KpiCard label="Restricciones" value={stats.restricted} helper="Apto con restricciones" />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "nuevo", label: editingId ? "Editar examen" : "Nuevo examen" },
            { id: "historial", label: "Historial" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-black ${
                activeTab === tab.id
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "nuevo" && (
        <form onSubmit={saveExam} className="space-y-6">
          <Section
            eyebrow="Ingreso"
            title="Datos generales del aspirante"
            helper="Primero se define empresa, planta, aspirante y puesto. Después el perfil ocupacional arma el examen sugerido."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Empresa"
                value={form.company_id}
                onChange={(value) => {
                  updateField("company_id", value);
                  updateField("plant_id", "");
                }}
                options={[
                  { value: "", label: "Seleccionar empresa" },
                  ...companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  })),
                ]}
              />

              <SelectInput
                label="Planta"
                value={form.plant_id}
                onChange={(value) => updateField("plant_id", value)}
                options={[
                  { value: "", label: "Seleccionar planta" },
                  ...availablePlants.map((plant) => ({
                    value: plant.id,
                    label: plant.name,
                  })),
                ]}
              />

              <TextInput
                label="Fecha del examen"
                type="date"
                value={form.exam_date}
                onChange={(value) => updateField("exam_date", value)}
              />

              <TextInput
                label="Nombre completo"
                value={form.candidate_name}
                onChange={(value) => updateField("candidate_name", value)}
                placeholder="Nombre del aspirante"
              />

              <TextInput
                label="Identificador"
                value={form.candidate_identifier}
                onChange={(value) => updateField("candidate_identifier", value)}
                placeholder="INGRESO-0001 / CURP / folio"
              />

              <TextInput
                label="Teléfono"
                value={form.candidate_phone}
                onChange={(value) => updateField("candidate_phone", value)}
              />

              <TextInput
                label="Edad"
                type="number"
                value={form.age}
                onChange={(value) => updateField("age", value)}
              />

              <SelectInput
                label="Sexo"
                value={form.sex}
                onChange={(value) => updateField("sex", value)}
                options={sexOptions}
              />

              <TextInput
                label="Puesto solicitado"
                value={form.job_position}
                onChange={(value) => updateField("job_position", value)}
              />

              <TextInput
                label="Área"
                value={form.area}
                onChange={(value) => updateField("area", value)}
              />

              <TextInput
                label="Turno probable"
                value={form.probable_shift}
                onChange={(value) => updateField("probable_shift", value)}
              />
            </div>
          </Section>

          <Section
            eyebrow="Perfil"
            title="Perfil ocupacional del puesto"
            helper="Selecciona uno o más perfiles. El sistema habilita los bloques clínico-funcionales necesarios."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {jobProfiles.map((profile) => (
                <CheckboxCard
                  key={profile.key}
                  label={profile.label}
                  helper={profile.helper}
                  checked={form.job_profiles[profile.key]}
                  onChange={(checked) =>
                    updateNested("job_profiles", profile.key, checked)
                  }
                />
              ))}
            </div>

            <div className="mt-5">{renderProfileSummary()}</div>
          </Section>

          <Section


            eyebrow="Cumplimiento"


            title="Consentimiento informado y privacidad"


            helper="Bloque obligatorio para cierre del expediente. Permite documentar aviso de privacidad, consentimiento médico, antidoping y tratamiento de datos sensibles."


          >


            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">


              <SelectInput


                label="Aviso de privacidad entregado"


                value={form.consent_privacy.privacy_notice_delivered}


                onChange={(value) =>


                  updateNested("consent_privacy", "privacy_notice_delivered", value)


                }


                options={["", "Sí", "No", "Pendiente"]}


              />



              <SelectInput


                label="Medio de entrega"


                value={form.consent_privacy.privacy_notice_medium}


                onChange={(value) =>


                  updateNested("consent_privacy", "privacy_notice_medium", value)


                }


                options={[


                  "",


                  "Físico",


                  "Digital",


                  "Físico y digital",


                  "Verbal con respaldo pendiente",


                ]}


              />



              <SelectInput


                label="Consentimiento valoración médica"


                value={form.consent_privacy.medical_evaluation_consent}


                onChange={(value) =>


                  updateNested(


                    "consent_privacy",


                    "medical_evaluation_consent",


                    value


                  )


                }


                options={["", "Sí", "No", "Pendiente"]}


              />



              <SelectInput


                label="Consentimiento antidoping"


                value={form.consent_privacy.antidoping_consent}


                onChange={(value) =>


                  updateNested("consent_privacy", "antidoping_consent", value)


                }


                options={["", "Sí", "No", "Pendiente"]}


              />



              <SelectInput


                label="Consentimiento datos sensibles"


                value={form.consent_privacy.sensitive_data_consent}


                onChange={(value) =>


                  updateNested(


                    "consent_privacy",


                    "sensitive_data_consent",


                    value


                  )


                }


                options={["", "Sí", "No", "Pendiente"]}


              />



              <TextInput


                label="Fecha y hora de aceptación"


                type="datetime-local"


                value={form.consent_privacy.accepted_at}


                onChange={(value) =>


                  updateNested("consent_privacy", "accepted_at", value)


                }


              />



              <TextInput


                label="Informó y recabó"


                value={form.consent_privacy.informed_by}


                onChange={(value) =>


                  updateNested("consent_privacy", "informed_by", value)


                }


                placeholder="Nombre del personal clínico"


              />



              <SelectInput


                label="Evidencia de firma / aceptación"


                value={form.consent_privacy.signature_status}


                onChange={(value) =>


                  updateNested("consent_privacy", "signature_status", value)


                }


                options={[


                  "",


                  "Recabada física",


                  "Recabada digital simple",


                  "Pendiente",


                  "No recabada",


                ]}


              />



              <div className="md:col-span-3">


                <TextAreaInput


                  label="Observaciones de consentimiento"


                  value={form.consent_privacy.observations}


                  onChange={(value) =>


                    updateNested("consent_privacy", "observations", value)


                  }


                  rows={3}


                />


              </div>


            </div>



            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">


              <strong>Regla de cierre:</strong> el expediente puede guardarse como


              borrador, pero no podrá cerrarse/firmarse si falta aviso de privacidad,


              consentimiento médico, consentimiento antidoping, consentimiento para


              datos sensibles o evidencia de aceptación.


            </div>


          </Section>



          <Section


            eyebrow="Obligatorio"


            title="Antidoping de ingreso"
            helper="Todos los aspirantes deben contar con antidoping. Puede guardarse borrador con resultado pendiente, pero no puede cerrarse el expediente sin resultado definitivo."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Antidoping realizado"
                value={form.antidoping.performed}
                onChange={(value) =>
                  updateNested("antidoping", "performed", value)
                }
                options={["", "Realizado", "Pendiente", "No realizado"]}
              />

              <TextInput
                label="Fecha de toma"
                type="date"
                value={form.antidoping.test_date}
                onChange={(value) =>
                  updateNested("antidoping", "test_date", value)
                }
              />

              <TextInput
                label="Folio antidoping SOS"
                value={form.antidoping.folio}
                onChange={(value) => updateNested("antidoping", "folio", value)}
                placeholder="SOS-AD-2026-0001"
              />

              <TextInput
                label="Tipo de prueba"
                value={form.antidoping.test_type}
                onChange={(value) =>
                  updateNested("antidoping", "test_type", value)
                }
              />

              <TextInput
                label="Muestra"
                value={form.antidoping.sample_type}
                onChange={(value) =>
                  updateNested("antidoping", "sample_type", value)
                }
              />

              <SelectInput
                label="Resultado"
                value={form.antidoping.result}
                onChange={(value) =>
                  updateNested("antidoping", "result", value)
                }
                options={antidopingResults}
              />

              <TextInput
                label="Lote de prueba"
                value={form.antidoping.lot_number}
                onChange={(value) =>
                  updateNested("antidoping", "lot_number", value)
                }
              />

              <div className="md:col-span-2">
                <TextInput
                  label="Observaciones"
                  value={form.antidoping.observations}
                  onChange={(value) =>
                    updateNested("antidoping", "observations", value)
                  }
                />
              </div>
            </div>
          </Section>

          <Section
            eyebrow="Antecedentes"
            title="Antecedentes clave por riesgo ocupacional"
            helper="Interrogatorio mínimo dirigido. Las respuestas activan alertas cuando el perfil del puesto lo requiere."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ["hypertension", "Hipertensión"],
                ["diabetes", "Diabetes"],
                ["cardiopathy", "Cardiopatía"],
                ["asthma", "Asma / broncoespasmo"],
                ["epilepsy_or_seizures", "Convulsiones / epilepsia"],
                ["syncope", "Síncope / desmayos"],
                ["vertigo", "Vértigo"],
                ["neurologic_disease", "Enfermedad neurológica"],
                ["sedative_medication", "Medicamentos sedantes"],
                ["lumbar_pain", "Dolor lumbar actual"],
                ["joint_pain", "Dolor articular"],
                ["fracture_or_surgery", "Fractura / cirugía relevante"],
                ["hearing_problem", "Problema auditivo"],
                ["skin_allergy", "Alergias / piel"],
                ["substance_history", "Antecedente de sustancias"],
                ["sleep_disorder", "Trastorno de sueño"],
              ].map(([key, label]) => (
                <SelectInput
                  key={key}
                  label={label}
                  value={form.key_history[key]}
                  onChange={(value) => updateNested("key_history", key, value)}
                  options={yesNoOptions}
                />
              ))}
            </div>

            <div className="mt-4">
              <TextAreaInput
                label="Notas de antecedentes relevantes"
                value={form.key_history.notes}
                onChange={(value) => updateNested("key_history", "notes", value)}
              />
            </div>
          </Section>

          <Section eyebrow="Clínico" title="Signos vitales y somatometría">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                ["systolic_bp", "TA sistólica"],
                ["diastolic_bp", "TA diastólica"],
                ["heart_rate", "Frecuencia cardiaca"],
                ["respiratory_rate", "Frecuencia respiratoria"],
                ["temperature", "Temperatura"],
                ["oxygen_saturation", "SatO2"],
                ["weight_kg", "Peso kg"],
                ["height_m", "Talla m"],
                ["bmi", "IMC calculado"],
                ["waist_cm", "Cintura cm"],
              ].map(([key, label]) => (
                <TextInput
                  key={key}
                  label={label}
                  type="number"
                  value={form.vital_signs[key]}
                  disabled={key === "bmi"}
                  onChange={(value) => updateNested("vital_signs", key, value)}
                />
              ))}
            </div>
          </Section>

          <Section
            eyebrow="Exploración"
            title="Exploración general mínima"
            helper="No se marca todo normal. Cada checkpoint debe confirmarse activamente."
          >
            <div className="space-y-4">
              {[
                ["general_state", "Estado general"],
                ["gait", "Marcha"],
                ["orientation_language", "Orientación / lenguaje"],
                ["cardiopulmonary", "Cardiopulmonar"],
                ["abdomen", "Abdomen"],
                ["skin_hydration", "Piel / hidratación"],
                ["neuro_basic", "Neurológico básico"],
                ["musculoskeletal_basic", "Músculo-esquelético básico"],
              ].map(([key, label]) => (
                <StatusRow
                  key={key}
                  title={label}
                  value={form.general_exam[key]}
                  onChange={(patch) => updateDeep("general_exam", key, patch)}
                />
              ))}
            </div>
          </Section>

          <Section eyebrow="Visual" title="Agudeza visual">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TextInput
                label="OD"
                value={form.visual_exam.right_eye}
                onChange={(value) => updateNested("visual_exam", "right_eye", value)}
                placeholder="20/20, 20/30, etc."
              />
              <TextInput
                label="OI"
                value={form.visual_exam.left_eye}
                onChange={(value) => updateNested("visual_exam", "left_eye", value)}
                placeholder="20/20, 20/30, etc."
              />
              <TextInput
                label="AO"
                value={form.visual_exam.both_eyes}
                onChange={(value) => updateNested("visual_exam", "both_eyes", value)}
                placeholder="20/20, 20/30, etc."
              />
              <SelectInput
                label="Usa lentes"
                value={form.visual_exam.uses_glasses}
                onChange={(value) => updateNested("visual_exam", "uses_glasses", value)}
                options={yesNoOptions}
              />

              {isRequiredBlock(form, "visual_ampliada") && (
                <>
                  <SelectInput
                    label="Visión cromática"
                    value={form.visual_exam.color_vision}
                    onChange={(value) =>
                      updateNested("visual_exam", "color_vision", value)
                    }
                    options={["", "Sin alteraciones", "Con alteraciones", "No valorado"]}
                  />
                  <SelectInput
                    label="Campimetría por confrontación"
                    value={form.visual_exam.confrontation_campimetry}
                    onChange={(value) =>
                      updateNested(
                        "visual_exam",
                        "confrontation_campimetry",
                        value
                      )
                    }
                    options={["", "Sin alteraciones", "Con alteraciones", "No valorado"]}
                  />
                </>
              )}

              <div className="md:col-span-3">
                <TextAreaInput
                  label="Observaciones visuales"
                  value={form.visual_exam.notes}
                  onChange={(value) => updateNested("visual_exam", "notes", value)}
                />
              </div>
            </div>
          </Section>

          {isRequiredBlock(form, "ergonomia") && (
            <Section eyebrow="Perfil administrativo" title="Ergonomía básica">
              <div className="space-y-4">
                {[
                  ["posture", "Postura"],
                  ["workstation_tolerance", "Tolerancia a estación de trabajo"],
                  ["repetitive_hand_use", "Uso repetitivo de manos"],
                ].map(([key, label]) => (
                  <StatusRow
                    key={key}
                    title={label}
                    value={form.ergonomics_exam[key]}
                    onChange={(patch) => updateDeep("ergonomics_exam", key, patch)}
                  />
                ))}
              </div>
            </Section>
          )}

          {(isRequiredBlock(form, "movilidad_basica") ||
            isRequiredBlock(form, "columna_carga") ||
            isRequiredBlock(form, "hombro_rodilla")) && (
            <Section
              eyebrow="Funcional"
              title="Movilidad y capacidad funcional según perfil"
            >
              <div className="space-y-4">
                {[
                  ["cervical", "Movilidad cervical"],
                  ["lumbar", "Movilidad lumbar"],
                  ["shoulders", "Hombros"],
                  ["elbows_wrists_hands", "Codos / muñecas / manos"],
                  ["hips", "Cadera"],
                  ["knees", "Rodillas"],
                  ["ankles_feet", "Tobillos / pies"],
                  ["squat", "Sentadilla funcional"],
                  ["chair_rise", "Levantarse de silla"],
                  ["simulated_lift", "Levantamiento simulado"],
                  ["push_pull", "Empuje / jalón"],
                ].map(([key, label]) => (
                  <StatusRow
                    key={key}
                    title={label}
                    value={form.mobility_exam[key]}
                    options={functionalOptions}
                    onChange={(patch) => updateDeep("mobility_exam", key, patch)}
                  />
                ))}
              </div>
            </Section>
          )}

          {isRequiredBlock(form, "equilibrio") && (
            <Section eyebrow="Puesto crítico" title="Equilibrio y coordinación">
              <div className="space-y-4">
                {[
                  ["romberg", "Romberg"],
                  ["tandem_gait", "Marcha en tándem"],
                  ["tiptoe_gait", "Marcha en puntas"],
                  ["heel_gait", "Marcha en talones"],
                  ["single_leg_stance", "Apoyo monopodal"],
                  ["finger_nose", "Dedo-nariz"],
                ].map(([key, label]) => (
                  <StatusRow
                    key={key}
                    title={label}
                    value={form.balance_exam[key]}
                    options={balanceOptions}
                    onChange={(patch) => updateDeep("balance_exam", key, patch)}
                  />
                ))}
              </div>
            </Section>
          )}

          {isRequiredBlock(form, "neurologico_seguridad") && (
            <Section
              eyebrow="Puesto crítico"
              title="Neurológico dirigido a seguridad"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <SelectInput
                  label="Convulsiones"
                  value={form.safety_neuro_exam.seizures_review}
                  onChange={(value) =>
                    updateNested("safety_neuro_exam", "seizures_review", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Síncope"
                  value={form.safety_neuro_exam.syncope_review}
                  onChange={(value) =>
                    updateNested("safety_neuro_exam", "syncope_review", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Vértigo"
                  value={form.safety_neuro_exam.vertigo_review}
                  onChange={(value) =>
                    updateNested("safety_neuro_exam", "vertigo_review", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Medicamentos sedantes"
                  value={form.safety_neuro_exam.sedatives_review}
                  onChange={(value) =>
                    updateNested("safety_neuro_exam", "sedatives_review", value)
                  }
                  options={yesNoOptions}
                />
              </div>

              <div className="mt-4 space-y-4">
                {[
                  ["alertness", "Alerta / estado neurológico"],
                  ["coordination", "Coordinación"],
                  ["strength", "Fuerza"],
                  ["sensitivity", "Sensibilidad"],
                  ["reflexes", "Reflejos"],
                ].map(([key, label]) => (
                  <StatusRow
                    key={key}
                    title={label}
                    value={form.safety_neuro_exam[key]}
                    onChange={(patch) =>
                      updateDeep("safety_neuro_exam", key, patch)
                    }
                  />
                ))}
              </div>
            </Section>
          )}

          {isRequiredBlock(form, "auditivo") && (
            <Section eyebrow="Ruido" title="Vigilancia auditiva">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectInput
                  label="Síntomas auditivos"
                  value={form.hearing_exam.hearing_symptoms}
                  onChange={(value) =>
                    updateNested("hearing_exam", "hearing_symptoms", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Tinnitus"
                  value={form.hearing_exam.tinnitus}
                  onChange={(value) => updateNested("hearing_exam", "tinnitus", value)}
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Exposición previa a ruido"
                  value={form.hearing_exam.previous_noise_exposure}
                  onChange={(value) =>
                    updateNested("hearing_exam", "previous_noise_exposure", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Audiometría requerida"
                  value={form.hearing_exam.audiometry_required}
                  onChange={(value) =>
                    updateNested("hearing_exam", "audiometry_required", value)
                  }
                  options={yesNoOptions}
                />
                <TextInput
                  label="Resultado audiometría"
                  value={form.hearing_exam.audiometry_result}
                  onChange={(value) =>
                    updateNested("hearing_exam", "audiometry_result", value)
                  }
                />
                <TextInput
                  label="Notas"
                  value={form.hearing_exam.notes}
                  onChange={(value) => updateNested("hearing_exam", "notes", value)}
                />
              </div>

              <div className="mt-4">
                <StatusRow
                  title="Otoscopía básica"
                  value={form.hearing_exam.otoscopy}
                  onChange={(patch) => updateDeep("hearing_exam", "otoscopy", patch)}
                />
              </div>
            </Section>
          )}

          {isRequiredBlock(form, "respiratorio_piel") && (
            <Section eyebrow="Químicos / confinados" title="Respiratorio, piel y mucosas">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectInput
                  label="Asma / broncoespasmo"
                  value={form.respiratory_skin_exam.asthma_or_bronchospasm}
                  onChange={(value) =>
                    updateNested(
                      "respiratory_skin_exam",
                      "asthma_or_bronchospasm",
                      value
                    )
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Disnea"
                  value={form.respiratory_skin_exam.dyspnea}
                  onChange={(value) =>
                    updateNested("respiratory_skin_exam", "dyspnea", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Sensibilidad química"
                  value={form.respiratory_skin_exam.chemical_sensitivity}
                  onChange={(value) =>
                    updateNested(
                      "respiratory_skin_exam",
                      "chemical_sensitivity",
                      value
                    )
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Espirometría requerida"
                  value={form.respiratory_skin_exam.spirometry_required}
                  onChange={(value) =>
                    updateNested(
                      "respiratory_skin_exam",
                      "spirometry_required",
                      value
                    )
                  }
                  options={yesNoOptions}
                />
                <TextInput
                  label="Resultado espirometría"
                  value={form.respiratory_skin_exam.spirometry_result}
                  onChange={(value) =>
                    updateNested(
                      "respiratory_skin_exam",
                      "spirometry_result",
                      value
                    )
                  }
                />
                <TextInput
                  label="Notas"
                  value={form.respiratory_skin_exam.notes}
                  onChange={(value) =>
                    updateNested("respiratory_skin_exam", "notes", value)
                  }
                />
              </div>

              <div className="mt-4 space-y-4">
                {[
                  ["respiratory_exam", "Exploración respiratoria"],
                  ["skin_lesions", "Piel"],
                  ["mucosa", "Mucosas"],
                ].map(([key, label]) => (
                  <StatusRow
                    key={key}
                    title={label}
                    value={form.respiratory_skin_exam[key]}
                    onChange={(patch) =>
                      updateDeep("respiratory_skin_exam", key, patch)
                    }
                  />
                ))}
              </div>
            </Section>
          )}

          {isRequiredBlock(form, "sueno_fatiga") && (
            <Section eyebrow="Turno nocturno" title="Sueño, fatiga y somnolencia">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectInput
                  label="Calidad de sueño alterada"
                  value={form.sleep_fatigue_exam.sleep_quality}
                  onChange={(value) =>
                    updateNested("sleep_fatigue_exam", "sleep_quality", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Somnolencia diurna"
                  value={form.sleep_fatigue_exam.daytime_sleepiness}
                  onChange={(value) =>
                    updateNested("sleep_fatigue_exam", "daytime_sleepiness", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Experiencia previa en turno nocturno"
                  value={form.sleep_fatigue_exam.night_shift_history}
                  onChange={(value) =>
                    updateNested("sleep_fatigue_exam", "night_shift_history", value)
                  }
                  options={yesNoOptions}
                />
                <SelectInput
                  label="Riesgo de fatiga"
                  value={form.sleep_fatigue_exam.fatigue_risk}
                  onChange={(value) =>
                    updateNested("sleep_fatigue_exam", "fatigue_risk", value)
                  }
                  options={["", "Bajo", "Medio", "Alto", "No valorado"]}
                />
                <div className="md:col-span-2">
                  <TextInput
                    label="Notas"
                    value={form.sleep_fatigue_exam.notes}
                    onChange={(value) =>
                      updateNested("sleep_fatigue_exam", "notes", value)
                    }
                  />
                </div>
              </div>
            </Section>
          )}

          <AnalysisPanel
            analysis={currentAnalysis}
            suggestedFitness={suggestedFitness}
            canApply={canDictaminate}
            onApplySuggestion={() => updateField("fitness_result", suggestedFitness)}
          />

          <Section eyebrow="Dictamen" title="Compatibilidad médico-ocupacional">
            <div className="grid grid-cols-1 gap-4">
              <TextAreaInput
                label="Resumen de riesgo ocupacional"
                value={form.occupational_risk_summary}
                onChange={(value) =>
                  updateField("occupational_risk_summary", value)
                }
                rows={4}
              />

              <TextAreaInput
                label="Restricciones laborales sugeridas"
                value={form.restrictions}
                onChange={(value) => updateField("restrictions", value)}
                rows={4}
              />

              <TextAreaInput
                label="Recomendaciones"
                value={form.recommendations}
                onChange={(value) => updateField("recommendations", value)}
                rows={4}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectInput
                  label="Dictamen"
                  value={form.fitness_result}
                  onChange={(value) => updateField("fitness_result", value)}
                  options={fitnessOptions}
                  disabled={!canDictaminate}
                />

                <TextInput
                  label="Médico dictaminador"
                  value={form.physician_name}
                  onChange={(value) => updateField("physician_name", value)}
                />

                <TextInput
                  label="Cédula profesional"
                  value={form.physician_license}
                  onChange={(value) => updateField("physician_license", value)}
                />
              </div>
            </div>
          </Section>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
            >
              Limpiar
            </button>

            <button
              type="submit"
              disabled={saving || !canCreate}
              className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : editingId
                ? "Actualizar examen"
                : "Guardar examen de ingreso"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "historial" && (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
                Historial
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Exámenes médicos de ingreso
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Antidoping obligatorio, perfil ocupacional y cierre con control documental.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar aspirante, puesto, perfil, dictamen..."
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4 md:w-96"
              />

              <button
                type="button"
                onClick={loadExams}
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
              >
                Recargar
              </button>
            </div>
          </div>

          {loading ? (
            <EmptyState text="Cargando exámenes..." />
          ) : filteredExams.length === 0 ? (
            <EmptyState text="No hay exámenes registrados." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-sm">
                <thead>
                  <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Aspirante</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Planta</th>
                    <th className="p-3">Puesto</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3">Antidoping</th>
                    <th className="p-3">Dictamen</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExams.map((exam) => {
                    const analysis = analyzeExamRecord(exam);

                    return (
                      <tr key={exam.id} className="border-b hover:bg-zinc-50">
                        <td className="p-3">{exam.exam_date}</td>
                        <td className="p-3 font-bold">{exam.candidate_name}</td>
                        <td className="p-3">
                          {exam.companies?.name ||
                            getCompanyName(companies, exam.company_id)}
                        </td>
                        <td className="p-3">
                          {exam.company_plants?.name ||
                            getPlantName(plants, exam.plant_id)}
                        </td>
                        <td className="p-3">{exam.job_position || "-"}</td>
                        <td className="p-3">
                          {getSelectedProfileLabels(selectedProfileKeysFromExam(exam))}
                        </td>
                        <td className="p-3">
                          {exam?.complementary_tests?.antidoping?.result || "-"}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getFitnessBadgeClass(
                              exam.fitness_result
                            )}`}
                          >
                            {exam.fitness_result}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getStatusBadgeClass(
                                exam.status || "Borrador"
                              )}`}
                            >
                              {exam.status || "Borrador"}
                            </span>
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                                analysis.quality === "Verde"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : analysis.quality === "Ámbar"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Calidad: {analysis.quality}
                            </span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedExam(exam)}
                              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                            >
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => openCompanyCertificate(exam)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-800 hover:bg-red-100"
                            >
                              Dictamen RH/EHS
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                printCompanyCertificate(exam, companies, plants)
                              }
                              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                            >
                              Imprimir
                            </button>

                            {canDictaminate && exam.status !== "Cerrado" && (
                              <button
                                type="button"
                                onClick={() => editExam(exam)}
                                className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white hover:bg-zinc-800"
                              >
                                Editar
                              </button>
                            )}

                            {canDictaminate && exam.status !== "Cerrado" && (
                              <button
                                type="button"
                                onClick={() => closeExam(exam)}
                                className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800"
                              >
                                Cerrar / firmar
                              </button>
                            )}

                            {canDelete && exam.status !== "Cerrado" && (
                              <button
                                type="button"
                                onClick={() => softDeleteExam(exam.id)}
                                className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white hover:bg-red-800"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedExam && (
            <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
                    Vista rápida
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {selectedExam.candidate_name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedExam.job_position || "Puesto no registrado"} ·{" "}
                    {selectedExam.exam_date}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openCompanyCertificate(selectedExam)}
                    className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
                  >
                    Dictamen RH/EHS
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      printCompanyCertificate(selectedExam, companies, plants)
                    }
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-white"
                  >
                    Imprimir dictamen
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedExam(null)}
                    className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white hover:bg-zinc-800"
                  >
                    Cerrar vista
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextBlock
                  title="Perfil ocupacional"
                  value={getSelectedProfileLabels(selectedProfileKeysFromExam(selectedExam))}
                />
                <TextBlock
                  title="Antidoping"
                  value={selectedExam?.complementary_tests?.antidoping?.result || "-"}
                />
                <TextBlock
                  title="Dictamen"
                  value={selectedExam.fitness_result}
                />
                <TextBlock title="Médico" value={selectedExam.physician_name} />
                <TextBlock title="Cédula" value={selectedExam.physician_license} />
                <TextBlock
                  title="Calidad documental"
                  value={analyzeExamRecord(selectedExam).quality}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                  Cierre digital
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <TextBlock title="Estado" value={selectedExam.status || "Borrador"} />
                  <TextBlock
                    title="Fecha de cierre"
                    value={formatDateTime(selectedExam.closed_at)}
                  />
                  <TextBlock title="Firmado por" value={selectedExam.closed_by_email} />
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold text-zinc-500">
                    Hash de integridad
                  </p>
                  <p className="break-all rounded-xl bg-zinc-100 p-3 font-mono text-xs text-zinc-700">
                    {selectedExam.signature_hash || "Sin cierre digital"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextBlock
                  title="Resumen de riesgo"
                  value={selectedExam.occupational_risk_summary}
                />
                <TextBlock
                  title="Restricciones"
                  value={selectedExam.restrictions}
                />
                <TextBlock
                  title="Recomendaciones"
                  value={selectedExam.recommendations}
                />
              </div>

              {analyzeExamRecord(selectedExam).blockers.length > 0 && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                  <p className="font-black">Faltantes detectados para cierre</p>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {analyzeExamRecord(selectedExam).blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {certificateExam && (
        <CompanyCertificatePreview
          exam={certificateExam}
          companies={companies}
          plants={plants}
          onClose={() => setCertificateExam(null)}
          onPrint={() =>
            printCompanyCertificate(certificateExam, companies, plants)
          }
        />
      )}
    </div>
  );
}