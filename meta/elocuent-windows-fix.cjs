// On Windows, elocuent's gitBlame.kill() throws EPERM when git has already exited.
// Preloaded by `npm run loc` so killing a finished process is a no-op.
const { ChildProcess } = require('child_process');
const kill = ChildProcess.prototype.kill;
ChildProcess.prototype.kill = function (...args) {
  if (this.exitCode !== null || this.signalCode !== null) return false;
  try {
    return kill.apply(this, args);
  } catch {
    return false;
  }
};
