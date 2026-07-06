#!/usr/bin/env bash
set -euo pipefail

TOPICS=(
  acl-tear
  pcl-injury
  meniscus-tear
  patellar-instability
  multiligament-knee-injury
  osteochondral-defect-knee
  anterior-shoulder-instability
  rotator-cuff-tear
  ac-joint-separation
  slap-tear
  proximal-biceps-tendon-pathology
  ucl-injury
  distal-biceps-tendon-rupture
  achilles-tendon-rupture
  chronic-lateral-ankle-instability
  syndesmotic-sprain
  osteochondral-lesion-talus
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

echo "========== sports medicine cluster: auditor =========="
npm run kg:audit -- --batch sports-medicine --db-backed

npm run kg:pilot:sports-medicine-cluster:reports
echo "Sports Medicine cluster pipeline complete."