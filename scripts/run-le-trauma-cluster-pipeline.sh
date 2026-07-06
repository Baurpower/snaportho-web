#!/usr/bin/env bash
set -euo pipefail

TOPICS=(
  pelvic-ring-injury
  acetabular-fracture
  femoral-shaft-fracture
  distal-femur-fracture
  patella-fracture
  tibial-plateau-fracture
  pilon-fracture
  calcaneus-fracture
  talus-fracture
  lisfranc-injury
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

npm run kg:pilot:le-trauma-cluster:reports
echo "LE trauma cluster pipeline complete."