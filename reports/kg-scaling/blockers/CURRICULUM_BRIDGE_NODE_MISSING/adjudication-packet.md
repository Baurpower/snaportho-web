# CURRICULUM_BRIDGE_NODE_MISSING Adjudication Packet

## Decision required

Fourteen applied bridge proposals name curriculum-node slugs that do not exist in staging. The canonical entity endpoint exists in every case. Automation must not invent curriculum nodes from proposal metadata.

For each row, a curriculum owner must choose one of:

1. map the proposed slug to an existing authoritative curriculum node;
2. approve creation of the named node with direct curriculum evidence and ownership; or
3. reject/supersede the bridge proposal.

| Neighborhood | Missing curriculum node | Canonical entity | Other blockers | Immediate DB unlock if resolved |
|---|---|---|---|---|
| boxer-fracture | `hand-boxer-fracture` | `boxer-fracture` | none | yes |
| femoral-neck-fracture-adult-recon | `adult-recon-femoral-neck-fracture` | `femoral-neck-fracture-adult-recon` | none | yes |
| hip-prosthetic-joint-infection | `adult-recon-hip-pji` | `hip-prosthetic-joint-infection` | none | yes |
| knee-instability-after-tka | `adult-recon-knee-instability` | `knee-instability-after-tka` | labrum identity | no |
| knee-osteoarthritis | `adult-recon-knee-osteoarthritis` | `knee-osteoarthritis` | labrum identity | no |
| knee-prosthetic-joint-infection | `adult-recon-knee-pji` | `knee-prosthetic-joint-infection` | none | yes |
| lt-ligament-injury | `hand-lt-ligament-injury` | `lt-ligament-injury` | none | yes |
| middle-phalanx-fracture | `hand-middle-phalanx-fracture` | `middle-phalanx-fracture` | none | yes |
| patellofemoral-arthroplasty | `adult-recon-patellofemoral-arthroplasty` | `patellofemoral-arthroplasty` | labrum identity | no |
| periprosthetic-femur-fracture | `adult-recon-periprosthetic-femur-fracture` | `periprosthetic-femur-fracture` | labrum identity | no |
| periprosthetic-joint-infection | `adult-recon-periprosthetic-joint-infection` | `periprosthetic-joint-infection` | none | yes |
| periprosthetic-knee-fracture | `adult-recon-periprosthetic-knee-fracture` | `periprosthetic-knee-fracture` | none | yes |
| polyethylene-wear-osteolysis | `adult-recon-polyethylene-wear` | `polyethylene-wear-osteolysis` | ownership, labrum, aggregate provenance | no |
| unicompartmental-knee-arthritis | `adult-recon-unicompartmental-knee` | `unicompartmental-knee-arthritis` | labrum identity | no |

Review role: curriculum owner, with a clinical curator for any mapping that changes topic meaning. Expected impact: 14 bridge blockers cleared and 8 immediate transitions to `database_verified`. After decisions, rerun membership repair and strict database audit only; do not restart manufacturing.
