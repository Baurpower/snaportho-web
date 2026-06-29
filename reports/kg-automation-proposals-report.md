# KG Automation Proposals Report

Generated: 2026-06-29T01:44:28.320Z
Proposal source: database

## Summary

- Total proposals: 11
- Proposals by type:
- create_canonical_entity: 4
- flag_possible_split: 4
- add_entity_alias: 3
- Proposals by confidence:
- low: 6
- medium: 5
- Proposals by specialty:
- Trauma: 6
- Basic Science: 2
- Foot & Ankle: 1
- Recon: 1
- Spine: 1

## Entity Creation Proposals

- Radius and Ulnar Shaft Fractures -> `condition` (medium, 0.660). Cards: 8, Questions: 4.
  Evidence: Trauma > Radius and Ulnar Shaft Fractures is a high-traffic unbridged curriculum node with recurring card/question support and consistent label signals.
- Material Properties -> `biomechanics_concept` (medium, 0.660). Cards: 13, Questions: 6.
  Evidence: Basic Science > Material Properties is a high-traffic unbridged curriculum node with recurring card/question support and consistent label signals.
- Distal Femur Fractures -> `condition` (low, 0.610). Cards: 7, Questions: 2.
  Evidence: Trauma > Distal Femur Fractures is a high-traffic unbridged curriculum node with recurring card/question support and consistent label signals.
- Distal Humerus Fractures -> `condition` (low, 0.610). Cards: 7, Questions: 2.
  Evidence: Trauma > Distal Humerus Fractures is a high-traffic unbridged curriculum node with recurring card/question support and consistent label signals.

## Curriculum Bridge Proposals

- None

## Concept Bridge Proposals

- None

## Alias Proposals

- trauma subtrochanteric fractures -> Subtrochanteric Fractures (origin: curriculum_node_alias)
- posterior tibial tendon insufficiency ptti -> Posterior Tibial Tendon Insufficiency (PTTI) (origin: curriculum_node_alias)
- trauma intertrochanteric fractures -> Intertrochanteric Fractures (origin: curriculum_node_alias)

## Relationship Proposals

- None

## Risk Flags

- flag_possible_split: Recon > Wear & Osteolysis Basic Science (low, 0.580)
- flag_possible_split: Basic Science > Osteopenia & Osteoporosis (low, 0.580)
- flag_possible_split: Spine > Pediatric Spondylolysis & Spondylolisthesis (low, 0.580)
- flag_possible_split: Trauma > Radius and Ulnar Shaft Fractures (low, 0.580)

## Recommended Editorial Queue

- Trauma > Subtrochanteric Fractures [Trauma]: 1 proposals, combined score 0.680
  Examples: add_entity_alias (medium)
- Foot & Ankle > Posterior Tibial Tendon Insufficiency (PTTI) [Foot & Ankle]: 1 proposals, combined score 0.680
  Examples: add_entity_alias (medium)
- Trauma > Intertrochanteric Fractures [Trauma]: 1 proposals, combined score 0.680
  Examples: add_entity_alias (medium)
- Trauma > Radius and Ulnar Shaft Fractures [Trauma]: 2 proposals, combined score 0.689
  Examples: create_canonical_entity (medium), flag_possible_split (low)
- Basic Science > Material Properties [Basic Science]: 1 proposals, combined score 0.660
  Examples: create_canonical_entity (medium)
- Trauma > Distal Femur Fractures [Trauma]: 1 proposals, combined score 0.610
  Examples: create_canonical_entity (low)
- Trauma > Distal Humerus Fractures [Trauma]: 1 proposals, combined score 0.610
  Examples: create_canonical_entity (low)
- Recon > Wear & Osteolysis Basic Science [Recon]: 1 proposals, combined score 0.029
  Examples: flag_possible_split (low)
- Basic Science > Osteopenia & Osteoporosis [Basic Science]: 1 proposals, combined score 0.029
  Examples: flag_possible_split (low)
- Spine > Pediatric Spondylolysis & Spondylolisthesis [Spine]: 1 proposals, combined score 0.029
  Examples: flag_possible_split (low)
