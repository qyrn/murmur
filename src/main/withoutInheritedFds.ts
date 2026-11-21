const CLOSE_INHERITED_FDS_THEN_EXEC =
  'for fd in /proc/$$/fd/*; do n=${fd##*/}; [ "$n" -gt 2 ] && eval "exec $n>&-"; done; exec "$0" "$@"'

export function withoutInheritedFds(command: string, args: string[]): [string, string[]] {
  return ['/bin/sh', ['-c', CLOSE_INHERITED_FDS_THEN_EXEC, command, ...args]]
}
