#!/usr/bin/env bash
set -euo pipefail

: "${OHGO_KEY:?set OHGO_KEY first}"

CSV="ohgo_observed.csv"
if [[ ! -f "$CSV" ]]; then
  echo "id,first_seen,last_seen,route,eventType,roadStatus" > "$CSV"
fi

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# Fetch current snapshot
curl -s "https://publicapi.ohgo.com/api/v1/incidents?page-all=true&api-key=${OHGO_KEY}" \
| jq -c '.results[] | {id, route: (.routeName // .roadwayName), eventType: (.category // .eventType // .type), roadStatus}' \
| while IFS= read -r row; do
  id=$(jq -r '.id' <<<"$row")
  route=$(jq -r '.route' <<<"$row")
  etype=$(jq -r '.eventType' <<<"$row")
  status=$(jq -r '.roadStatus' <<<"$row")

  # If not seen before, add with first_seen=last_seen=now
  if ! grep -q "^$id," "$CSV"; then
    echo "$id,$(now_iso),$(now_iso),$route,$etype,$status" >> "$CSV"
  else
    # Update last_seen (and refresh fields)
    awk -F, -v OFS=, -v id="$id" -v now="$(now_iso)" -v route="$route" -v etype="$etype" -v status="$status" '
      $1==id { $3=now; $4=route; $5=etype; $6=status }
      {print}
    ' "$CSV" > "$CSV.tmp" && mv "$CSV.tmp" "$CSV"
  fi
done

echo "OK: updated $(wc -l < "$CSV") rows in $CSV at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
