/**
 * Command Executor
 * Handles navigation actions, callback execution, and closes the palette.
 */
export function executeCommand(command, router, onClose) {
  if (!command) return;

  if (command.action) {
    command.action();
  } else if (command.url) {
    router.push(command.url);
  }

  if (onClose) {
    onClose();
  }
}
