import { type Address, type PublicClient, type WalletClient, encodeFunctionData, parseAbi } from "viem";
import { base } from "@account-kit/infra";
import { getRealityEthContract, getRealityEthContractAddress, getRealityEthABI } from "./reality-eth-client";
import { encodeQuestionText, validateQuestionData, type QuestionData } from "./reality-eth-utils";

/**
 * Reality.eth Question Wrapper
 * 
 * Handles question creation and answer submission to Reality.eth contracts
 */

export interface CreateQuestionParams {
  templateId: number;
  questionText: string;
  arbitrator: Address;
  timeout: number; // seconds
  openingTs: number; // unix timestamp
  nonce: bigint;
  bond?: bigint; // Optional bond amount in wei
}

export interface SubmitAnswerParams {
  questionId: string; // bytes32 as hex string
  answer: string; // bytes32 as hex string
  maxPrevious: bigint;
  bond: bigint; // Bond amount in wei
}

/**
 * Create a new question on Reality.eth
 * 
 * @param publicClient - Viem public client
 * @param walletClient - Viem wallet client
 * @param params - Question creation parameters
 * @returns Transaction hash
 */
export async function createQuestion(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: CreateQuestionParams
): Promise<`0x${string}`> {
  const contractAddress = getRealityEthContractAddress();
  const account = walletClient.account?.address;

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const { templateId, questionText, arbitrator, timeout, openingTs, nonce, bond = 0n } = params;

  const abi = getRealityEthABI();
  const data = encodeFunctionData({
    abi,
    functionName: "askQuestion",
    args: [BigInt(templateId), questionText, arbitrator, timeout, openingTs, nonce],
  });

  const hash = await walletClient.sendTransaction({
    chain: walletClient.chain || base,
    to: contractAddress,
    data,
    value: bond,
    account,
  });

  return hash;
}

/**
 * Submit an answer to a Reality.eth question
 * 
 * @param publicClient - Viem public client
 * @param walletClient - Viem wallet client
 * @param params - Answer submission parameters
 * @returns Transaction hash
 */
export async function submitAnswer(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: SubmitAnswerParams
): Promise<`0x${string}`> {
  const contractAddress = getRealityEthContractAddress();
  const account = walletClient.account?.address;

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const { questionId, answer, maxPrevious, bond } = params;

  const abi = getRealityEthABI();
  const data = encodeFunctionData({
    abi,
    functionName: "submitAnswer",
    args: [questionId as `0x${string}`, answer as `0x${string}`, maxPrevious, account],
  });

  const hash = await walletClient.sendTransaction({
    chain: walletClient.chain || base,
    to: contractAddress,
    data,
    value: bond,
    account,
  });

  return hash;
}

/**
 * Question data structure from Reality.eth contract
 */
export interface RealityEthQuestion {
  question: string;
  opening_ts: bigint;
  timeout: bigint;
  finalize_ts?: bigint;
  bounty?: bigint;
  last_bond?: bigint;
  [key: string]: any; // Allow additional properties
}

/**
 * Get question details from Reality.eth contract
 * 
 * @param publicClient - Viem public client
 * @param questionId - Question ID (bytes32 as hex string)
 * @returns Question data
 */
export async function getQuestion(
  publicClient: PublicClient,
  questionId: string
): Promise<RealityEthQuestion> {
  const contract = getRealityEthContract(publicClient);

  try {
    const questionData = await contract.read.questions([questionId as `0x${string}`]);
    // Type assertion: viem may return struct as tuple or object depending on ABI
    return questionData as unknown as RealityEthQuestion;
  } catch (error) {
    console.error("Error fetching question:", error);
    throw new Error("Failed to fetch question from contract");
  }
}

/**
 * Get the final answer for a question
 * 
 * @param publicClient - Viem public client
 * @param questionId - Question ID (bytes32 as hex string)
 * @returns Final answer (bytes32 as hex string)
 */
export async function getFinalAnswer(
  publicClient: PublicClient,
  questionId: string
): Promise<string> {
  const contract = getRealityEthContract(publicClient);

  try {
    const answer = await contract.read.getFinalAnswer([questionId as `0x${string}`]);
    return answer as unknown as string;
  } catch (error) {
    console.error("Error fetching final answer:", error);
    throw new Error("Failed to fetch final answer");
  }
}

/**
 * Create question with encoded text
 * 
 * Helper function that combines question encoding with creation
 */
export async function createQuestionWithData(
  publicClient: PublicClient,
  walletClient: WalletClient,
  questionData: QuestionData,
  params: Omit<CreateQuestionParams, "questionText">
): Promise<`0x${string}`> {
  // Validate question data
  const validation = validateQuestionData(questionData);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Encode question text
  const questionText = encodeQuestionText(questionData);

  // Create question
  return createQuestion(publicClient, walletClient, {
    ...params,
    questionText,
  });
}
