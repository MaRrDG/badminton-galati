#!/usr/bin/env bash
# Deploys the static site to the test server: build web/, copy web/dist and deploy/ to the
# server over rsync, then start or refresh the nginx container there with docker compose.
#
# Usage: pnpm deploy:test [--dry-run]
#   --dry-run   build locally and show what rsync would change; no change on the server.
#
# Settings come from the untracked file .deploy.env at the repository root (copy
# .deploy.env.example): DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH (absolute), optional DEPLOY_SSH_KEY.
# Content: CONTENT_SOURCE=fixtures (default) or CONTENT_SOURCE=sanity, which needs
# SANITY_PROJECT_ID and SANITY_READ_TOKEN in the environment.
#
# The server-side one-time setup (directory, reverse proxy, TLS, SSO) is not done here.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="$ROOT/.deploy.env"

die() {
  echo "deploy: $*" >&2
  exit 1
}

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --) ;;
    --dry-run) DRY_RUN=1 ;;
    -h | --help)
      sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "unknown argument: $arg (use --dry-run or --help)" ;;
  esac
done

# Settings: read KEY=VALUE lines without executing the file. Only the known keys are taken.
[[ -f "$ENV_FILE" ]] || die "$ENV_FILE is missing. Copy .deploy.env.example to .deploy.env and fill it in."
DEPLOY_HOST="" DEPLOY_USER="" DEPLOY_PATH="" DEPLOY_SSH_KEY=""
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Z_]+)=(.*)$ ]] || die "cannot read this line of .deploy.env: $line"
  key="${BASH_REMATCH[2]}"
  value="${BASH_REMATCH[3]}"
  value="${value%"${value##*[![:space:]]}"}" # trailing spaces
  if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi
  case "$key" in
    DEPLOY_HOST | DEPLOY_USER | DEPLOY_PATH | DEPLOY_SSH_KEY) printf -v "$key" '%s' "$value" ;;
    *) die ".deploy.env: unknown key $key" ;;
  esac
done <"$ENV_FILE"

for key in DEPLOY_HOST DEPLOY_USER DEPLOY_PATH; do
  [[ -n "${!key}" ]] || die ".deploy.env: $key is empty."
done
[[ "$DEPLOY_PATH" == /* ]] || die ".deploy.env: DEPLOY_PATH must be an absolute path."
[[ "$DEPLOY_PATH" != "/" ]] || die ".deploy.env: DEPLOY_PATH must not be /."
DEPLOY_PATH="${DEPLOY_PATH%/}"
if [[ -n "$DEPLOY_SSH_KEY" ]]; then
  DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"
  [[ -f "$DEPLOY_SSH_KEY" ]] || die ".deploy.env: DEPLOY_SSH_KEY points to a file that does not exist."
fi

for tool in git pnpm rsync ssh; do
  command -v "$tool" >/dev/null || die "$tool is not installed."
done

# Deploy only committed work, so the printed commit is what the server serves.
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || die "the git tree has uncommitted changes; commit or remove them first."

CONTENT_SOURCE="${CONTENT_SOURCE:-fixtures}"
case "$CONTENT_SOURCE" in
  fixtures) ;;
  sanity)
    [[ -n "${SANITY_PROJECT_ID:-}" ]] || die "CONTENT_SOURCE=sanity needs SANITY_PROJECT_ID in the environment."
    [[ -n "${SANITY_READ_TOKEN:-}" ]] || die "CONTENT_SOURCE=sanity needs SANITY_READ_TOKEN in the environment."
    ;;
  *) die "CONTENT_SOURCE must be fixtures or sanity, got \"$CONTENT_SOURCE\"." ;;
esac

COMMIT=$(git -C "$ROOT" rev-parse --short HEAD)
TARGET="$DEPLOY_USER@$DEPLOY_HOST"

SSH=(ssh -o BatchMode=yes)
[[ -n "$DEPLOY_SSH_KEY" ]] && SSH+=(-i "$DEPLOY_SSH_KEY" -o IdentitiesOnly=yes)
printf -v RSYNC_SSH '%q ' "${SSH[@]}"

if [[ "$CONTENT_SOURCE" == fixtures ]]; then
  echo "deploy: building $COMMIT from fixtures (${HOME_FIXTURE:-home.json})"
else
  echo "deploy: building $COMMIT from Sanity project $SANITY_PROJECT_ID, dataset ${SANITY_DATASET:-production}"
fi
# BUILD_TODAY is for tests; a deployed page is built for today in Bucharest.
(cd "$ROOT" && env -u BUILD_TODAY CONTENT_SOURCE="$CONTENT_SOURCE" pnpm build)
[[ -f "$ROOT/web/dist/index.html" ]] || die "the build left no web/dist/index.html."

RSYNC=(rsync -rlptz --itemize-changes -e "$RSYNC_SSH")
((DRY_RUN)) && RSYNC+=(--dry-run)

echo "deploy: copying web/dist/ to $DEPLOY_PATH/dist/"
"${RSYNC[@]}" --delete "$ROOT/web/dist/" "$TARGET:$DEPLOY_PATH/dist/"
# In place, so the single-file bind mount of nginx.conf sees the new content.
echo "deploy: copying deploy/ files to $DEPLOY_PATH/"
"${RSYNC[@]}" --inplace "$ROOT/deploy/docker-compose.yml" "$ROOT/deploy/nginx.conf" "$TARGET:$DEPLOY_PATH/"

printf -v REMOTE_PATH '%q' "$DEPLOY_PATH"
REMOTE="cd $REMOTE_PATH && docker compose up -d && docker compose exec -T web nginx -t && docker compose exec -T web nginx -s reload"
if ((DRY_RUN)); then
  echo "deploy: dry run, nothing changed. Would run on the server: $REMOTE"
  exit 0
fi
"${SSH[@]}" "$TARGET" "$REMOTE"

echo "deploy: done, the server now serves $(git -C "$ROOT" log -1 --format='%h %s')"
