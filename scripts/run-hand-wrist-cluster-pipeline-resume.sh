#!/usr/bin/env bash
# Resume Hand & Wrist cluster pipeline from topic 2 onward (distal-radius-fracture already complete).
set -euo pipefail

TOPICS=(
  distal-ulna-fracture
  ulnar-styloid-fracture
  druj-instability
  galeazzi-fracture
  essex-lopresti-injury
  wrist-dislocation
  scaphoid-fracture
  scaphoid-nonunion
  lunate-fracture
  perilunate-dislocation
  lunate-dislocation
  carpal-instability
  sl-ligament-injury
  lt-ligament-injury
  metacarpal-fracture
  bennett-fracture
  rolando-fracture
  boxer-fracture
  cmc-dislocations
  proximal-phalanx-fracture
  middle-phalanx-fracture
  distal-phalanx-fracture
  mallet-finger
  jersey-finger
  central-slip-injury
  volar-plate-injury
  flexor-tendon-injury
  extensor-tendon-injury
  flexor-tendon-zones
  extensor-tendon-zones
  median-nerve-compression
  carpal-tunnel-syndrome
  cubital-tunnel-syndrome
  ulnar-nerve-compression
  radial-nerve-compression
  thumb-ucl-injury
  gamekeeper-skier-thumb
  tfcc-injury
  dupuytren-disease
  trigger-finger
  de-quervain-tenosynovitis
  flexor-tenosynovitis
  hand-infection
  bite-injuries
  fingertip-injury
  nail-bed-injury
  compartment-syndrome-hand
)

export KG_TARGET_ENV=staging

run_topic() {
  local topic="$1"
  echo "========== $topic: evidence =========="
  npm run kg:evidence -- --topic "$topic"

  echo "========== $topic: compile =========="
  npm run kg:compile -- --topic "$topic" --use-evidence

  echo "========== $topic: factory generate/curate/review/persist =========="
  npm run kg:pilot -- --topic "$topic" generate
  npm run kg:pilot -- --topic "$topic" curate
  npm run kg:pilot -- --topic "$topic" review
  npm run kg:pilot -- --topic "$topic" persist

  echo "========== $topic: staging apply (pass 1) =========="
  npm run kg:pilot:apply-approved -- --topic "$topic" || true

  echo "========== $topic: re-persist + apply (pass 2) =========="
  npm run kg:pilot -- --topic "$topic" persist
  npm run kg:pilot:apply-approved -- --topic "$topic" || true

  echo "========== $topic: db-backed evidence + compile =========="
  npm run kg:evidence -- --topic "$topic" --db-backed
  npm run kg:compile -- --topic "$topic" --use-evidence --db-backed

  echo "========== $topic: quality + publication =========="
  npm run kg:pilot -- --topic "$topic" quality
  npm run kg:pilot -- --topic "$topic" publication

  echo "========== $topic: DONE =========="
}

for topic in "${TOPICS[@]}"; do
  run_topic "$topic"
done

npm run kg:audit -- --batch hand-wrist
npm run kg:pilot:hand-wrist-cluster:reports
echo "Hand & Wrist cluster pipeline resume complete."