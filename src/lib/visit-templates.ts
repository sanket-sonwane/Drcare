import type { VisitTemplateDef, VisitTypeKey } from '@/types'

/**
 * Schema-driven visit templates (PRD §22-23, §36-42).
 * Template → Sections → Fields. UI renders from this — no hard-coded forms.
 */

export const VISIT_TYPES: { key: VisitTypeKey; name: string; fee: number; description: string }[] = [
  { key: 'NEW_PATIENT', name: 'New Patient', fee: 100000, description: 'First assessment + baseline' },
  { key: 'PREVENTIVE_CARDIOLOGY', name: 'Preventive Cardiology', fee: 150000, description: 'Cardiometabolic snapshot' },
  { key: 'HYPERTENSION', name: 'Hypertension Follow-up', fee: 60000, description: 'Office + home BP review' },
  { key: 'DIABETES', name: 'Diabetes Follow-up', fee: 60000, description: 'Glucose + HbA1c review' },
  { key: 'WEIGHT', name: 'Weight Management', fee: 70000, description: 'Weight, waist, lifestyle' },
  { key: 'THYROID', name: 'Thyroid Follow-up', fee: 60000, description: 'TSH + symptoms' },
  { key: 'PCOD', name: 'PCOD / PCOS Follow-up', fee: 70000, description: 'Cycle + metabolic' },
  { key: 'JOINT', name: 'Joint / Arthritis', fee: 60000, description: 'Pain, stiffness, mobility' },
  { key: 'LIFESTYLE_REVIEW', name: 'General Lifestyle Review', fee: 70000, description: 'Diet, activity, sleep' },
  { key: 'CUSTOM', name: 'Custom', fee: 50000, description: 'Free-form visit' },
]

export function visitTypeMeta(key: string) {
  return VISIT_TYPES.find((v) => v.key === key) ?? { key, name: key, fee: 50000, description: '' }
}

