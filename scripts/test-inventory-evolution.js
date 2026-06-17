const http = require('http');

const ports = [3009, 3000];

function tryRequest(portIndex) {
  if (portIndex >= ports.length) {
    console.error("❌ ERROR: Could not connect to the Next.js test server on any of the expected ports: " + ports.join(", "));
    console.error("Please ensure the Next.js development server is running.");
    process.exit(1);
  }

  const port = ports[portIndex];
  console.log(`Attempting to contact test server on port ${port}...`);

  const options = {
    hostname: '127.0.0.1',
    port: port,
    path: '/api/test-inventory',
    method: 'GET',
    timeout: 15000
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log(`Server returned status code ${res.statusCode} on port ${port}. Trying next port...`);
        tryRequest(portIndex + 1);
        return;
      }

      try {
        const json = JSON.parse(data);
        console.log("\n========================================================");
        console.log("             INTEGRATION TEST RUN SUMMARY");
        console.log("========================================================\n");

        if (json.logs && Array.isArray(json.logs)) {
          json.logs.forEach(log => console.log(log));
        }

        console.log("\n========================================================");
        console.log(`RESULTS: ${json.summary.passed} Passed, ${json.summary.failed} Failed (Total: ${json.summary.total})`);
        console.log("========================================================\n");

        if (json.success) {
          console.log("🎉 SUCCESS: All inventory evolution integration tests passed!");
          process.exit(0);
        } else {
          console.error("❌ FAILURE: Some integration tests failed.");
          process.exit(1);
        }
      } catch (err) {
        console.error("Failed to parse JSON response: ", err.message);
        tryRequest(portIndex + 1);
      }
    });
  });

  req.on('error', (err) => {
    console.log(`Connection failed on port ${port}: ${err.message}. Trying next port...`);
    tryRequest(portIndex + 1);
  });

  req.on('timeout', () => {
    console.log(`Request timed out on port ${port}. Trying next port...`);
    req.destroy();
    tryRequest(portIndex + 1);
  });

  req.end();
}

// Start with the first port in the array
tryRequest(0);
