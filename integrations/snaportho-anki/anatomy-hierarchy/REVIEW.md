# Anatomy hierarchy classification review (2026-08-01)

Post-agent QA before production re-render. Reconcile: **197/197**, hard errors **0**.

## Changes applied after agent pass

| Structure | Before → After | Rationale |
|-----------|----------------|-----------|
| `Calcar` | Thigh_Hip → **General/Osteology** | Dual-home: PH medial calcar + FN inverted-triangle calcar |
| `Epb` / `Epl` / `Apl` | Muscles → **Tendons** | Match ECU/EDC; dorsal-compartment tendons |
| `Deep_Posterior_Compartment_Of_The_Leg` | merge null → **Deep_Posterior_Compartment** | True duplicate short form |
| `Lateral_Compartment_Of_The_Leg` | merge null → **Lateral_Compartment** | True duplicate short form |
| Confidence raises | several medium → high | Sample fronts unambiguous (Sacrum, Volar_Plate, MCL elbow, etc.) |

## Dual-home / overloaded entities (accepted as-is)

| Structure | Home | Why accepted |
|-----------|------|----------------|
| `Lateral_Collateral_Ligament` | Elbow | Primary sample is elbow LCLC; secondary is knee LCL |
| `Anterior_Compartment` | Leg_Knee | Overloaded forearm+leg samples; leg ACS is classic; `Of_The_Leg` twin exists |
| `Joint_Capsule` | General | Hip capsule + shoulder axillary recess |
| `Medial_Collateral_Ligament` | Elbow | Samples are elbow-only (sublime tubercle / terrible triad) |
| `Ulnar_Collateral_Ligament` | Elbow | LUCL samples; thumb is separate `Thumb_UCL` |
| `Trapezoid` → `Trapezoid_Ligament` | Shoulder_Girdle | Samples are coracoclavicular trapezoid ligament, not carpal bone |
| `Distal_Radius` | Hand | Wrist ORIF content; vocab puts wrist under Hand |
| `Sacrum` | Pelvis | Denis pelvic trauma; vocab allows sacrum-as-pelvis |

## Low-confidence (0 deck cards) — left as General/Other hubs

- Imaging_Anatomy_Landmarks
- Sports_Medicine_Anatomy_Hub
- Upper_Extremity_Trauma_Anatomy_Hub
- Soft_Tissue_Envelope

These do not affect published deck tags (no cards).

## Proposed merges (not auto-applied)

1. `Ain` → `Anterior_Interosseous_Nerve` (leaf kept `Ain` to avoid tag collision)
2. `Anterior_Compartment_Of_The_Leg` → `Anterior_Compartment`
3. `Deep_Posterior_Compartment_Of_The_Leg` → `Deep_Posterior_Compartment`
4. `Lateral_Compartment_Of_The_Leg` → `Lateral_Compartment`

## Production gate

- Map: `anatomy-hierarchy.map.json`
- Next: patch `renderTags` → re-render draft manifest → `verify-manifest` → publish
