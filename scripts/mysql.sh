#!/usr/bin/env bash
# Manage a user-owned MySQL instance for the question bank.
# No sudo required: the datadir lives in $HOME (outside the TCC-protected
# Documents folder) and the server runs on a non-privileged port.
set -euo pipefail

BASEDIR="${MYSQL_BASEDIR:-/usr/local/mysql}"
DATADIR="${MYSQL_DATADIR:-$HOME/qoder-mysql-data}"
PORT="${MYSQL_PORT:-3307}"
SOCKET="$DATADIR/mysql.sock"
PIDFILE="$DATADIR/mysqld.pid"
ERRLOG="$DATADIR/mysqld.err"
DB="${MYSQL_DATABASE:-question_bank}"
BINDIR="$BASEDIR/bin"

export PATH="$BINDIR:$PATH"

is_running() {
  [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

wait_ready() {
  local tries=0
  until "$BINDIR/mysqladmin" --no-defaults -h 127.0.0.1 -P "$PORT" -u root ping >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [[ $tries -ge 60 ]]; then
      echo "MySQL did not become ready; see $ERRLOG" >&2
      return 1
    fi
    sleep 0.5
  done
}

cmd_init() {
  if [[ -d "$DATADIR/mysql" ]]; then
    echo "Datadir already initialized at $DATADIR"
    return 0
  fi
  mkdir -p "$DATADIR"
  echo "Initializing datadir at $DATADIR ..."
  "$BINDIR/mysqld" --no-defaults --initialize-insecure \
    --basedir="$BASEDIR" --datadir="$DATADIR"
  echo "Initialized. root has an empty password."
}

cmd_start() {
  if is_running; then
    echo "MySQL already running (pid $(cat "$PIDFILE")) on port $PORT"
    return 0
  fi
  if [[ ! -d "$DATADIR/mysql" ]]; then
    cmd_init
  fi
  echo "Starting MySQL on port $PORT ..."
  "$BINDIR/mysqld" --no-defaults \
    --basedir="$BASEDIR" --datadir="$DATADIR" \
    --port="$PORT" --socket="$SOCKET" \
    --mysqlx=0 --pid-file="$PIDFILE" --log-error="$ERRLOG" \
    --bind-address=127.0.0.1 &
  wait_ready
  echo "MySQL ready on 127.0.0.1:$PORT (socket $SOCKET)"
}

cmd_stop() {
  if ! is_running; then
    echo "MySQL is not running"
    return 0
  fi
  echo "Stopping MySQL ..."
  "$BINDIR/mysqladmin" --no-defaults -h 127.0.0.1 -P "$PORT" -u root shutdown
  echo "Stopped."
}

cmd_status() {
  if is_running; then
    echo "running (pid $(cat "$PIDFILE")) on 127.0.0.1:$PORT"
  else
    echo "stopped"
  fi
}

cmd_db() {
  wait_ready
  "$BINDIR/mysql" --no-defaults -h 127.0.0.1 -P "$PORT" -u root \
    -e "CREATE DATABASE IF NOT EXISTS \`$DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  echo "Database '$DB' ready."
}

cmd_client() {
  wait_ready
  exec "$BINDIR/mysql" --no-defaults -h 127.0.0.1 -P "$PORT" -u root "$DB"
}

case "${1:-status}" in
  init) cmd_init ;;
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  db) cmd_db ;;
  client) cmd_client ;;
  *) echo "usage: $0 {init|start|stop|status|db|client}" >&2; exit 1 ;;
esac