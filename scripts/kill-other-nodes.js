import { execSync } from "child_process";

const myPid = process.pid;
console.log(`Current process PID: ${myPid}`);

try {
  const output = execSync('tasklist /fo csv /nh').toString();
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('node.exe')) {
      const parts = line.split(',');
      if (parts.length > 1) {
        const pid = parseInt(parts[1].replace(/"/g, ''));
        if (pid !== myPid) {
          console.log(`Killing locked node process with PID: ${pid}`);
          try {
            process.kill(pid, 'SIGINT');
          } catch (e) {
            try {
              execSync(`taskkill /F /PID ${pid}`);
            } catch (err) {
              console.log(`Could not kill PID ${pid}: ${err.message}`);
            }
          }
        }
      }
    }
  }
} catch (error) {
  console.error("Error executing tasklist:", error);
}
console.log("Finished terminating competing node processes.");
