#!/usr/bin/env bash
set -euo pipefail

TOPICS=(
  hip-osteoarthritis
  femoral-neck-fracture-adult-recon
  periprosthetic-femur-fracture
  hip-prosthetic-joint-infection
  aseptic-loosening-tha
  hip-instability-after-tha
  polyethylene-wear-osteolysis
  adverse-local-tissue-reaction
  knee-osteoarthritis
  periprosthetic-knee-fracture
  knee-prosthetic-joint-infection
  aseptic-loosening-tka
  knee-instability-after-tka
  extensor-mechanism-failure
  patellofemoral-arthroplasty
  unicompartmental-knee-arthritis
  periprosthetic-joint-infection
  bone-loss-revision-arthroplasty
  implant-fixation-principles
  bearing-surface-selection
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

npm run kg:pilot:adult-reconstruction-cluster:reports
npm run kg:audit -- --batch adult-reconstruction --db-backed
echo "Adult Reconstruction cluster pipeline complete."