const vitalsSection = {
  key: 'vitals',
  title: 'Vitals',
  fields: [
    { key: 'bp', label: 'Blood Pressure', type: 'bp', measurement: 'bp_systolic' },
    { key: 'heart_rate', label: 'Heart Rate', type: 'number', unit: 'bpm', measurement: 'heart_rate' },
    { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', measurement: 'weight' },
    { key: 'height', label: 'Height', type: 'number', unit: 'cm', measurement: 'height' },
    { key: 'waist', label: 'Waist', type: 'number', unit: 'cm', measurement: 'waist' },
  ],
} as const

const lifestyleSection = {
  key: 'lifestyle',
  title: 'Lifestyle',
  fields: [
    { key: 'diet_adherence', label: 'Diet adherence', type: 'segmented', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
    { key: 'diet_tags', label: 'Nutrition tags', type: 'tags', options: ['Reduced refined carbs', 'Portion control', 'Increased vegetables', 'Reduced sugary drinks', 'Frequent eating out', 'Late-night eating'] },
    { key: 'activity_level', label: 'Activity level', type: 'segmented', options: ['None', '<30 min/day', '30–45 min/day', '>45 min/day'] },
    { key: 'activities', label: 'Activities', type: 'multiselect', options: ['Walking', 'Strength', 'Cycling', 'Yoga', 'Swimming'] },
    { key: 'sleep_duration', label: 'Sleep duration', type: 'segmented', options: ['<5h', '5–6h', '6–8h', '>8h'] },
    { key: 'sleep_quality', label: 'Sleep quality', type: 'segmented', options: ['Poor', 'Fair', 'Good'] },
    { key: 'stress', label: 'Stress level', type: 'segmented', options: ['Low', 'Moderate', 'High'] },
    { key: 'med_adherence', label: 'Medication adherence', type: 'segmented', options: ['Excellent', 'Good', 'Irregular', 'Poor'] },
  ],
} as const

const symptomsField = {
  key: 'symptoms',
  title: 'Symptoms',
  fields: [
    { key: 'symptoms', label: 'Symptoms', type: 'multiselect', options: ['Fatigue', 'Headache', 'Dizziness', 'Breathlessness', 'Chest discomfort', 'Palpitations', 'Swelling', 'Joint pain', 'No major symptoms', 'Other'] },
  ],
} as const

function def(key: VisitTypeKey, name: string, fee: number, extra: { key: string; title: string; fields: readonly unknown[] }[]): VisitTemplateDef {
  return {
    key, name, defaultFee: fee,
    sections: [
      { ...(symptomsField as unknown as { key: string; title: string; fields: VisitTemplateDef['sections'][number]['fields'] }) },
      { ...(vitalsSection as unknown as { key: string; title: string; fields: VisitTemplateDef['sections'][number]['fields'] }) },
      ...extra.map((s) => ({ ...s, fields: [...s.fields] }) as VisitTemplateDef['sections'][number]),
      { ...(lifestyleSection as unknown as { key: string; title: string; fields: VisitTemplateDef['sections'][number]['fields'] }) },
    ],
  }
}

export const VISIT_TEMPLATES: Record<VisitTypeKey, VisitTemplateDef> = {
  NEW_PATIENT: def('NEW_PATIENT', 'New Patient', 100000, [
    { key: 'baseline', title: 'Baseline', fields: [
      { key: 'fasting_glucose', label: 'Fasting Glucose', type: 'number', unit: 'mg/dL', measurement: 'fasting_glucose' },
      { key: 'hba1c', label: 'HbA1c', type: 'number', unit: '%', measurement: 'hba1c' },
      { key: 'ldl', label: 'LDL', type: 'number', unit: 'mg/dL', measurement: 'ldl' },
      { key: 'tsh', label: 'TSH', type: 'number', unit: 'µIU/mL', measurement: 'tsh' },
    ]},
  ]),
  PREVENTIVE_CARDIOLOGY: def('PREVENTIVE_CARDIOLOGY', 'Preventive Cardiology', 150000, [
    { key: 'cardio', title: 'Cardiometabolic', fields: [
      { key: 'fasting_glucose', label: 'Fasting Glucose', type: 'number', unit: 'mg/dL', measurement: 'fasting_glucose' },
      { key: 'hba1c', label: 'HbA1c', type: 'number', unit: '%', measurement: 'hba1c' },
      { key: 'ldl', label: 'LDL', type: 'number', unit: 'mg/dL', measurement: 'ldl' },
      { key: 'hdl', label: 'HDL', type: 'number', unit: 'mg/dL', measurement: 'hdl' },
      { key: 'triglycerides', label: 'Triglycerides', type: 'number', unit: 'mg/dL', measurement: 'triglycerides' },
      { key: 'smoking', label: 'Smoking', type: 'segmented', options: ['No', 'Occasional', 'Regular'] },
    ]},
  ]),
  HYPERTENSION: def('HYPERTENSION', 'Hypertension Follow-up', 60000, [
    { key: 'htn', title: 'Hypertension', fields: [
      { key: 'home_bp', label: 'Home BP (avg)', type: 'text', placeholder: 'e.g. 128/80' },
      { key: 'med_adherence_htn', label: 'Med adherence', type: 'segmented', options: ['Excellent', 'Good', 'Irregular', 'Poor'] },
      { key: 'monitoring', label: 'Monitoring', type: 'multiselect', options: ['Home BP', 'Weekly weight', 'Salt tracking'] },
    ]},
  ]),
  DIABETES: def('DIABETES', 'Diabetes Follow-up', 60000, [
    { key: 'dm', title: 'Diabetes', fields: [
      { key: 'fasting_glucose', label: 'Fasting Glucose', type: 'number', unit: 'mg/dL', measurement: 'fasting_glucose' },
      { key: 'postmeal_glucose', label: 'Post-meal Glucose', type: 'number', unit: 'mg/dL', measurement: 'postmeal_glucose' },
      { key: 'hba1c', label: 'HbA1c', type: 'number', unit: '%', measurement: 'hba1c' },
      { key: 'hypo', label: 'Hypoglycemia episodes', type: 'segmented', options: ['None', '1–2', 'Frequent'] },
    ]},
  ]),
  WEIGHT: def('WEIGHT', 'Weight Management', 70000, [
    { key: 'wm', title: 'Weight', fields: [
      { key: 'target_weight', label: 'Target Weight', type: 'number', unit: 'kg' },
      { key: 'cravings', label: 'Cravings', type: 'segmented', options: ['None', 'Occasional', 'Frequent'] },
    ]},
  ]),
  THYROID: def('THYROID', 'Thyroid Follow-up', 60000, [
    { key: 'thy', title: 'Thyroid', fields: [
      { key: 'condition', label: 'Condition', type: 'segmented', options: ['Hypo', 'Hyper', 'Post-op', 'Under evaluation'] },
      { key: 'tsh', label: 'TSH', type: 'number', unit: 'µIU/mL', measurement: 'tsh' },
      { key: 'med_adherence_thy', label: 'Med adherence', type: 'segmented', options: ['Excellent', 'Good', 'Irregular', 'Poor'] },
    ]},
  ]),
  PCOD: def('PCOD', 'PCOD / PCOS Follow-up', 70000, [
    { key: 'pcod', title: 'PCOD / PCOS', fields: [
      { key: 'cycle_status', label: 'Cycle status', type: 'segmented', options: ['Regular', 'Irregular', 'Missed', 'On treatment'] },
      { key: 'cycle_interval', label: 'Cycle interval (days)', type: 'number', unit: 'days' },
      { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', measurement: 'weight' },
    ]},
  ]),
  JOINT: def('JOINT', 'Joint / Arthritis', 60000, [
    { key: 'joint', title: 'Joint', fields: [
      { key: 'pain_score', label: 'Pain Score', type: 'slider', min: 0, max: 10, measurement: 'pain_score' },
      { key: 'stiffness', label: 'Stiffness', type: 'segmented', options: ['None', 'Morning only', 'Persistent'] },
      { key: 'swelling', label: 'Swelling', type: 'segmented', options: ['None', 'Mild', 'Marked'] },
      { key: 'mobility', label: 'Mobility', type: 'segmented', options: ['Good', 'Limited', 'Severely limited'] },
    ]},
  ]),
  LIFESTYLE_REVIEW: def('LIFESTYLE_REVIEW', 'General Lifestyle Review', 70000, []),
  CUSTOM: def('CUSTOM', 'Custom', 50000, []),
}

export function getTemplate(key: string): VisitTemplateDef {
  return (VISIT_TEMPLATES as Record<string, VisitTemplateDef>)[key] ?? VISIT_TEMPLATES.CUSTOM
}
