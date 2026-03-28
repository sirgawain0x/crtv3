import { request, gql } from 'graphql-request';
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const GRAPH_URL = "https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/reality-eth/1.0.0/gn";
const QUESTION_ID = "0xd2c92197b49963040cde1b2bcf69606acfa349854bced6dfc2d8e2052a91b021";
const REALITY_CONTRACT = "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8"; // Base Reality.eth v3.0 (from client)

async function main() {
  console.log(`Inspecting question: ${QUESTION_ID}`);

  // 1. Fetch Subgraph Data
  const query = gql`
    query InspectQ($id: String!) {
      logNewQuestions(where: { question_id: $id }) {
        user
      }
      logNewAnswers(where: { question_id: $id }, orderBy: ts, orderDirection: asc) {
        answer
        history_hash
        user
        bond
        is_commitment
      }
    }
  `;

  try {
    const data: any = await request(GRAPH_URL, query, { id: QUESTION_ID });

    console.log("--- SUBGRAPH DATA ---");
    console.log("Answers Found:", data.logNewAnswers.length);
    data.logNewAnswers.forEach((a: any, i: number) => {
      console.log(`Answer #${i}:`);
      console.log(`  Hash (prev): ${a.history_hash}`);
      console.log(`  Ans: ${a.answer}`);
      console.log(`  Bond: ${a.bond}`);
      console.log(`  User: ${a.user}`);
      console.log(`  Commit: ${a.is_commitment}`);
    });

    // 2. Fetch On-Chain Data
    console.log("\n--- ON-CHAIN DATA ---");
    const client = createPublicClient({
      chain: base,
      transport: http("https://mainnet.base.org")
    });

    const abi = parseAbi([
      "function questions(bytes32) view returns (bytes32 content_hash, address arbitrator, uint32 opening_ts, uint32 timeout, uint32 finalize_ts, bool is_pending_arbitration, uint256 bounty, bytes32 best_answer, bytes32 history_hash, uint256 bond, uint256 min_bond)"
    ]);

    const qData = await client.readContract({
      address: REALITY_CONTRACT,
      abi: abi,
      functionName: 'questions',
      args: [QUESTION_ID as `0x${string}`]
    });

    console.log("On-Chain Content Hash:", qData[0]);
    console.log("On-Chain Arbitrator:", qData[1]);
    console.log("On-Chain Opening TS:", qData[2]);
    console.log("On-Chain Timeout:", qData[3]);
    console.log("On-Chain Finalize TS:", qData[4]);
    console.log("On-Chain Is Pending Arb:", qData[5]);
    console.log("On-Chain Bounty:", qData[6]);
    console.log("On-Chain Best Answer:", qData[7]);
    console.log("On-Chain History Hash:", qData[8]);
    console.log("On-Chain Bond:", qData[9]);
    console.log("On-Chain Min Bond:", qData[10]);

  } catch (err) {
    console.error("Error:", err);
  }
}

main();
