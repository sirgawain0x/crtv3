import fetch from 'node-fetch';
import chalk from 'chalk';

const TEST_URL = 'http://localhost:3000/api/auth/test-rate-limit';
const TOTAL_REQUESTS = 15; // We'll make 15 requests to ensure we hit the limit
const DELAY_MS = 200; // Small delay between requests to make output readable

interface ErrorResponse {
  error: string;
}

async function makeRequest(requestNumber: number) {
  try {
    const response = await fetch(TEST_URL);
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    const reset = response.headers.get('x-ratelimit-reset');
    const resetDate = reset
      ? new Date(parseInt(reset)).toLocaleTimeString()
      : 'N/A';

    const status = response.status;
    const color =
      status === 429 ? chalk.red : status === 200 ? chalk.green : chalk.yellow;

    console.log(
      color(
        `Request #${requestNumber.toString().padStart(2, ' ')} - ` +
          `Status: ${status} - ` +
          `Remaining: ${remaining}/${limit} - ` +
          `Reset: ${resetDate}`,
      ),
    );

    if (status === 429) {
      const body = (await response.json()) as ErrorResponse;
      console.log(chalk.red(`Error: ${body.error}`));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        chalk.red(`Failed to make request #${requestNumber}: ${error.message}`),
      );
    } else {
      console.error(
        chalk.red(`Failed to make request #${requestNumber}: Unknown error`),
      );
    }
  }
}

async function runTest() {
  console.log(chalk.blue('\n🚀 Starting rate limit test...\n'));

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    await makeRequest(i);
    if (i < TOTAL_REQUESTS) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(chalk.blue('\n✨ Test completed\n'));
}

// Run the test
runTest();
